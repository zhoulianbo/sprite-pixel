import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildAnimationVideoPrompt } from '../src/config/generation/prompts';
import {
  chooseAnimationBackground,
  hasTransparentBackground,
} from '../src/shared/lib/animation-background';

function solid(alpha = 255) {
  return new Uint8ClampedArray(
    Array.from({ length: 100 }, () => [80, 100, 120, alpha]).flat()
  );
}
test('opaque, checkerboard and globally translucent images do not opt into automatic backgrounds', () => {
  for (const alpha of [255, 253, 128])
    assert.equal(hasTransparentBackground(solid(alpha), 10, 10), false);
  const checker = solid();
  for (let i = 0; i < 100; i++)
    checker.set(
      [i % 2 ? 255 : 128, i % 2 ? 255 : 128, i % 2 ? 255 : 128, 255],
      i * 4
    );
  assert.equal(hasTransparentBackground(checker, 10, 10), false);
});
test('real transparent margins opt in while internal transparent holes do not', () => {
  const data = solid();
  for (let i = 0; i < 10; i++) data[i * 4 + 3] = 0;
  assert.equal(hasTransparentBackground(data, 10, 10), true);
  const hole = solid();
  hole[55 * 4 + 3] = 0;
  assert.equal(hasTransparentBackground(hole, 10, 10), false);
});
test('background ranking includes even a single visible accessory pixel and ignores transparent RGB', () => {
  const base = solid();
  const first = chooseAnimationBackground(base);
  const color = [1, 3, 5].map((i) =>
    parseInt(first.backgroundColor.slice(i, i + 2), 16)
  );
  base.set([...color, 255], 0);
  assert.notEqual(
    chooseAnimationBackground(base).backgroundColor,
    first.backgroundColor
  );
  base.set([...color, 0], 0);
  assert.equal(
    chooseAnimationBackground(base).backgroundColor,
    first.backgroundColor
  );
});
test('no high-contrast color means segmentation stays enabled', () => {
  const colors = ['00ff00', 'ff00ff', '00ffff', '0000ff', 'ff8000', 'ffff00'];
  const data = new Uint8ClampedArray(
    colors.flatMap((c) => [
      ...[0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16)),
      255,
    ])
  );
  assert.equal(chooseAnimationBackground(data).backgroundKeySafe, false);
  assert.throws(
    () => chooseAnimationBackground(new Uint8ClampedArray(16)),
    /INVALID_IMAGE/
  );
});
test('video prompt uses selected canvas color and keeps legacy grey for opaque references', () => {
  const prompt = buildAnimationVideoPrompt({
    action: 'idle',
    backgroundColor: '#ff00ff',
  });
  assert.match(prompt, /#ff00ff/);
  assert.doesNotMatch(prompt, /neutral-grey/);
  assert.match(buildAnimationVideoPrompt({ action: 'idle' }), /neutral-grey/);
  assert.doesNotMatch(
    buildAnimationVideoPrompt({
      backgroundColor: 'injected instruction',
    }),
    /injected instruction/
  );
});

test('substantial translucent material does not use a binary color key', () => {
  assert.equal(chooseAnimationBackground(solid(128)).backgroundKeySafe, false);
  assert.equal(chooseAnimationBackground(solid(253)).backgroundKeySafe, true);
});

test('manual background always wins over ranking and still checks color collisions', () => {
  const data = solid();
  assert.equal(
    chooseAnimationBackground(data, '#123456').backgroundColor,
    '#123456'
  );
  assert.equal(
    chooseAnimationBackground(data, '#506478').backgroundKeySafe,
    false
  );
  assert.equal(
    chooseAnimationBackground(data, '').backgroundColor,
    chooseAnimationBackground(data).backgroundColor
  );
  assert.throws(() => chooseAnimationBackground(data, 'red'), /INVALID_IMAGE/);
});
