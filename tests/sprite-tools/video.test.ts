import assert from 'node:assert/strict';
import { test } from 'node:test';

import { VIDEO_DEFAULTS, VIDEO_LIMIT } from '../../src/config/tools/free-tools';
import {
  signVideoCredential,
  verifyVideoCredential,
  videoMime,
  videoOptionsSchema,
  videoSheetKey,
  videoTaskId,
  videoUploadSchema,
} from '../../src/shared/lib/sprite-tools/video-contract';

const id = '3e5e2787-a640-4bbf-a286-f0fa45bfb3f0';
const credential = {
  id,
  key: `uploads/2026-10/${id}.mp4`,
  size: 1200,
  contentType: 'video/mp4' as const,
  expires: 20000,
};
test('anonymous upload credentials reject tampering, expiration and foreign paths', async () => {
  const token = await signVideoCredential(credential, 'test-secret');
  assert.deepEqual(
    await verifyVideoCredential(token, 'test-secret', 10000),
    credential
  );
  await assert.rejects(verifyVideoCredential(token, 'another-secret', 10000));
  await assert.rejects(verifyVideoCredential(token, 'test-secret', 20000));
  const body = btoa(
    JSON.stringify({ ...credential, size: VIDEO_LIMIT + 1 })
  ).replace(/=+$/, '');
  await assert.rejects(
    verifyVideoCredential(
      `${body}.${token.split('.')[1]}`,
      'test-secret',
      10000
    )
  );
  await assert.rejects(
    signVideoCredential(
      { ...credential, key: 'projects/private/source.mp4' },
      'test-secret'
    )
  );
  for (const key of [
    `uploads/free-tools/2026-10/${id}/source.mp4`,
    `uploads/2026-10/results/${id}.mp4`,
    `uploads/2026-13/${id}.mp4`,
  ]) {
    await assert.rejects(
      signVideoCredential({ ...credential, key }, 'test-secret')
    );
  }
  const wrongOwner = await signVideoCredential(
    { ...credential, id: '18de7b2e-73ed-4bd1-89bc-031c2362e087' },
    'test-secret'
  );
  await assert.rejects(verifyVideoCredential(wrongOwner, 'test-secret', 10000));
});
test('each processing parameter changes task identity but retries are stable', async () => {
  const original = await videoTaskId(id, VIDEO_DEFAULTS);
  assert.match(original, /^[a-f0-9]{16}$/);
  assert.equal(await videoTaskId(id, { ...VIDEO_DEFAULTS }), original);
  for (const options of [
    { ...VIDEO_DEFAULTS, frame_count: 17 },
    { ...VIDEO_DEFAULTS, frame_size: 128 },
    { ...VIDEO_DEFAULTS, fps: 24 },
    { ...VIDEO_DEFAULTS, loop: true },
  ])
    assert.notEqual(await videoTaskId(id, options), original);
  assert.notEqual(
    await videoTaskId('another-upload', VIDEO_DEFAULTS),
    original
  );
  assert.equal(
    await videoSheetKey(credential.key, VIDEO_DEFAULTS),
    `uploads/2026-10/${original}.png`
  );
});
test('video boundaries reject coercion, oversized uploads, arbitrary URLs and out-of-contract controls', () => {
  assert.ok(
    videoUploadSchema.safeParse({
      filename: 'clip.mp4',
      contentType: 'video/mp4',
      size: VIDEO_LIMIT,
    }).success
  );
  assert.ok(
    !videoUploadSchema.safeParse({
      filename: 'clip.mp4',
      contentType: 'video/mp4',
      size: VIDEO_LIMIT + 1,
    }).success
  );
  assert.ok(videoOptionsSchema.safeParse(VIDEO_DEFAULTS).success);
  for (const invalid of [
    { frame_count: 1 },
    { frame_count: 33 },
    { frame_count: '16' },
    { frame_size: 255 },
    { fps: 0 },
    { fps: 61 },
    { fps: 12.5 },
    { loop: 'false' },
    { source_video_url: 'https://example.com/private' },
  ])
    assert.ok(
      !videoOptionsSchema.safeParse({ ...VIDEO_DEFAULTS, ...invalid }).success
    );
});
test('container sniffing rejects disguised images and recognizes supported containers', () => {
  const encode = (text: string) => new TextEncoder().encode(text);
  assert.equal(
    videoMime(encode('\x00\x00\x00 ftypisom\x00\x00\x00\x00mp42')),
    'video/mp4'
  );
  assert.equal(
    videoMime(encode('\x00\x00\x00 ftypqt  \x00\x00\x00\x00')),
    'video/quicktime'
  );
  assert.equal(
    videoMime(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, ...encode('webm')])),
    'video/webm'
  );
  assert.throws(() =>
    videoMime(encode('\x00\x00\x00 ftypavif\x00\x00\x00\x00'))
  );
  assert.throws(() => videoMime(encode('GIF89aexample')));
});
