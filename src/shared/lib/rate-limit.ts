import { md5 } from '@/shared/lib/hash';

type MinIntervalOptions = {
  /**
   * Minimum interval between requests for the same key.
   */
  intervalMs: number;
  /**
   * Optional namespace to avoid key collisions across endpoints.
   */
  keyPrefix?: string;
  /**
   * Extra key material if you want to scope more granularly.
   */
  extraKey?: string;
};

type SlidingWindowOptions = {
  /**
   * Sliding window length in milliseconds.
   */
  windowMs: number;
  /**
   * Max allowed requests inside the window for the same key.
   */
  maxRequests: number;
  keyPrefix?: string;
  extraKey?: string;
};

type MinIntervalStore = Map<string, number>;
type SlidingWindowStore = Map<string, number[]>;

declare global {
  // eslint-disable-next-line no-var
  var __minIntervalRateLimitStore: MinIntervalStore | undefined;
  // eslint-disable-next-line no-var
  var __slidingWindowRateLimitStore: SlidingWindowStore | undefined;
}

function getClientIpFromRequest(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    // x-forwarded-for can be "client, proxy1, proxy2"
    return xff.split(',')[0]?.trim() || '';
  }

  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    ''
  );
}

function getMinIntervalStore(): MinIntervalStore {
  if (!globalThis.__minIntervalRateLimitStore) {
    globalThis.__minIntervalRateLimitStore = new Map();
  }
  return globalThis.__minIntervalRateLimitStore;
}

function getSlidingWindowStore(): SlidingWindowStore {
  if (!globalThis.__slidingWindowRateLimitStore) {
    globalThis.__slidingWindowRateLimitStore = new Map();
  }
  return globalThis.__slidingWindowRateLimitStore;
}

function buildKey(
  request: Request,
  opts: { keyPrefix?: string; extraKey?: string }
): string {
  const url = new URL(request.url);
  const ip = getClientIpFromRequest(request);
  const cookie = request.headers.get('cookie') || '';
  const cookieHash = cookie ? md5(cookie) : 'no-cookie';
  const prefix = opts.keyPrefix || 'rate-limit';
  const extra = opts.extraKey ? `|${opts.extraKey}` : '';
  return `${prefix}|${request.method}|${url.pathname}|${ip}|${cookieHash}${extra}`;
}

function tooManyRequestsResponse(retryAfterSeconds: number): Response {
  return Response.json(
    {
      error: 'too_many_requests',
      message: `Please retry after ${retryAfterSeconds}s.`,
    },
    {
      status: 429,
      headers: {
        'cache-control': 'no-store',
        'retry-after': String(retryAfterSeconds),
      },
    }
  );
}

/**
 * Enforce a minimum interval for the same endpoint + identity.
 *
 * Returns a 429 Response when the request is too frequent, otherwise null.
 */
export function enforceMinIntervalRateLimit(
  request: Request,
  opts: MinIntervalOptions
): Response | null {
  const intervalMs = Math.max(0, Number(opts.intervalMs) || 0);
  if (!intervalMs) return null;

  const now = Date.now();
  const store = getMinIntervalStore();
  const key = buildKey(request, opts);
  const last = store.get(key);

  if (typeof last === 'number') {
    const delta = now - last;
    if (delta >= 0 && delta < intervalMs) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((intervalMs - delta) / 1000)
      );
      return tooManyRequestsResponse(retryAfterSeconds);
    }
  }

  store.set(key, now);
  return null;
}

/**
 * Allow bursts inside a sliding window (better for read endpoints like get-session
 * that multiple React hooks may hit on mount).
 *
 * Returns a 429 Response when the window quota is exceeded, otherwise null.
 */
export function enforceSlidingWindowRateLimit(
  request: Request,
  opts: SlidingWindowOptions
): Response | null {
  const windowMs = Math.max(0, Number(opts.windowMs) || 0);
  const maxRequests = Math.max(0, Number(opts.maxRequests) || 0);
  if (!windowMs || !maxRequests) return null;

  const now = Date.now();
  const store = getSlidingWindowStore();
  const key = buildKey(request, opts);
  const cutoff = now - windowMs;
  const recent = (store.get(key) || []).filter((ts) => ts > cutoff);

  if (recent.length >= maxRequests) {
    const oldest = recent[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000)
    );
    store.set(key, recent);
    return tooManyRequestsResponse(retryAfterSeconds);
  }

  recent.push(now);
  store.set(key, recent);
  return null;
}
