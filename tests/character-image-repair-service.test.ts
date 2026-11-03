import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { createClient } from '@libsql/client';
import * as orm from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import ts from 'typescript';

import * as schema from '../src/config/db/schema.sqlite';
import { generationDefaults } from '../src/config/generation/options';
import { resolveCharacterStyle } from '../src/config/generation/prompts';
import * as sprite from '../src/config/generation/sprite';
import { imageInfo } from '../src/shared/lib/sprite-tools/image-info';
import * as paths from '../src/shared/lib/storage-paths';

const png = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
    'base64'
  )
).buffer;
async function setup() {
  const temp = mkdtempSync(join(tmpdir(), 'character-repair-'));
  const client = createClient({ url: `file:${join(temp, 'test.db')}` });
  for (const name of readdirSync('src/config/db/migrations_d1')
    .filter((n) => n.endsWith('.sql'))
    .sort())
    await client.executeMultiple(
      readFileSync(`src/config/db/migrations_d1/${name}`, 'utf8').replaceAll(
        '--> statement-breakpoint',
        ''
      )
    );
  const database = drizzle(client);
  const {
    user,
    project,
    assetFile,
    assetItem,
    generation,
    generationTask,
    aiTask,
  } = schema;
  await database
    .insert(user)
    .values({ id: 'owner', name: 'Test', email: 'test@example.test' });
  await database
    .insert(project)
    .values({ id: 'project', userId: 'owner', name: 'Test' });
  await database.insert(generation).values({
    id: 'gen',
    userId: 'owner',
    projectId: 'project',
    taskType: 'character',
    status: 'success',
    paramsJson: JSON.stringify({
      style: 'pixel-art',
      plannedItemId: 'item',
      plannedVariantId: 'variant',
    }),
  });
  await database.insert(aiTask).values({
    id: 'ai',
    userId: 'owner',
    mediaType: 'image',
    provider: 'test',
    model: 'test',
    prompt: 'Test',
    status: 'success',
    taskInfo: JSON.stringify({
      images: [{ imageUrl: 'https://r2.test/grsai/image/original.png' }],
    }),
  });
  await database.insert(generationTask).values({
    id: 'link',
    generationId: 'gen',
    aiTaskId: 'ai',
    role: 'character',
    metadataJson: '{}',
  });
  const events: string[] = [],
    stored = new Set(['grsai/image/original.png']);
  let uploadFails = false,
    deleteFails = false,
    syncFails = false;
  const connection = new Proxy(database, {
    get(target, prop) {
      if (prop === 'update')
        return (table: unknown) => {
          if (syncFails && table === aiTask) throw new Error('SYNC_FAILED');
          return database.update(table as any);
        };
      return Reflect.get(target, prop);
    },
  });
  const storage = {
    getPublicUrl: ({ key }: any) => `https://r2.test/${key}`,
    uploadFile: async ({ key }: any) => {
      events.push(`upload:${key}`);
      if (uploadFails) return { success: false };
      stored.add(key);
      return { success: true };
    },
    deleteFile: async ({ key }: any) => {
      assert.equal(
        (
          await database
            .select()
            .from(assetFile)
            .where(orm.eq(assetFile.storageKey, key))
        ).length,
        0,
        'old key must no longer be active before delete'
      );
      events.push(`delete:${key}`);
      if (deleteFails) throw new Error('storage offline');
      stored.delete(key);
    },
  };
  const mocks: Record<string, any> = {
    'drizzle-orm': orm,
    '@/core/db': { db: () => connection },
    '@/config/db/schema': schema,
    '@/config/generation/prompts': { resolveCharacterStyle },
    '@/shared/lib/hash': { getUuid: () => crypto.randomUUID() },
    '@/shared/lib/sprite-tools/image-info': { imageInfo },
    '@/shared/lib/storage-paths': paths,
    '@/shared/models/project': {
      getOwnedProject: async (id: string) =>
        id === 'owner' ? { id: 'project' } : null,
    },
    '@/shared/models/asset': {
      getOwnedAssetFile: async (owner: string, id: string) =>
        owner === 'owner'
          ? (
              await database
                .select()
                .from(assetFile)
                .where(
                  orm.and(
                    orm.eq(assetFile.id, id),
                    orm.isNull(assetFile.deletedAt)
                  )
                )
            )[0]
          : undefined,
      getProjectItem: async (_project: string, id: string) =>
        (
          await database
            .select()
            .from(assetItem)
            .where(orm.eq(assetItem.id, id))
        )[0],
    },
    '@/shared/services/storage': {
      getStorageService: async () => storage,
      getAssetPublicUrlResolver: async () => (key: string) =>
        `https://r2.test/${key}`,
    },
  };
  const service: Record<string, any> = {};
  const code = ts.transpileModule(
    readFileSync('src/shared/services/character-image-repair.ts', 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText;
  runInNewContext(code, {
    exports: service,
    require: (id: string) => {
      if (!(id in mocks)) throw new Error(id);
      return mocks[id];
    },
    Date,
    Uint8Array,
    AbortSignal,
  });
  mocks['@/shared/services/character-image-repair'] = service;
  mocks['@/config/generation/sprite'] = sprite;
  mocks['@/config/generation'] = { generationDefaults };
  mocks['@/extensions/ai'] = {
    AITaskStatus: {
      SUCCESS: 'success',
      PENDING: 'pending',
      PROCESSING: 'processing',
    },
  };
  mocks['@/shared/models/ai_task'] = {
    findAITaskById: async (id: string) =>
      (await database.select().from(aiTask).where(orm.eq(aiTask.id, id)))[0],
    settleAITaskCredit: async () => events.push('settle'),
  };
  mocks['@/shared/models/asset'].updateCharacterItem = async (
    _project: string,
    id: string,
    values: any
  ) =>
    database
      .update(assetItem)
      .set({ ...values, status: 'active' })
      .where(orm.eq(assetItem.id, id));
  const generationService: Record<string, any> = {};
  runInNewContext(
    ts.transpileModule(
      readFileSync('src/shared/services/asset-generation.ts', 'utf8'),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }
    ).outputText,
    {
      exports: generationService,
      require: (id: string) => mocks[id] || {},
      Date,
      console,
    }
  );
  return {
    service,
    generationService,
    failSync: (value: boolean) => {
      syncFails = value;
    },
    database,
    events,
    stored,
    failUpload: () => {
      uploadFails = true;
    },
    failDelete: (value: boolean) => {
      deleteFails = value;
    },
    close: () => {
      client.close();
      rmSync(temp, { recursive: true, force: true });
    },
  };
}

test('reading never creates a Vault item; repair stages a file and deletes its managed predecessor only after persistence', async () => {
  const t = await setup();
  try {
    const source = await t.service.resolveCharacterImage('owner', {
      generationId: 'gen',
    });
    assert.equal(source.style, 'pixel-art');
    assert.equal((await t.database.select().from(schema.assetFile)).length, 0);
    const saved = await t.service.saveCharacterImageRepair(
      'owner',
      { generationId: 'gen' },
      source.revision,
      png
    );
    assert.equal(saved.cleanupPending, false);
    assert.equal(t.stored.has('grsai/image/original.png'), false);
    const [file] = await t.database.select().from(schema.assetFile);
    assert.equal(file.itemId, null);
    assert.equal(file.storageKey, saved.revision);
    assert.equal((await t.database.select().from(schema.assetItem)).length, 0);
    assert.equal(
      (await t.service.resolveCharacterImage('owner', { generationId: 'gen' }))
        .revision,
      saved.revision
    );
    const second = await t.service.saveCharacterImageRepair(
      'owner',
      { fileId: saved.fileId },
      saved.revision,
      png
    );
    assert.equal(second.fileId, saved.fileId);
    assert.equal(t.stored.has(saved.revision), false);
    assert.equal((await t.database.select().from(schema.assetFile)).length, 1);
  } finally {
    t.close();
  }
});
test('rejects another owner, non-pixel style, stale revisions, invalid PNG and concurrent saves', async () => {
  const t = await setup();
  try {
    await assert.rejects(
      t.service.saveCharacterImageRepair(
        'other',
        { generationId: 'gen' },
        'provider:ai',
        png
      ),
      /IMAGE_NOT_FOUND/
    );
    await assert.rejects(
      t.service.saveCharacterImageRepair(
        'owner',
        { generationId: 'gen' },
        'stale',
        png
      ),
      /IMAGE_CHANGED/
    );
    await assert.rejects(
      t.service.saveCharacterImageRepair(
        'owner',
        { generationId: 'gen' },
        'provider:ai',
        new ArrayBuffer(4)
      ),
      /INVALID_IMAGE/
    );
    await t.database.update(schema.generation).set({
      paramsJson: '{"style":"none","project":{"artStyle":"pixel-art"}}',
    });
    await assert.rejects(
      t.service.saveCharacterImageRepair(
        'owner',
        { generationId: 'gen' },
        'provider:ai',
        png
      ),
      /PIXEL_STYLE_REQUIRED/
    );
    await t.database.update(schema.generation).set({
      paramsJson: '{"project":{"artStyle":"none"}}',
    });
    await assert.rejects(
      t.service.saveCharacterImageRepair(
        'owner',
        { generationId: 'gen' },
        'provider:ai',
        png
      ),
      /PIXEL_STYLE_REQUIRED/
    );
    await t.database
      .update(schema.generation)
      .set({ paramsJson: '{"style":"pixel-art"}' });
    await t.service.withCharacterImageLock('link', async () => {
      await assert.rejects(
        t.service.saveCharacterImageRepair(
          'owner',
          { generationId: 'gen' },
          'provider:ai',
          png
        ),
        /IMAGE_BUSY/
      );
    });
    assert.equal(t.events.length, 0);
    assert.equal(
      (await t.database.select().from(schema.generationTask))[0].metadataJson,
      '{}'
    );
  } finally {
    t.close();
  }
});
test('upload failure leaves the old image intact and releases the lock', async () => {
  const t = await setup();
  try {
    t.failUpload();
    await assert.rejects(
      t.service.saveCharacterImageRepair(
        'owner',
        { generationId: 'gen' },
        'provider:ai',
        png
      ),
      /IMAGE_SAVE_FAILED/
    );
    assert.equal(t.stored.has('grsai/image/original.png'), true);
    assert.equal((await t.database.select().from(schema.assetFile)).length, 0);
    assert.equal(
      (await t.database.select().from(schema.generationTask))[0].metadataJson,
      '{}'
    );
  } finally {
    t.close();
  }
});
test('cleanup failure is durable and retry does not upload again', async () => {
  const t = await setup();
  try {
    t.failDelete(true);
    const saved = await t.service.saveCharacterImageRepair(
      'owner',
      { generationId: 'gen' },
      'provider:ai',
      png
    );
    assert.equal(saved.cleanupPending, true);
    assert.equal(t.stored.has(saved.revision), true);
    const [file] = await t.database.select().from(schema.assetFile);
    assert.deepEqual(JSON.parse(file.metadataJson).pixelRepairCleanup, [
      'grsai/image/original.png',
    ]);
    t.failDelete(false);
    const retried = await t.service.saveCharacterImageRepair(
      'owner',
      { fileId: saved.fileId },
      saved.revision
    );
    assert.equal(retried.cleanupPending, false);
    assert.equal(t.events.filter((e) => e.startsWith('upload:')).length, 1);
    assert.equal(t.stored.has('grsai/image/original.png'), false);
  } finally {
    t.close();
  }
});

test('normal Save Character attaches the repaired file without reuploading the deleted provider image', async () => {
  const t = await setup();
  try {
    const repaired = await t.service.saveCharacterImageRepair(
      'owner',
      { generationId: 'gen' },
      'provider:ai',
      png
    );
    const result = await t.generationService.saveGeneratedCharacter(
      'owner',
      'project',
      'gen',
      'My character'
    );
    assert.equal(result.itemId, 'item');
    assert.equal(result.items[0].file.id, repaired.fileId);
    assert.equal(result.items[0].file.storageKey, repaired.revision);
    assert.equal(t.events.filter((e) => e.startsWith('upload:')).length, 1);
    assert.equal(
      (await t.database.select().from(schema.assetItem))[0].name,
      'My character'
    );
    assert.equal(t.events.includes('settle'), true);
  } finally {
    t.close();
  }
});

test('a failed secondary database update cannot delete the newly published image; cleanup can resume', async () => {
  const t = await setup();
  try {
    t.failSync(true);
    const result = await t.service.saveCharacterImageRepair(
      'owner',
      { generationId: 'gen' },
      'provider:ai',
      png
    );
    assert.equal(result.cleanupPending, true);
    assert.equal(t.stored.has(result.revision), true);
    assert.equal(t.stored.has('grsai/image/original.png'), true);
    assert.equal(
      JSON.parse(
        (await t.database.select().from(schema.assetFile))[0].metadataJson
      ).pixelRepairSyncPending,
      true
    );
    t.failSync(false);
    const retried = await t.service.saveCharacterImageRepair(
      'owner',
      { generationId: 'gen' },
      result.revision
    );
    assert.equal(retried.cleanupPending, false);
    assert.equal(t.stored.has(result.revision), true);
    assert.equal(t.stored.has('grsai/image/original.png'), false);
  } finally {
    t.close();
  }
});
