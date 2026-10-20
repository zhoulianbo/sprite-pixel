type Route = { page: string; regex: string };
type RoutingManifest = {
  basePath: string;
  staticRoutes: Route[];
  dynamicRoutes: Route[];
  redirects: { regex: string; internal?: boolean }[];
  rewrites: { regex: string }[] | Record<string, { regex: string }[]>;
};
type AppPathRoutesManifest = Record<string, string>;
type PrerenderManifest = {
  routes: Record<string, { srcRoute?: string | null }>;
  dynamicRoutes: Record<string, { fallback: unknown }>;
};

function compileAppRoute(route: string): RegExp {
  const segments = route.split('/').filter(Boolean);
  let pattern = '^';

  for (const segment of segments) {
    if (/^\[\[\.\.\.[^\]]+\]\]$/.test(segment)) {
      pattern += '(?:/(.+?))?';
    } else if (/^\[\.\.\.[^\]]+\]$/.test(segment)) {
      pattern += '/(.+?)';
    } else if (/^\[[^\]]+\]$/.test(segment)) {
      pattern += '/([^/]+?)';
    } else {
      pattern += `/${segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`;
    }
  }

  return new RegExp(`${pattern || '^/'}\\/?$`);
}

/** Compile the actual Next build's routes once per isolate, not per request.
 * This is routing only: authentication and record existence remain in Next.
 */
export function createRouteMatcher(
  routes: RoutingManifest,
  appPathRoutes: AppPathRoutesManifest,
  prerender: PrerenderManifest,
  locales: readonly string[],
  defaultLocale: string
) {
  const direct: RegExp[] = [];
  const localized: RegExp[] = [];
  const staticParams = new Set<string>();
  const closedRoutes = new Set(
    Object.entries(prerender.dynamicRoutes)
      .filter(([, route]) => route.fallback === false)
      .map(([page]) => page)
  );
  for (const [pathname, route] of Object.entries(prerender.routes)) {
    if (route.srcRoute && closedRoutes.has(route.srcRoute)) {
      staticParams.add(pathname);
      staticParams.add(decodeURIComponent(pathname));
    }
  }
  for (const route of [...routes.staticRoutes, ...routes.dynamicRoutes]) {
    // A dynamicParams=false catch-all must not allow arbitrary URLs through.
    if (closedRoutes.has(route.page) || route.page === '/_not-found') continue;
    const target = route.page.startsWith('/[locale]') ? localized : direct;
    target.push(new RegExp(route.regex));
  }
  for (const page of new Set(Object.values(appPathRoutes))) {
    if (closedRoutes.has(page) || page === '/_not-found') continue;
    const target = page.startsWith('/[locale]') ? localized : direct;
    target.push(compileAppRoute(page));
  }
  const rewrites = Array.isArray(routes.rewrites)
    ? routes.rewrites
    : Object.values(routes.rewrites).flat();
  // Next's internal trailing-slash redirect matches every URL; it is not a route.
  const customRoutes = [
    ...routes.redirects.filter((route) => !route.internal),
    ...rewrites,
  ].map((route) => new RegExp(route.regex));
  const localeSet = new Set(locales);

  const matchesPath = (pathname: string): boolean => {
    // Match the path Next will normalize, while forwarding the original request.
    pathname = pathname.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
    if (customRoutes.some((route) => route.test(pathname))) return true;
    if (routes.basePath) {
      if (
        !pathname.startsWith(`${routes.basePath}/`) &&
        pathname !== routes.basePath
      )
        return false;
      pathname = pathname.slice(routes.basePath.length) || '/';
    }
    pathname = pathname.replace(/\/$/, '') || '/';
    if (pathname === '/_next/image' || pathname.startsWith('/cdn-cgi/image/'))
      return true;
    if (direct.some((route) => route.test(pathname))) return true;

    // next-intl accepts both explicit locales and the unprefixed default locale.
    const locale = pathname.split('/')[1];
    const localizedPath = localeSet.has(locale)
      ? pathname
      : `/${defaultLocale}${pathname === '/' ? '' : pathname}`;
    return (
      staticParams.has(pathname) ||
      staticParams.has(localizedPath) ||
      localized.some((route) => route.test(localizedPath))
    );
  };

  return (pathname: string): boolean => {
    try {
      // Keep encoded separators usable inside dynamic IDs; also accept encoded
      // static names/locales and Unicode paths, as Next does.
      const decoded = decodeURIComponent(pathname);
      return (
        matchesPath(pathname) || (decoded !== pathname && matchesPath(decoded))
      );
    } catch {
      return false;
    }
  };
}

type AssetEnv = { ASSETS: { fetch(request: Request): Promise<Response> } };

/** Static Assets normally serves existing files before this Worker is invoked.
 * Ask the asset binding for unmatched paths too, so new public files, _next
 * chunks, HTML aliases and asset redirects never need a second allowlist.
 */
export async function unmatchedRouteResponse(request: Request, env: AssetEnv) {
  if (request.method === 'GET' || request.method === 'HEAD') {
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;
  }
  return new Response(request.method === 'HEAD' ? null : 'Not Found', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // A later deployment can add this route; do not retain a negative entry.
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
