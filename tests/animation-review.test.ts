import assert from 'node:assert/strict';
import { test } from 'node:test';

import { usesAnimationTestVideo } from '../src/config/generation/animation-video';
import {
  animationFrameLimit,
  animationReviewSchema,
  selectedAnimationFrames,
} from '../src/shared/lib/animation-review';
import { clampCharacterComposition } from '../src/shared/lib/character-composition';

test('the full image stays inside the safe area at every edge, scale and aspect ratio', () => {
  for (const aspect of [0.1, 0.5, 1, 2, 10])
    for (const x of [-100, 0, 50, 100, 200])
      for (const y of [-100, 0, 50, 100, 200])
        for (const scale of [0, 10, 72, 100, 500]) {
          const box = clampCharacterComposition({ x, y, scale }, aspect);
          assert.ok(box.x - box.width / 2 >= 8 - 1e-8);
          assert.ok(box.y - box.height / 2 >= 8 - 1e-8);
          assert.ok(box.x + box.width / 2 <= 92 + 1e-8);
          assert.ok(box.y + box.height / 2 <= 92 + 1e-8);
          assert.ok(Math.abs(box.width / box.height - aspect) < 1e-8);
        }
});
test('selection preserves source sheet coordinates and rejects duplicate/out-of-range frames', () => {
  const frames = selectedAnimationFrames([0, 3, 7], 8, 4, 128, () =>
    crypto.randomUUID()
  );
  assert.deepEqual(
    frames.map((frame) => frame.crop),
    [
      { x: 0, y: 0, width: 128, height: 128 },
      { x: 384, y: 0, width: 128, height: 128 },
      { x: 384, y: 128, width: 128, height: 128 },
    ]
  );
  for (const invalid of [[], [0, 0], [-1], [8], [1.5]])
    assert.throws(() => selectedAnimationFrames(invalid, 8, 4, 128, () => ''));
});
test('review API rejects forged or unbounded extraction and selection parameters', () => {
  const taskId = crypto.randomUUID(),
    requestId = crypto.randomUUID();
  const extract = {
    action: 'extract',
    taskId,
    requestId,
    frameCount: 16,
    frameSize: 128,
    fps: 12,
    loop: true,
  };
  assert.ok(animationReviewSchema.safeParse(extract).success);
  for (const change of [
    { frameCount: 1000 },
    { frameSize: 9999 },
    { fps: 0 },
    { requestId: '../other' },
  ])
    assert.equal(
      animationReviewSchema.safeParse({ ...extract, ...change }).success,
      false
    );
  assert.equal(
    animationReviewSchema.safeParse({
      action: 'save-sheet',
      taskId,
      extractionId: requestId,
      selected: [0, 0],
      fps: 12,
    }).success,
    false
  );
});
test('test-video switch cannot replace production generation', () => {
  const previous = process.env.NODE_ENV;
  try {
    Reflect.set(process.env, 'NODE_ENV', 'production');
    assert.equal(usesAnimationTestVideo(), false);
    Reflect.set(process.env, 'NODE_ENV', 'development');
    assert.equal(usesAnimationTestVideo(), true);
  } finally {
    if (previous === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
    else Reflect.set(process.env, 'NODE_ENV', previous);
  }
});

test('homepage frame ceiling follows duration at 24 fps', () => {
  assert.equal(animationFrameLimit(2), 48);
  assert.equal(animationFrameLimit(3), 72);
  assert.equal(animationFrameLimit(2.333333), 56);
  assert.equal(animationFrameLimit(NaN), 0);
  assert.equal(animationFrameLimit(Infinity), 0);
});
