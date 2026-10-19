import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function loadModule(
  path: string,
  mocks: Record<string, unknown>,
  globals = {}
) {
  const exports: Record<string, any> = {};
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  runInNewContext(output, {
    exports,
    require: (id: string) => {
      if (id in mocks) return mocks[id];
      throw new Error(`Unexpected import: ${id}`);
    },
    ...globals,
  });
  return exports;
}

test('auth initialization and session reads dedupe per render, never across users', async () => {
  const require = createRequire(import.meta.url);
  // Exercise the real React server cache with an isolated request cache dispatcher.
  const react = require(
    join(dirname(require.resolve('react')), 'react.react-server.js')
  );
  const internals =
    react.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const previousDispatcher = internals.A;
  const scope = new AsyncLocalStorage<{
    userId: string;
    cache: Map<unknown, unknown>;
  }>();
  internals.A = {
    getCacheForType(factory: () => unknown) {
      const request = scope.getStore()!;
      if (!request.cache.has(factory)) request.cache.set(factory, factory());
      return request.cache.get(factory);
    },
  };
  let creations = 0;
  let reads = 0;
  try {
    const auth = loadModule('src/core/auth/index.ts', {
      react,
      'better-auth': {
        betterAuth: () => {
          creations++;
          return {
            api: {
              getSession: async ({ headers }: { headers: Headers }) => {
                reads++;
                await Promise.resolve();
                return { user: { id: headers.get('test-user') } };
              },
            },
          };
        },
      },
      '@/shared/models/config': { getAllConfigs: async () => ({}) },
      './config': { getAuthOptions: async () => ({}) },
    });
    const users = loadModule('src/shared/models/user.ts', {
      react,
      'next/headers': {
        headers: async () =>
          new Headers({ 'test-user': scope.getStore()!.userId }),
      },
      'drizzle-orm': {},
      '@/core/auth': auth,
      '@/core/db': {},
      '@/config/db/schema': {},
      '@/config/website': { websiteConfig: { auth: { enabled: true } } },
      './credit': {},
    });
    await Promise.all(
      ['alice', 'bob'].map((userId) =>
        scope.run({ userId, cache: new Map() }, async () => {
          const [a, b, c] = await Promise.all([
            users.getSignUser(),
            users.getUserInfo(),
            users.getSignUser(),
          ]);
          assert.equal(a, b);
          assert.equal(b, c);
          assert.equal(a.id, userId);
          const [first, second] = await Promise.all([
            auth.getAuth(),
            auth.getAuth(),
          ]);
          assert.equal(first, second);
        })
      )
    );
    assert.equal(reads, 2);
    assert.equal(creations, 2);
    // Outside a server render (e.g. a Route Handler), React must not cache auth.
    internals.A = null;
    assert.notEqual(await auth.getAuth(), await auth.getAuth());
    assert.equal(creations, 4);
  } finally {
    internals.A = previousDispatcher;
  }
});

test('anonymous checks do not retry; failed checks retry once and retain known user state', () => {
  let session: any = { data: null, isPending: false, error: null };
  let user: any = null;
  let retries = 0;
  let refIndex = 0;
  let effects: (() => unknown)[] = [];
  const refs: { current: unknown }[] = [];
  const refetch = async () => {
    retries++;
  };
  const noop = () => {};
  const component = loadModule(
    'src/shared/blocks/sign/sign-user.tsx',
    {
      react: {
        useState: (initial: unknown) => [initial, noop],
        useRef: (initial: unknown) =>
          refs[refIndex++] ?? (refs[refIndex - 1] = { current: initial }),
        useEffect: (effect: () => unknown) => {
          effects.push(effect);
        },
      },
      'react/jsx-runtime': { jsx: noop, jsxs: noop },
      'lucide-react': {},
      'next-intl': { useTranslations: () => noop },
      '@/core/auth/client': { useSession: () => ({ ...session, refetch }) },
      '@/core/i18n/navigation': { useRouter: () => ({}) },
      '@/shared/components/ui/avatar': {},
      '@/shared/components/ui/button': {},
      '@/shared/components/ui/dropdown-menu': {},
      '@/shared/contexts/app': {
        useAppContext: () => ({
          user,
          setUser: (value: unknown) => {
            user = value;
          },
          fetchConfigs: noop,
          setIsCheckSign: noop,
          fetchUserInfo: noop,
        }),
      },
      '@/shared/lib/utils': { cn: noop },
      '../common/smart-icon': {},
      './sign-modal': {},
    },
    { window: { setTimeout: noop, clearTimeout: noop } }
  );
  const render = () => {
    refIndex = 0;
    effects = [];
    component.SignUser({});
    effects.forEach((effect) => effect());
  };
  render();
  render();
  assert.equal(retries, 0);
  user = { id: 'alice', name: 'Alice' };
  session = { ...session, error: { status: 503 } };
  render();
  render();
  assert.equal(retries, 1);
  assert.equal(user.id, 'alice');
  session = { ...session, error: null };
  render();
  assert.equal(user, null);
  session = {
    data: { user: { id: 'bob', name: 'Bob' } },
    isPending: false,
    error: null,
  };
  render();
  assert.equal((user as { id: string } | null)?.id, 'bob');
  assert.equal(retries, 1);
});

test('durable auth still strips obsolete cookie caches and preserves the session token', async () => {
  let forwardedCookie = '';
  const handler = async (request: Request) => {
    forwardedCookie = request.headers.get('cookie') || '';
    return Response.json({ user: { id: 'alice' } });
  };
  const route = loadModule(
    'src/app/api/auth/[...all]/route.ts',
    {
      'better-auth/next-js': {
        toNextJsHandler: () => ({ GET: handler, POST: handler }),
      },
      '@/core/auth': { getAuth: async () => ({ handler }) },
      '@/core/db': { isDatabaseConfigured: () => true },
      '@/config/website': { websiteConfig: { auth: { enabled: true } } },
      '@/shared/lib/env': { isCloudflareWorker: true },
      '@/shared/lib/rate-limit': {},
    },
    { Request, Response, Headers, URL }
  );
  const response = await route.GET(
    new Request('https://spritepixel.com/api/auth/get-session', {
      headers: {
        cookie:
          'better-auth.session_token=test-token; better-auth.session_data=obsolete; better-auth.account_data.0=obsolete; NEXT_LOCALE=ja',
      },
    })
  );
  assert.equal(response.status, 200);
  assert.equal(
    forwardedCookie,
    'better-auth.session_token=test-token; NEXT_LOCALE=ja'
  );
  assert.match(
    response.headers.get('set-cookie') || '',
    /better-auth.session_data=; Max-Age=0/
  );
  assert.match(
    response.headers.get('set-cookie') || '',
    /better-auth.account_data.0=; Max-Age=0/
  );
});
