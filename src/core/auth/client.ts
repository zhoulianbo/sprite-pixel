import { oneTapClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

import { websiteConfig } from '@/config/website';

type ThrottleState = {
  inFlight: Map<string, Promise<Response>>;
  lastStartedAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __authGetSessionThrottle: ThrottleState | undefined;
}

function getThrottleState(): ThrottleState {
  if (!globalThis.__authGetSessionThrottle) {
    globalThis.__authGetSessionThrottle = {
      inFlight: new Map(),
      lastStartedAt: 0,
    };
  }
  return globalThis.__authGetSessionThrottle;
}

function createGetSessionThrottledFetch({
  minIntervalMs,
}: {
  minIntervalMs: number;
}): typeof fetch {
  const state = getThrottleState();

  function isGetSessionRequest(input: RequestInfo | URL, init?: RequestInit) {
    const method =
      (
        init?.method ?? (input instanceof Request ? input.method : 'GET')
      )?.toUpperCase?.() ?? 'GET';

    if (method !== 'GET') return false;

    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    const base =
      typeof window !== 'undefined' ? window.location.origin : 'http://local';
    const url = new URL(rawUrl, base);
    return url.pathname.endsWith('/get-session');
  }

  function getDedupeKey(input: RequestInfo | URL) {
    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    const base =
      typeof window !== 'undefined' ? window.location.origin : 'http://local';
    const url = new URL(rawUrl, base);
    // Drop query/hash: session endpoint should be safe to dedupe across params.
    return `GET ${url.origin}${url.pathname}`;
  }

  return async (input, init) => {
    const isSessionRequest = isGetSessionRequest(input, init);

    if (!websiteConfig.auth.enabled && isSessionRequest) {
      return Response.json(null);
    }

    if (!minIntervalMs || !isSessionRequest) {
      return fetch(input, init);
    }

    const key = getDedupeKey(input);
    const existing = state.inFlight.get(key);
    if (existing) return existing;

    const promise = (async () => {
      // Recheck after sleep so concurrent waiters don't stampede together.
      for (;;) {
        const waitMs = Math.max(
          0,
          state.lastStartedAt + minIntervalMs - Date.now()
        );
        if (waitMs <= 0) break;
        await new Promise((r) => setTimeout(r, waitMs));
      }

      state.lastStartedAt = Date.now();
      const response = await fetch(input, init);

      // Soft-retry once on 429 so a brief burst doesn't break session UI.
      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('retry-after');
        const retryAfterSeconds = Number(retryAfterHeader);
        const retryMs = Number.isFinite(retryAfterSeconds)
          ? Math.max(250, retryAfterSeconds * 1000)
          : minIntervalMs;
        await new Promise((r) => setTimeout(r, retryMs));
        state.lastStartedAt = Date.now();
        return fetch(input, init);
      }

      return response;
    })().finally(() => {
      state.inFlight.delete(key);
    });

    state.inFlight.set(key, promise);
    return promise;
  };
}

// Client-side throttle to avoid get-session request storms in browser.
// Note: must be NEXT_PUBLIC_* to be inlined into client bundles.
const AUTH_GET_SESSION_MIN_INTERVAL_MS =
  Number(process.env.NEXT_PUBLIC_AUTH_GET_SESSION_MIN_INTERVAL_MS) || 1000;

const sharedGetSessionFetch = createGetSessionThrottledFetch({
  minIntervalMs: AUTH_GET_SESSION_MIN_INTERVAL_MS,
});

// create default auth client, without plugins
// Auth routes are served by this Next.js app. Let Better Auth use the current
// origin so local fallback ports and deployed preview URLs cannot drift from
// NEXT_PUBLIC_APP_URL.
export const authClient = createAuthClient({
  fetchOptions: {
    // Avoid amplifying request storms (e.g. during env/db switching in dev).
    // IMPORTANT: auth mutations (sign-in/sign-up) must be non-retriable,
    // otherwise we may send verification emails multiple times.
    retry: 0,
    customFetchImpl: sharedGetSessionFetch,
  },
});

// export default auth client methods
export const { useSession, signIn, signUp, signOut } = authClient;

// get auth client with plugins
export function getAuthClient(configs: Record<string, string>) {
  const authClient = createAuthClient({
    plugins: getAuthPlugins(configs),
    fetchOptions: {
      // Avoid amplifying request storms (e.g. during env/db switching in dev).
      // IMPORTANT: auth mutations (sign-in/sign-up) must be non-retriable,
      // otherwise we may send verification emails multiple times.
      retry: 0,
      customFetchImpl: sharedGetSessionFetch,
    },
  });

  return authClient;
}

// get auth plugins with configs
function getAuthPlugins(configs: Record<string, string>) {
  const authPlugins = [];

  // google one tap plugin
  if (configs.google_client_id && configs.google_one_tap_enabled === 'true') {
    authPlugins.push(
      oneTapClient({
        clientId: configs.google_client_id,
        // Optional client configuration:
        autoSelect: false,
        cancelOnTapOutside: false,
        context: 'signin',
        additionalOptions: {
          // Any extra options for the Google initialize method
        },
        // Configure prompt behavior and exponential backoff:
        promptOptions: {
          baseDelay: 1000, // Base delay in ms (default: 1000)
          maxAttempts: 1, // Only attempt once to avoid multiple error logs (default: 5)
        },
      })
    );
  }

  return authPlugins;
}
