import { toNextJsHandler } from 'better-auth/next-js';

import { getAuth } from '@/core/auth';
import { isDatabaseConfigured } from '@/core/db';
import { websiteConfig } from '@/config/website';
import { isCloudflareWorker } from '@/shared/lib/env';
import { enforceSlidingWindowRateLimit } from '@/shared/lib/rate-limit';

// Leftover from better-auth's DB-less cookieCache mode (auto-enabled when
// database was previously unavailable). Parsing these with the wrong strategy
// throws and surfaces as FAILED_TO_GET_SESSION 500.
const STALE_AUTH_COOKIE_PREFIXES = [
  'better-auth.session_data',
  'better-auth.account_data',
];

function maybeRateLimitGetSession(request: Request): Response | null {
  const url = new URL(request.url);
  // better-auth session endpoint is served under this catch-all route.
  if (isCloudflareWorker || !url.pathname.endsWith('/api/auth/get-session')) {
    return null;
  }

  // get-session is a read endpoint called by multiple React hooks on mount.
  // Use a burst-friendly sliding window instead of a hard min-interval.
  const windowMs =
    Number(process.env.AUTH_GET_SESSION_WINDOW_MS) || 10_000;
  const maxRequests =
    Number(process.env.AUTH_GET_SESSION_MAX_REQUESTS) || 30;

  return enforceSlidingWindowRateLimit(request, {
    windowMs,
    maxRequests,
    keyPrefix: 'auth-get-session',
  });
}

function isStaleAuthCookieName(name: string) {
  return STALE_AUTH_COOKIE_PREFIXES.some(
    (prefix) => name === prefix || name.startsWith(`${prefix}.`)
  );
}

/**
 * Drop stale cookie-cache cookies from the request and collect names to expire
 * on the response, so browsers stop sending them.
 */
function stripStaleAuthCookies(request: Request): {
  request: Request;
  staleNames: string[];
} {
  // Only strip when we have a durable DB (cookieCache disabled). In DB-less
  // mode these cookies are the session store and must be preserved.
  if (!isDatabaseConfigured()) {
    return { request, staleNames: [] };
  }

  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return { request, staleNames: [] };
  }

  const staleNames: string[] = [];
  const kept: string[] = [];

  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    const name = eq === -1 ? trimmed : trimmed.slice(0, eq);
    if (isStaleAuthCookieName(name)) {
      staleNames.push(name);
      continue;
    }
    kept.push(trimmed);
  }

  if (staleNames.length === 0) {
    return { request, staleNames: [] };
  }

  const headers = new Headers(request.headers);
  if (kept.length > 0) {
    headers.set('cookie', kept.join('; '));
  } else {
    headers.delete('cookie');
  }

  return {
    request: new Request(request, { headers }),
    staleNames,
  };
}

function withExpiredStaleCookies(
  response: Response,
  staleNames: string[]
): Response {
  if (staleNames.length === 0) return response;

  const headers = new Headers(response.headers);
  for (const name of staleNames) {
    headers.append(
      'set-cookie',
      `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`
    );
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function handleAuth(
  request: Request,
  method: 'GET' | 'POST'
): Promise<Response> {
  if (!websiteConfig.auth.enabled) {
    return Response.json(
      { error: 'Authentication is disabled' },
      { status: 404 }
    );
  }

  const limited = maybeRateLimitGetSession(request);
  if (limited) {
    return limited;
  }

  const { request: cleanedRequest, staleNames } =
    stripStaleAuthCookies(request);

  const auth = await getAuth();
  const handler = toNextJsHandler(auth.handler);
  const response =
    method === 'GET'
      ? await handler.GET(cleanedRequest)
      : await handler.POST(cleanedRequest);

  return withExpiredStaleCookies(response, staleNames);
}

export async function POST(request: Request) {
  return handleAuth(request, 'POST');
}

export async function GET(request: Request) {
  return handleAuth(request, 'GET');
}
