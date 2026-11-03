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
import * as generationOptions from '../src/config/generation/options';
import * as sprite from '../src/config/generation/sprite';
import * as frames from '../src/shared/lib/animation-frames';
import * as review from '../src/shared/lib/animation-review';
import { storeAnimationSourceVideo } from '../src/shared/services/animation-source-video';

// Real service + real temporary SQLite. Only external model, storage and processor adapters are stubbed.
async function setup() {
  const temp = mkdtempSync(join(tmpdir(), 'sprite-review-test-'));
  const client = createClient({ url: `file:${join(temp, 'test.db')}` });
  for (const name of readdirSync('src/config/db/migrations_d1')
    .filter((n) => n.endsWith('.sql'))
    .sort()) {
    await client.executeMultiple(
      readFileSync(`src/config/db/migrations_d1/${name}`, 'utf8').replaceAll(
        '--> statement-breakpoint',
        ''
      )
    );
  }
  const database = drizzle(client);
  const {
    user,
    project,
    assetItem,
    generation,
    generationTask,
    aiTask,
    assetFile,
  } = schema;
  await database
    .insert(user)
    .values({ id: 'owner', name: 'Test', email: 'test@example.test' });
  await database
    .insert(project)
    .values({ id: 'project', userId: 'owner', name: 'Test' });
  await database.insert(assetItem).values({
    id: 'item',
    projectId: 'project',
    type: 'character',
    name: 'Test',
  });
  await database.insert(generation).values({
    id: 'generation',
    userId: 'owner',
    projectId: 'project',
    itemId: 'item',
    taskType: 'animation',
    paramsJson: JSON.stringify({ animationReview: true, action: 'idle' }),
    status: 'processing',
  });
  await database.insert(aiTask).values({
    id: 'ai',
    userId: 'owner',
    mediaType: 'video',
    provider: 'test',
    model: 'test',
    prompt: 'test',
    status: 'success',
    taskId: 'provider-task',
    taskInfo: JSON.stringify({
      videos: [{ videoUrl: 'https://provider.test/video.mp4' }],
    }),
    createdAt: new Date('2026-11-01T00:00:00Z'),
  });
  await database.insert(generationTask).values({
    id: 'link',
    generationId: 'generation',
    aiTaskId: 'ai',
    role: 'animation:none',
    metadataJson: JSON.stringify({
      setId: 'set',
      clipId: 'clip',
      direction: 'none',
    }),
  });
  const events: string[] = [];
  const processingInputs: any[] = [];
  const stored = new Set<string>();
  let failProcessing = false;
  let failDeleting = false;
  const storage = {
    name: 'r2',
    deleteFile: async ({ key }: any) => {
      events.push(`delete:${key}`);
      if (failDeleting) throw new Error('DELETE_FAILED');
      stored.delete(key);
    },
    exists: async ({ key }: any) => stored.has(key),
    downloadAndUpload: async ({ key }: any) => {
      events.push('archive');
      stored.add(key);
      return { success: true };
    },
    createSignedDownloadUrl: async ({ key }: any) => `https://r2.test/${key}`,
  };
  const findTask = async (id: string) =>
    (await database.select().from(aiTask).where(orm.eq(aiTask.id, id)))[0];
  const mocks: Record<string, unknown> = {
    'drizzle-orm': orm,
    '@/core/db': { db: () => database },
    '@/config/db/schema': schema,
    '@/config/generation/sprite': sprite,
    '@/config/generation/options': generationOptions,
    '@/extensions/ai': {
      AITaskStatus: {
        SUCCESS: 'success',
        FAILED: 'failed',
        CANCELED: 'canceled',
        PENDING: 'pending',
        PROCESSING: 'processing',
      },
      AIMediaType: { VIDEO: 'video', IMAGE: 'image' },
    },
    '@/shared/lib/animation-frames': frames,
    '@/shared/lib/animation-review': review,
    '@/shared/lib/hash': { getUuid: () => crypto.randomUUID() },
    '@/shared/models/project': {
      getOwnedProject: async (owner: string) =>
        owner === 'owner' ? { id: 'project' } : null,
    },
    '@/shared/models/ai_task': {
      findAITaskById: findTask,
      settleAITaskCredit: async () => events.push('settle'),
      updateAITaskById: async (id: string, values: any) =>
        (
          await database
            .update(aiTask)
            .set(values)
            .where(orm.eq(aiTask.id, id))
            .returning()
        )[0],
    },
    '@/shared/models/asset': {
      findAssetFileById: async (id: string) =>
        (
          await database
            .select()
            .from(assetFile)
            .where(orm.eq(assetFile.id, id))
        )[0],
    },
    '@/shared/services/storage': {
      getStorageService: async () => ({
        ...storage,
        getProvider: () => storage,
      }),
      getAssetPublicUrlResolver: async () => (key: string) =>
        `https://r2.test/${key}`,
    },
    '@/shared/services/animation-source-video': { storeAnimationSourceVideo },
    '@/config/generation/animation-video': {
      usesAnimationTestVideo: () => true,
    },
    '@/shared/services/ai': {
      getAIService: async () => {
        throw new Error('UNEXPECTED_MODEL_CALL');
      },
    },
    '@/shared/services/sprite-media-processor': {
      processSpriteVideo: async (input: any) => {
        processingInputs.push(input);
        events.push('extract');
        if (failProcessing) throw new Error('PROCESSING_FAILED');
        return {
          processing_version: 3,
          quality_warnings: [{ frame: 2, code: 'interior_holes' }],
          frame_count: input.frameCount,
          frame_size: input.frameSize,
          columns: 4,
          rows: Math.ceil(input.frameCount / 4),
          fps: input.fps,
          spritesheet: {
            key: `${input.outputPrefix}/${input.generationTaskId}.png`,
            width: input.frameSize * 4,
            height: input.frameSize * Math.ceil(input.frameCount / 4),
            file_size_bytes: 100,
          },
          manifest: {
            key: `${input.outputPrefix}/${input.generationTaskId}.json`,
          },
          ...(input.strictFrames
            ? { source_frame_count: 72, source_duration: 3 }
            : {}),
        };
      },
    },
  };
  const exports: Record<string, any> = {};
  const source = ts.transpileModule(
    readFileSync('src/shared/services/asset-generation.ts', 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText;
  runInNewContext(source, {
    exports,
    require: (id: string) => mocks[id] || {},
    console,
    Date,
    URL,
    crypto,
  });
  return {
    service: exports,
    database,
    client,
    events,
    processingInputs,
    close: () => {
      client.close();
      rmSync(temp, { recursive: true, force: true });
    },
    failDeleting: (value: boolean) => {
      failDeleting = value;
    },
    failProcessing: () => {
      failProcessing = true;
    },
  };
}

test('video completion pauses before R2/processing; user steps persist, reextract freely, and save selected frames idempotently', async () => {
  const env = await setup();
  const { service, database, events } = env;
  try {
    const advanced =
      await service.advanceSpriteGenerationWorkflow('generation');
    assert.equal(advanced.terminal, true);
    assert.deepEqual(events, ['settle']);
    const ready = await service.getSpriteGeneration('owner', 'generation');
    assert.equal(ready.items[0].phase, 'video_ready');
    assert.equal(ready.items[0].video.saved, false);
    await assert.rejects(
      service.reviewSpriteAnimation('other', 'generation', {
        action: 'save-video',
        taskId: 'link',
      }),
      /GENERATION_NOT_FOUND/
    );
    const extract = {
      action: 'extract',
      taskId: 'link',
      requestId: crypto.randomUUID(),
      frameCount: 8,
      frameSize: 128,
      fps: 12,
      loop: true,
    };
    await assert.rejects(
      service.reviewSpriteAnimation('owner', 'generation', extract),
      /VIDEO_SAVE_REQUIRED/
    );
    await service.reviewSpriteAnimation('owner', 'generation', {
      action: 'save-video',
      taskId: 'link',
    });
    await service.reviewSpriteAnimation('owner', 'generation', {
      action: 'save-video',
      taskId: 'link',
    });
    assert.equal(events.filter((x) => x === 'archive').length, 1);
    const draft = await service.reviewSpriteAnimation(
      'owner',
      'generation',
      extract
    );
    assert.equal(draft.items[0].extraction.frame_count, 8);
    assert.equal(
      (await database.select().from(schema.animationVersion)).length,
      0
    );
    const save = {
      action: 'save-sheet',
      taskId: 'link',
      extractionId: extract.requestId,
      selected: [0, 3, 7],
      fps: 10,
    };
    await service.reviewSpriteAnimation('owner', 'generation', save);
    await service.reviewSpriteAnimation('owner', 'generation', save);
    const versions = await database.select().from(schema.animationVersion);
    assert.equal(versions.length, 1);
    assert.equal(versions[0].frameCount, 3);
    assert.equal(versions[0].fps, 10);
    const original = versions[0].framesJson;
    const next = await service.reviewSpriteAnimation('owner', 'generation', {
      ...extract,
      requestId: crypto.randomUUID(),
      frameCount: 12,
    });
    assert.equal(next.items[0].extraction.frame_count, 12);
    assert.equal(
      (await database.select().from(schema.animationVersion))[0].framesJson,
      original
    );
    const latest = await service.reviewSpriteAnimation('owner', 'generation', {
      ...save,
      extractionId: next.items[0].extraction.id,
      selected: [1, 4, 11],
    });
    assert.equal(latest.items[0].editorVersionId, next.items[0].extraction.id);
    assert.equal(latest.items[0].file.id, next.items[0].extraction.id);
    assert.equal(
      (await database.select().from(schema.animationVersion)).length,
      2
    );
    assert.equal(events.filter((x) => x === 'settle').length, 1);
    env.failProcessing();
    await assert.rejects(
      service.reviewSpriteAnimation('owner', 'generation', {
        ...extract,
        requestId: crypto.randomUUID(),
      }),
      /PROCESSING_FAILED/
    );
    const restored = await service.getSpriteGeneration('owner', 'generation');
    assert.equal(restored.items[0].extraction.id, next.items[0].extraction.id);
    assert.equal(restored.items[0].video.saved, true);
    assert.equal(restored.items[0].status, 'success');
  } finally {
    env.close();
  }
});

test('workflow failure after video delivery preserves success and never triggers a refund update', async () => {
  const env = await setup();
  try {
    await env.service.advanceSpriteGenerationWorkflow('generation');
    const [before] = await env.database.select().from(schema.aiTask);
    await env.service.failSpriteGenerationWorkflow(
      'generation',
      'WORKFLOW_FAILED',
      'A later workflow step failed'
    );
    const [after] = await env.database.select().from(schema.aiTask);
    assert.equal(after.status, 'success');
    assert.equal(after.taskInfo, before.taskInfo);
    const [logical] = await env.database.select().from(schema.generation);
    assert.equal(logical.status, 'success');
    assert.equal(logical.failureCode, null);
    assert.deepEqual(env.events, ['settle']);
  } finally {
    env.close();
  }
});

test('an active review lock blocks duplicate processing across requests', async () => {
  const env = await setup();
  try {
    const [link] = await env.database.select().from(schema.generationTask);
    await env.database.update(schema.generationTask).set({
      metadataJson: JSON.stringify({
        ...JSON.parse(link.metadataJson),
        reviewLockUntil: Date.now() + 60000,
      }),
    });
    await assert.rejects(
      env.service.reviewSpriteAnimation('owner', 'generation', {
        action: 'save-video',
        taskId: 'link',
      }),
      /ANIMATION_REVIEW_BUSY/
    );
    assert.equal(env.events.length, 0);
  } finally {
    env.close();
  }
});

test('test video replaces only provider dispatch and still settles through the workflow', async () => {
  const env = await setup();
  try {
    await env.database.update(schema.aiTask).set({
      status: 'pending',
      taskId: null,
      options: JSON.stringify({
        testVideoUrl: 'http://localhost:8787/videos/demo.mp4',
      }),
      taskInfo: null,
    });
    const result =
      await env.service.advanceSpriteGenerationWorkflow('generation');
    assert.equal(result.terminal, true);
    assert.deepEqual(env.events, ['settle']);
    const current = await env.service.getSpriteGeneration(
      'owner',
      'generation'
    );
    assert.equal(current.items[0].video.test, true);
    assert.equal(current.items[0].video.saved, false);
    assert.equal(
      current.items[0].video.url,
      'http://localhost:8787/videos/demo.mp4'
    );
  } finally {
    env.close();
  }
});

test('homepage generates and saves immediately, then replaces atomically and cleans old objects without charging', async () => {
  const env = await setup();
  try {
    const input = {
      action: 'generate-sheet',
      taskId: 'link',
      requestId: crypto.randomUUID(),
      frameCount: 48,
      frameSize: 128,
      fps: 12,
      loop: true,
      sourceDuration: 2,
    };
    await assert.rejects(
      env.service.reviewSpriteAnimation('owner', 'generation', {
        ...input,
        frameCount: 49,
      }),
      /ANIMATION_FRAME_LIMIT/
    );
    assert.equal(env.events.length, 0);
    const first = await env.service.reviewSpriteAnimation(
      'owner',
      'generation',
      input
    );
    const sheet = first.items[0].heroSheet;
    assert.equal(sheet.frame_count, 48);
    assert.equal(first.items[0].editorVersionId, sheet.versionId);
    assert.equal(
      (await env.database.select().from(schema.animationVersion)).length,
      1
    );
    await env.service.reviewSpriteAnimation('owner', 'generation', input);
    assert.deepEqual(env.events, ['archive', 'extract']);
    const nextInput = {
      ...input,
      requestId: crypto.randomUUID(),
      replaceVersionId: sheet.versionId,
      frameCount: 72,
      sourceDuration: 3,
      fps: 24,
    };
    const next = await env.service.reviewSpriteAnimation(
      'owner',
      'generation',
      nextInput
    );
    const updated = next.items[0].heroSheet;
    assert.equal(updated.versionId, sheet.versionId);
    assert.notEqual(updated.fileId, sheet.fileId);
    assert.equal(updated.frame_count, 72);
    assert.equal(next.items[0].file.id, updated.fileId);
    const versions = await env.database.select().from(schema.animationVersion);
    assert.equal(versions.length, 1);
    assert.equal(versions[0].fps, 24);
    assert.equal(versions[0].spritesheetFileId, updated.fileId);
    assert.equal(versions[0].frameCount, 72);
    assert.equal(JSON.parse(versions[0].framesJson).length, 72);
    const old = (await env.database.select().from(schema.assetFile)).find(
      (file) => file.id === sheet.fileId
    );
    assert.ok(old?.deletedAt);
    assert.ok(env.events.includes(`delete:${sheet.spritesheet.key}`));
    assert.ok(env.events.includes(`delete:${sheet.manifest.key}`));
    assert.equal(env.events.filter((x) => x === 'settle').length, 0);
    env.failProcessing();
    await assert.rejects(
      env.service.reviewSpriteAnimation('owner', 'generation', {
        ...nextInput,
        requestId: crypto.randomUUID(),
      }),
      /PROCESSING_FAILED/
    );
    const restored = await env.service.getSpriteGeneration(
      'owner',
      'generation'
    );
    assert.equal(restored.items[0].heroSheet.fileId, updated.fileId);
  } finally {
    env.close();
  }
});

test('homepage cleanup failure keeps the new saved sheet and retries deletion without extraction', async () => {
  const env = await setup();
  try {
    const input = {
      action: 'generate-sheet',
      taskId: 'link',
      requestId: crypto.randomUUID(),
      frameCount: 16,
      frameSize: 128,
      fps: 12,
      loop: true,
      sourceDuration: 2,
    };
    const first = await env.service.reviewSpriteAnimation(
      'owner',
      'generation',
      input
    );
    env.failDeleting(true);
    const replacement = {
      ...input,
      requestId: crypto.randomUUID(),
      replaceVersionId: first.items[0].heroSheet.versionId,
    };
    const next = await env.service.reviewSpriteAnimation(
      'owner',
      'generation',
      replacement
    );
    assert.equal(next.items[0].heroSheet.cleanupPending, true);
    env.failDeleting(false);
    const retry = await env.service.reviewSpriteAnimation(
      'owner',
      'generation',
      replacement
    );
    assert.equal(retry.items[0].heroSheet.cleanupPending, false);
    assert.equal(env.events.filter((x) => x === 'extract').length, 2);
    assert.equal(
      (await env.database.select().from(schema.animationVersion)).length,
      1
    );
  } finally {
    env.close();
  }
});

test('homepage rejects stale replacement and protects sheets used by edited versions', async () => {
  const env = await setup();
  try {
    const input = {
      action: 'generate-sheet',
      taskId: 'link',
      requestId: crypto.randomUUID(),
      frameCount: 16,
      frameSize: 128,
      fps: 12,
      loop: true,
      sourceDuration: 2,
    };
    const first = await env.service.reviewSpriteAnimation(
      'owner',
      'generation',
      input
    );
    const sheet = first.items[0].heroSheet;
    await assert.rejects(
      env.service.reviewSpriteAnimation('owner', 'generation', {
        ...input,
        requestId: crypto.randomUUID(),
      }),
      /EXTRACTION_CHANGED/
    );
    const [original] = await env.database
      .select()
      .from(schema.animationVersion);
    await env.database.insert(schema.animationVersion).values({
      ...original,
      id: crypto.randomUUID(),
      versionNo: 2,
      isCurrent: false,
    });
    await assert.rejects(
      env.service.reviewSpriteAnimation('owner', 'generation', {
        ...input,
        requestId: crypto.randomUUID(),
        replaceVersionId: sheet.versionId,
      }),
      /ANIMATION_REPLACEMENT_IN_USE/
    );
    assert.deepEqual(env.events, ['archive', 'extract']);
  } finally {
    env.close();
  }
});

test('saved background and pixel settings survive re-extraction and quality flags reach the homepage', async () => {
  const env = await setup();
  try {
    await env.database.update(schema.generation).set({
      paramsJson: JSON.stringify({
        animationReview: true,
        action: 'idle',
        compositionFileId: 'composition',
        backgroundColor: '#ff00ff',
        backgroundKeySafe: true,
        style: 'pixel-art',
      }),
    });
    const input = {
      action: 'generate-sheet',
      taskId: 'link',
      requestId: crypto.randomUUID(),
      frameCount: 24,
      frameSize: 128,
      fps: 12,
      loop: true,
      sourceDuration: 2,
    };
    const first = await env.service.reviewSpriteAnimation(
      'owner',
      'generation',
      input
    );
    const sheet = first.items[0].heroSheet;
    assert.equal(sheet.quality_warnings[0].frame, 2);
    await env.service.reviewSpriteAnimation('owner', 'generation', {
      ...input,
      requestId: crypto.randomUUID(),
      replaceVersionId: sheet.versionId,
      frameCount: 16,
    });
    assert.equal(env.processingInputs.length, 2);
    for (const params of env.processingInputs) {
      assert.equal(params.backgroundColor, '#ff00ff');
      assert.equal(params.backgroundKeySafe, true);
      assert.equal(params.pixelArt, true);
      assert.equal(params.preserveCanvas, true);
    }
  } finally {
    env.close();
  }
});

test('homepage extraction applies character style before project style', async () => {
  const cases = [
    { style: 'cartoon', project: 'pixel-art', expected: false },
    { style: 'pixel-art', project: 'cartoon', expected: true },
    { style: 'none', project: 'pixel-art', expected: true },
    { style: undefined, project: 'cartoon', expected: false },
    { style: undefined, project: 'none', expected: undefined },
    { style: undefined, project: 'pixel_art', expected: undefined },
  ];
  for (const entry of cases) {
    const env = await setup();
    try {
      await env.database.update(schema.generation).set({
        paramsJson: JSON.stringify({
          animationReview: true,
          style: entry.style,
          project: { artStyle: entry.project },
        }),
      });
      await env.service.reviewSpriteAnimation('owner', 'generation', {
        action: 'generate-sheet',
        taskId: 'link',
        requestId: crypto.randomUUID(),
        frameCount: 16,
        frameSize: 128,
        fps: 12,
        loop: true,
        sourceDuration: 2,
      });
      assert.equal(env.processingInputs[0].pixelArt, entry.expected);
    } finally {
      env.close();
    }
  }
});
