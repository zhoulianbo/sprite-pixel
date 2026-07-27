import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import createIntlMiddleware from 'next-intl/middleware';

import { routing } from '@/core/i18n/config';
import { websiteConfig } from '@/config/website';
import { FOOTER_LINK_CACHE_TAG } from '@/shared/lib/footer_link_cache';

const intlMiddleware = createIntlMiddleware(routing);

const AUTH_REQUIRED_PATH_PREFIXES = [
  '/admin',
  '/settings',
  '/activity',
  '/dashboard',
];

const NON_CACHEABLE_PATH_PREFIXES = [
  ...AUTH_REQUIRED_PATH_PREFIXES,
  '/chat',
  '/plans',
  '/history',
  '/products',
  '/auth',
  '/verify-email',
  '/no-permission',
];

function matchesPathPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function setPrivateNoStoreHeaders(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('CDN-Cache-Control', 'no-store');
  response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/.well-known' || pathname.startsWith('/.well-known/')) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  // Handle internationalization first
  const intlResponse = intlMiddleware(request);

  // Extract locale from pathname
  const locale = pathname.split('/')[1];
  const isValidLocale = routing.locales.includes(locale as any);
  const pathWithoutLocale = isValidLocale
    ? pathname.slice(locale.length + 1)
    : pathname;
  const isProtectedPath = AUTH_REQUIRED_PATH_PREFIXES.some((prefix) =>
    matchesPathPrefix(pathWithoutLocale, prefix)
  );
  const isAuthPath =
    pathWithoutLocale.startsWith('/sign-') ||
    matchesPathPrefix(pathWithoutLocale, '/auth') ||
    matchesPathPrefix(pathWithoutLocale, '/verify-email');
  const isNonCacheablePath =
    isAuthPath ||
    NON_CACHEABLE_PATH_PREFIXES.some((prefix) =>
      matchesPathPrefix(pathWithoutLocale, prefix)
    );
  const isReactServerComponentRequest =
    request.headers.get('rsc') === '1' ||
    request.headers.get('accept')?.includes('text/x-component');

  if (!websiteConfig.auth.enabled && (isProtectedPath || isAuthPath)) {
    const homeUrl = new URL(isValidLocale ? `/${locale}` : '/', request.url);
    return setPrivateNoStoreHeaders(NextResponse.redirect(homeUrl));
  }

  // Only check authentication for admin routes
  if (isProtectedPath) {
    // Check if session cookie exists
    const sessionCookie = getSessionCookie(request);

    // If no session token found, redirect to sign-in
    if (!sessionCookie) {
      const signInUrl = new URL(
        isValidLocale ? `/${locale}/sign-in` : '/sign-in',
        request.url
      );
      // Add the current path (including search params) as callback - use relative path for multi-language support
      const callbackPath = pathWithoutLocale + request.nextUrl.search;
      signInUrl.searchParams.set('callbackUrl', callbackPath);
      return setPrivateNoStoreHeaders(NextResponse.redirect(signInUrl));
    }

    // For admin routes, we need to check RBAC permissions
    // Note: Full permission check happens in the page/API route level
    // This is a lightweight session check to prevent unauthorized access
    // The detailed permission check (admin.access and specific permissions)
    // will be done in the layout or individual pages using requirePermission()
  }

  intlResponse.headers.set('x-pathname', request.nextUrl.pathname);
  intlResponse.headers.set('x-url', request.url);

  // Remove Set-Cookie from public pages to allow caching
  if (!isNonCacheablePath && !isReactServerComponentRequest) {
    intlResponse.headers.delete('Set-Cookie');

    // Cache-Control header for public pages
    const cacheControl = 'public, s-maxage=3600, stale-while-revalidate=14400';

    intlResponse.headers.set('Cache-Control', cacheControl);
    intlResponse.headers.set('CDN-Cache-Control', cacheControl);
    intlResponse.headers.set('Cloudflare-CDN-Cache-Control', cacheControl);
    intlResponse.headers.set('Cache-Tag', FOOTER_LINK_CACHE_TAG);
  } else {
    setPrivateNoStoreHeaders(intlResponse);
  }

  // For all other routes (including /, /sign-in, /sign-up, /sign-out), just return the intl response
  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)', '/.well-known/:path*'],
};
