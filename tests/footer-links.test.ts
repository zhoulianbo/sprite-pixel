import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function loadModule(
  path: string,
  mocks: Record<string, unknown> = {},
  globals = {}
) {
  const exports: Record<string, any> = {};
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  runInNewContext(output, {
    exports,
    require: (id: string) => {
      if (id in mocks) return mocks[id];
      throw new Error(`Unexpected import: ${id}`);
    },
    console: { warn() {} },
    URL,
    process: { env: {} },
    ...globals,
  });
  return exports;
}

const html = loadModule('src/shared/lib/footer_link_html.ts');
const row = {
  id: 'directory',
  group: 'friend',
  title: 'Directory <&>',
  url: 'https://directory.example/',
  image_url: null,
  alt_text: null,
  locale: 'all',
  rel: '',
  status: 'published',
  sort: 10,
};

test('verification links are real, escaped English HTML; other locales and drafts stay hidden', () => {
  const rows = [
    row,
    { ...row, id: 'draft', status: 'draft' },
    { ...row, id: 'unsafe', url: 'javascript:alert(1)' },
    {
      ...row,
      id: 'badge',
      group: 'badge',
      image_url: 'https://directory.example/badge.png',
      alt_text: 'Badge "text"',
    },
  ];
  const rendered = html.renderFooterLinkHtml(rows, 'en');
  assert.match(rendered.friendHtml, /href="https:\/\/directory.example\/"/);
  assert.match(rendered.friendHtml, /Directory &lt;&amp;&gt;/);
  assert.doesNotMatch(rendered.friendHtml, /draft|unsafe|nofollow/);
  assert.match(rendered.badgeHtml, /<a .*><img .*alt="Badge &quot;text&quot;"/);
  for (const locale of ['zh', 'zh-Hant', 'ja', 'ko']) {
    const result = html.renderFooterLinkHtml(rows, locale);
    assert.equal(result.friendHtml + result.badgeHtml, '');
  }
});

test('form ignores submitted locale/status and still validates unsafe links and missing badge images', () => {
  const form = loadModule('src/shared/services/footer_link_form.ts', {
    '@/shared/lib/footer_link_html': html,
    '@/shared/models/footer_link': {
      FooterLinkGroup: { FRIEND: 'friend', BADGE: 'badge' },
      FooterLinkStatus: { PUBLISHED: 'published' },
    },
  });
  const data = new FormData();
  for (const [key, value] of Object.entries({
    group: 'friend',
    title: 'Directory',
    url: row.url,
    sort: '10',
    locale: 'zh',
    status: 'draft',
  }))
    data.set(key, value);
  const parsed = form.parseFooterLinkFormData(data);
  assert.equal(parsed.locale, 'en');
  assert.equal(parsed.status, 'published');
  assert.ok(
    form
      .getFooterLinkFormFields((key: string) => key)
      .every((field: any) => !['locale', 'status'].includes(field.name))
  );
  data.set('url', 'javascript:alert(1)');
  assert.throws(() => form.parseFooterLinkFormData(data), /HTTP or HTTPS/);
  data.set('url', row.url);
  data.set('group', 'badge');
  assert.throws(
    () => form.parseFooterLinkFormData(data),
    /image URL is required/
  );
});

function createHarness() {
  const events: string[] = [];
  const stored = new Map<string, string>();
  let records: any[] = [];
  let failWrite = false;
  const cache = loadModule('src/shared/lib/footer_link_cache.ts', {
    '@opennextjs/cloudflare': {
      getCloudflareContext: () => ({
        ctx: {
          cache: {
            purge: async ({ tags }: any) => {
              assert.equal(tags.join(','), 'footer-links');
              events.push('cdn');
              return { success: true };
            },
          },
        },
      }),
    },
    '@/shared/lib/config-kv': {
      CONFIG_KV_TTL_SECONDS: 86400,
      isConfigKvEnabled: () => true,
      getConfigKvNamespace: () => ({
        get: async (key: string) => {
          events.push('kv:get');
          return stored.has(key) ? JSON.parse(stored.get(key)!) : null;
        },
        put: async (key: string, value: string) => {
          events.push('kv:put');
          if (failWrite) throw new Error('KV unavailable');
          stored.set(key, value);
        },
        delete: async (key: string) => {
          events.push('kv:delete');
          stored.delete(key);
        },
      }),
    },
  });
  const database = {
    select: () => ({
      from: () => ({
        where: (condition: any) => ({
          orderBy: async () => {
            events.push('db:read');
            return records.filter(
              (record) => record[condition.field] === condition.value
            );
          },
        }),
      }),
    }),
    insert: () => ({
      values: (value: any) => ({
        returning: async () => {
          events.push('db:insert');
          records.push(value);
          return [value];
        },
      }),
    }),
    update: () => ({
      set: (value: any) => ({
        where: (condition: any) => ({
          returning: async () => {
            events.push('db:update');
            const record = records.find(
              (item) => item[condition.field] === condition.value
            );
            if (!record) return [];
            Object.assign(record, value);
            return [record];
          },
        }),
      }),
    }),
    delete: () => ({
      where: (condition: any) => ({
        returning: async () => {
          events.push('db:delete');
          const deleted = records.filter(
            (item) => item[condition.field] === condition.value
          );
          records = records.filter(
            (item) => item[condition.field] !== condition.value
          );
          return deleted;
        },
      }),
    }),
  };
  const model = loadModule('src/shared/models/footer_link.ts', {
    'next/cache': {
      revalidatePath: (path: string, type: string) => {
        assert.equal(path, '/');
        assert.equal(type, 'layout');
        events.push('pages:invalidate');
      },
    },
    'drizzle-orm': {
      eq: (field: string, value: string) => ({ field, value }),
      asc: (field: string) => field,
      and() {},
      count() {},
    },
    '@/core/db': { db: () => database, isDatabaseConfigured: () => true },
    '@/config/db/schema': {
      footerLink: {
        id: 'id',
        status: 'status',
        group: 'group',
        sort: 'sort',
        title: 'title',
      },
    },
    '@/shared/lib/footer_link_cache': cache,
  });
  return {
    cache,
    model,
    events,
    stored,
    failWrites: () => {
      failWrite = true;
    },
  };
}

const newLink = { ...row, imageUrl: null, altText: null };

test('add/edit/delete publish KV before invalidating R2-backed pages and CDN; hits avoid D1', async () => {
  const h = createHarness();
  assert.match(h.cache.FOOTER_LINK_CACHE_KEY, /^config:/);
  const created = await h.model.addFooterLink(newLink);
  assert.equal(created.cacheSynced, true);
  assert.deepEqual(h.events, [
    'db:insert',
    'db:read',
    'kv:put',
    'pages:invalidate',
    'cdn',
  ]);
  h.events.length = 0;
  const cached = await h.model.getPublishedFooterLinks();
  assert.equal(cached[0].locale, 'en');
  assert.deepEqual(h.events, ['kv:get']);
  await h.model.updateFooterLink(row.id, { title: 'Updated' });
  assert.equal((await h.model.getPublishedFooterLinks())[0].title, 'Updated');
  await h.model.deleteFooterLink(row.id);
  h.events.length = 0;
  assert.equal((await h.model.getPublishedFooterLinks()).length, 0);
  assert.deepEqual(h.events, ['kv:get']);
  assert.equal(h.stored.get(h.cache.FOOTER_LINK_CACHE_KEY), '[]');
});

test('KV miss/corruption recover from D1; a failed mutation cache write clears stale data and still invalidates pages', async () => {
  const h = createHarness();
  await h.model.addFooterLink(newLink);
  h.stored.set(h.cache.FOOTER_LINK_CACHE_KEY, '{}');
  h.events.length = 0;
  assert.equal((await h.model.getPublishedFooterLinks()).length, 1);
  assert.deepEqual(h.events, ['kv:get', 'db:read', 'kv:put']);
  h.failWrites();
  h.events.length = 0;
  const result = await h.model.deleteFooterLink(row.id);
  assert.equal(result.deleted, true);
  assert.equal(result.cacheSynced, false);
  assert.equal(h.stored.has(h.cache.FOOTER_LINK_CACHE_KEY), false);
  assert.deepEqual(h.events, [
    'db:delete',
    'db:read',
    'kv:put',
    'kv:delete',
    'pages:invalidate',
    'cdn',
  ]);
  assert.equal((await h.model.getPublishedFooterLinks()).length, 0);
});

test('mutation actions enforce write permission before touching the database', async () => {
  let writes = 0;
  const actions = loadModule(
    'src/app/[locale]/(admin)/admin/footer-links/actions.ts',
    {
      'next-intl/server': { getTranslations: async () => (key: string) => key },
      '@/core/rbac': {
        PERMISSIONS: { SETTINGS_WRITE: 'settings.write' },
        requirePermission: async ({ code }: any) => {
          assert.equal(code, 'settings.write');
          throw new Error('Forbidden');
        },
      },
      '@/shared/lib/hash': { getUuid: () => 'new' },
      '@/shared/models/footer_link': {
        addFooterLink: () => {
          writes++;
        },
        deleteFooterLink: () => {
          writes++;
        },
        updateFooterLink: () => {
          writes++;
        },
      },
      '@/shared/services/footer_link_form': {
        parseFooterLinkFormData: () => ({}),
      },
    }
  );
  await assert.rejects(
    actions.addFooterLinkAction(new FormData()),
    /Forbidden/
  );
  await assert.rejects(
    actions.deleteFooterLinkAction('directory'),
    /Forbidden/
  );
  await assert.rejects(
    actions.updateFooterLinkAction('directory', new FormData()),
    /Forbidden/
  );
  assert.equal(writes, 0);
});
