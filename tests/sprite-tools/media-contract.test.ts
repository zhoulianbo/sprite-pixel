import assert from 'node:assert/strict';
import { test } from 'node:test';
import { unzipSync } from 'fflate';

import { zipFiles } from '../../src/shared/lib/sprite-tools/browser';
import { processSpriteVideo } from '../../src/shared/services/sprite-media-processor';

test('video processor forwards all controls, uses signed requests and omits project ownership fields', async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.SPRITE_MEDIA_PROCESSOR_URL;
  const originalSecret = process.env.SPRITE_MEDIA_PROCESSOR_SECRET;
  process.env.SPRITE_MEDIA_PROCESSOR_URL = 'https://processor.example.test';
  process.env.SPRITE_MEDIA_PROCESSOR_SECRET = 'test-only-secret';
  let sent: Record<string, unknown> | undefined;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://processor.example.test/api/sprite/process');
    assert.equal(init?.method, 'POST');
    assert.match(
      new Headers(init?.headers).get('X-Signature') || '',
      /^[a-f0-9]{64}$/
    );
    sent = JSON.parse(String(init?.body));
    return Response.json({
      success: true,
      data: { frame_count: 7, frame_size: 128, fps: 24 },
    });
  };
  try {
    await processSpriteVideo({
      generationId: 'upload-id',
      generationTaskId: 'parameters-hash',
      sourceVideoUrl: 'https://storage.example.test/signed',
      outputPrefix: 'uploads/2026-10',
      frameCount: 7,
      frameSize: 128,
      fps: 24,
      loop: true,
      action: 'idle',
      direction: 'none',
    });
    assert.deepEqual(sent, {
      generation_id: 'upload-id',
      generation_task_id: 'parameters-hash',
      source_video_url: 'https://storage.example.test/signed',
      output_prefix: 'uploads/2026-10',
      frame_count: 7,
      frame_size: 128,
      fps: 24,
      loop: true,
      action: 'idle',
      direction: 'none',
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined)
      delete process.env.SPRITE_MEDIA_PROCESSOR_URL;
    else process.env.SPRITE_MEDIA_PROCESSOR_URL = originalUrl;
    if (originalSecret === undefined)
      delete process.env.SPRITE_MEDIA_PROCESSOR_SECRET;
    else process.env.SPRITE_MEDIA_PROCESSOR_SECRET = originalSecret;
  }
});

test('PNG sequence ZIP keeps every frame and rejects a cancelled export', async () => {
  const entries = Array.from({ length: 3 }, (_, i) => ({
    name: `frame-${i}.png`,
    blob: new Blob([new Uint8Array([137, 80, 78, 71, i])]),
  }));
  const result = await zipFiles(
    entries,
    new AbortController().signal,
    () => {}
  );
  const files = unzipSync(new Uint8Array(await result.arrayBuffer()));
  assert.deepEqual(
    Object.keys(files),
    entries.map((entry) => entry.name)
  );
  for (let i = 0; i < 3; i++) assert.equal(files[`frame-${i}.png`][4], i);
  const cancelled = new AbortController();
  cancelled.abort();
  await assert.rejects(
    zipFiles(entries, cancelled.signal, () => {}),
    { name: 'AbortError' }
  );
});
