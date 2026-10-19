import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

import {
  createRouteMatcher,
  unmatchedRouteResponse,
} from '../src/shared/lib/worker-request-guard';

const origin = 'https://spritepixel.com';
const locales = ['en', 'zh', 'zh-Hant', 'ja', 'ko'];
const routes = JSON.parse(readFileSync('.next/routes-manifest.json', 'utf8'));
const prerender = JSON.parse(
  readFileSync('.next/prerender-manifest.json', 'utf8')
);
const matches = createRouteMatcher(routes, prerender, locales, 'en');

test('arbitrary unknown paths are rejected, including locales, extensions and APIs', () => {
  for (const path of [
    '/credentials.json',
    '/random-new-scan',
    '/wp-admin/install.php',
    '/.git/config',
    '/.env',
    '/api/nonexistent',
    '/_next/missing.js',
    '/gallery/extra/path',
    '/zh/random-new-scan',
    '/en/unknown/deep/path',
    '/xx/pricing',
    '/%invalid',
    '/.well-known/unknown',
  ])
    assert.equal(matches(path), false, path);
});

test('localized pages, persisted content params and dynamic IDs match without querying data', () => {
  for (const locale of ['', ...locales]) {
    const prefix = locale ? `/${locale}` : '';
    for (const path of [
      '',
      '/gallery',
      '/pricing',
      '/privacy-policy',
      '/terms-of-service',
      '/blog/new-article',
      '/dashboard/projects/new-id',
      '/docs/new/nested/page',
    ]) {
      assert.equal(
        matches(`${prefix}${path}` || '/'),
        true,
        `${prefix}${path}`
      );
    }
  }
  for (const path of [
    '/api/gallery/new-id/preview',
    '/api/gallery/a%2Fb/preview',
    '/api/gallery/任意作品/download',
    '/api/gallery/another-id/like',
    '/api/auth/get-session',
    '/api/auth/callback/google',
    '/api/internal/workflows/generations/new-id/advance',
    '/ads.txt',
    '/_next/image',
    '/zh/gallery/',
    '/%7Ah/gallery',
  ])
    assert.equal(matches(path), true, path);
});

test('every actual build route and static parameter remains reachable', () => {
  for (const route of [...routes.staticRoutes, ...routes.dynamicRoutes]) {
    if (
      route.page === '/_not-found' ||
      prerender.dynamicRoutes[route.page]?.fallback === false
    )
      continue;
    const path = route.page
      .replace('[locale]', 'zh')
      .replace(/\[\[\.\.\.[^\]]+\]\]/g, 'nested/example')
      .replace(/\[\.\.\.[^\]]+\]/g, 'nested/example')
      .replace(/\[[^\]]+\]/g, 'example');
    assert.equal(matches(path), true, route.page);
  }
  for (const path of Object.keys(prerender.routes)) {
    if (path !== '/_not-found') assert.equal(matches(path), true, path);
  }
});

test('future routes, gallery details, static params and rewrites are picked up from build manifests', () => {
  const updated = structuredClone(routes);
  updated.staticRoutes.push({ page: '/new-tool', regex: '^/new-tool/?$' });
  updated.dynamicRoutes.push({
    page: '/[locale]/gallery/[slug]',
    regex: '^/([^/]+?)/gallery/([^/]+?)/?$',
  });
  updated.redirects.push({ regex: '^/old-tool/?$' });
  updated.rewrites.beforeFiles.push({ regex: '^/feed\\.xml$' });
  const updatedPrerender = structuredClone(prerender);
  updatedPrerender.routes['/en/new-content'] = {
    srcRoute: '/[locale]/[...slug]',
  };
  updatedPrerender.routes['/en/%E6%96%B0%E5%86%85%E5%AE%B9'] = {
    srcRoute: '/[locale]/[...slug]',
  };
  const matchNew = createRouteMatcher(updated, updatedPrerender, locales, 'en');
  for (const path of [
    '/new-tool',
    '/gallery/any-new-id',
    '/zh/gallery/任意作品',
    '/new-content',
    '/新内容',
    '/%E6%96%B0%E5%86%85%E5%AE%B9',
    '/old-tool',
    '/feed.xml',
  ])
    assert.equal(matchNew(path), true, path);
  assert.equal(matchNew('/still-unknown'), false);
  assert.equal(matchNew('/zh/still-unknown/'), false);
});

test('unknown GET/HEAD/POST paths return 404; actual assets and asset redirects survive', async () => {
  let assetCalls = 0;
  const env = {
    ASSETS: {
      fetch: async (request: Request) => {
        assetCalls++;
        const path = new URL(request.url).pathname;
        if (path === '/future-image.avif') return new Response('image');
        if (path === '/.well-known/security.txt')
          return new Response('contact');
        if (path === '/manual')
          return new Response(null, {
            status: 307,
            headers: { Location: '/manual/' },
          });
        return new Response('asset missing', { status: 404 });
      },
    },
  };
  for (const method of ['GET', 'HEAD', 'POST']) {
    const response = await unmatchedRouteResponse(
      new Request(`${origin}/unknown?probe=1`, { method }),
      env
    );
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(await response.text(), method === 'HEAD' ? '' : 'Not Found');
  }
  assert.equal(assetCalls, 2);
  for (const [path, status] of [
    ['/future-image.avif', 200],
    ['/.well-known/security.txt', 200],
    ['/manual', 307],
  ] as const) {
    assert.equal(
      (await unmatchedRouteResponse(new Request(origin + path), env)).status,
      status
    );
  }
});

test('Worker exits before OpenNext for scans and forwards known requests unchanged', async () => {
  const calls: unknown[][] = [];
  const openNext = {
    fetch: (...args: unknown[]) => {
      calls.push(args);
      // Missing records keep the framework's native 404 response.
      return new Response('native response', { status: 404 });
    },
  };
  const output = ts.transpileModule(readFileSync('worker.ts', 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const exports: Record<string, any> = {};
  runInNewContext(output, {
    exports,
    URL,
    require: (id: string) => {
      if (id === 'cloudflare:workers') return { WorkflowEntrypoint: class {} };
      if (id === './.open-next/worker.js') return openNext;
      if (id === './.next/routes-manifest.json') return routes;
      if (id === './.next/prerender-manifest.json') return prerender;
      if (id === './src/config/locale') return { locales, defaultLocale: 'en' };
      if (id === './src/shared/lib/worker-request-guard')
        return { createRouteMatcher, unmatchedRouteResponse };
      throw new Error(`Unexpected import: ${id}`);
    },
  });
  const env = {
    ASSETS: { fetch: async () => new Response(null, { status: 404 }) },
  };
  const ctx = {};
  for (let i = 0; i < 500; i++) {
    const response = await exports.default.fetch(
      new Request(`${origin}/random-scan-${i}.json?x=${i}`),
      env,
      ctx
    );
    assert.equal(response.status, 404);
  }
  assert.equal(calls.length, 0);
  for (const path of [
    '/gallery?sort=new&page=2',
    '/api/gallery/new-id/preview',
    '/blog/missing-record?_rsc=test',
  ]) {
    const request = new Request(origin + path);
    const response = await exports.default.fetch(request, env, ctx);
    assert.equal(await response.text(), 'native response');
    assert.equal(calls.at(-1)?.[0], request);
    assert.equal(calls.at(-1)?.[1], env);
    assert.equal(calls.at(-1)?.[2], ctx);
  }
  assert.equal(calls.length, 3);
});
