import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { R2Provider } from '../src/extensions/storage/r2';
import { storeAnimationSourceVideo } from '../src/shared/services/animation-source-video';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function storage() {
  return new R2Provider({
    accountId: 'test-account',
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
    bucket: 'sprite-test',
    uploadPath: 'uploads',
    publicDomain: 'https://media.example.test',
  });
}

test('original video is uploaded to the root videos/month path and signed for processing', async () => {
  const input = {
    taskId: 'task-1',
    createdAt: new Date('2026-11-01T00:00:00Z'),
    sourceUrl: 'https://provider.example.test/video.mp4',
  };
  const provider = storage();
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    calls.push(`${request.method} ${new URL(request.url).pathname}`);
    if (request.method === 'HEAD') return new Response(null, { status: 404 });
    if (request.method === 'GET')
      return new Response(new Uint8Array([1, 2, 3]));
    assert.equal(request.method, 'PUT');
    assert.equal(request.headers.get('content-type'), 'video/mp4');
    assert.equal(request.headers.get('content-disposition'), 'inline');
    assert.deepEqual(
      new Uint8Array(await request.arrayBuffer()),
      new Uint8Array([1, 2, 3])
    );
    return new Response(null, { status: 200 });
  };
  const result = await storeAnimationSourceVideo(input, provider);
  assert.equal(result.key, 'videos/2026-11/task-1.mp4');
  assert.deepEqual(calls, [
    'HEAD /sprite-test/videos/2026-11/task-1.mp4',
    'GET /video.mp4',
    'PUT /sprite-test/videos/2026-11/task-1.mp4',
  ]);
  assert.equal(
    provider.getPublicUrl({ key: result.key }),
    'https://media.example.test/videos/2026-11/task-1.mp4'
  );
  const signed = new URL(result.downloadUrl);
  assert.equal(signed.pathname, '/sprite-test/videos/2026-11/task-1.mp4');
  assert.ok(signed.searchParams.get('X-Amz-Signature'));
});

test('repeated processing recovers an uploaded object without the provider URL', async () => {
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    assert.equal(request.method, 'HEAD');
    return new Response(null, { status: 200 });
  };
  const result = await storeAnimationSourceVideo(
    {
      taskId: 'task-1',
      createdAt: new Date('2026-10-31T23:00:00Z'),
      sourceUrl: 'https://provider.example.test/expired.mp4',
    },
    storage()
  );
  assert.equal(result.key, 'videos/2026-10/task-1.mp4');
});

test('media retry in a later month reuses the original archived key', async () => {
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    assert.equal(request.method, 'HEAD');
    assert.equal(
      new URL(request.url).pathname,
      '/sprite-test/videos/2026-10/original.mp4'
    );
    return new Response(null, { status: 200 });
  };
  const result = await storeAnimationSourceVideo(
    {
      taskId: 'retry-task',
      createdAt: new Date('2026-11-01T00:00:00Z'),
      sourceUrl: 'https://provider.example.test/expired.mp4',
      storedKey: 'videos/2026-10/original.mp4',
    },
    storage()
  );
  assert.equal(result.key, 'videos/2026-10/original.mp4');
});

test('failed uploads cannot be reported as archived videos', async () => {
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    if (request.method === 'HEAD') return new Response(null, { status: 404 });
    if (request.method === 'GET') return new Response(new Uint8Array([1]));
    return new Response(null, { status: 403 });
  };
  await assert.rejects(
    storeAnimationSourceVideo(
      {
        taskId: 'task-1',
        createdAt: new Date('2026-11-01T00:00:00Z'),
        sourceUrl: 'https://provider.example.test/video.mp4',
      },
      storage()
    ),
    /VIDEO_R2_STORAGE_FAILED/
  );
});
