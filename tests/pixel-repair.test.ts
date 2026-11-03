import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  detectPixelGrid,
  pixelRepairPalette,
  repairPixelImage,
  type PixelRaster,
} from '../src/shared/lib/pixel-repair';

function grid(pitch: number, size = 128): PixelRaster {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const color =
        (Math.floor(x / pitch) + Math.floor(y / pitch)) % 2
          ? [210, 60, 40, 255]
          : [20, 40, 180, 255];
      data.set(color, (y * size + x) * 4);
    }
  return { width: size, height: size, data };
}
test('detects the source grid and preserves exact native pixel blocks', () => {
  for (const pitch of [2, 4, 8, 16]) {
    const input = grid(pitch, 256);
    const detected = detectPixelGrid(input);
    assert.ok(
      Math.abs(detected.x!.pitch - pitch) < 0.3,
      `x pitch ${pitch}: ${detected.x?.pitch}`
    );
    const output = repairPixelImage(input);
    assert.equal(output.width, input.width);
    assert.deepEqual(output.data, input.data);
  }
});
test('fractional blocks become a uniform integer grid without introducing semi-transparent seams', () => {
  const result = repairPixelImage(grid(7.5, 240));
  assert.ok(result.scale > 1);
  for (let y = 0; y < result.height; y++)
    for (let x = 0; x < result.width; x++) {
      const i = (y * result.width + x) * 4;
      const anchor =
        (Math.floor(y / result.scale) * result.scale * result.width +
          Math.floor(x / result.scale) * result.scale) *
        4;
      assert.deepEqual(
        result.data.slice(i, i + 4),
        result.data.slice(anchor, anchor + 4)
      );
      assert.equal(result.data[i + 3], 255);
    }
});
test('keeps a thin translucent feature and does not key a background color', () => {
  const input = grid(8, 256);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) input.data.set([0, 0, 0, 0], (y * 256 + x) * 4);
  input.data.set([20, 190, 60, 100], 0);
  const output = repairPixelImage(input);
  assert.equal(output.data[3], 100);
  assert.ok(output.data[1] > 150);
  assert.equal(output.data[(16 * output.width + 16) * 4 + 3], 255);
});
test('does not mutate source and is deterministic', () => {
  const image = grid(4);
  const before = image.data.slice();
  assert.deepEqual(repairPixelImage(image), repairPixelImage(image));
  assert.deepEqual(image.data, before);
});
test('rejects empty and oversized inputs', () => {
  assert.throws(
    () =>
      repairPixelImage({
        width: 4,
        height: 4,
        data: new Uint8ClampedArray(64),
      }),
    /EMPTY_IMAGE/
  );
  assert.throws(
    () =>
      repairPixelImage({
        width: 10000,
        height: 1,
        data: new Uint8ClampedArray(40000),
      }),
    /IMAGE_TOO_LARGE/
  );
});

test('does not invent a 2px grid for a non-pixel texture', () => {
  const width = 256,
    data = new Uint8ClampedArray(width * width * 4);
  for (let y = 0; y < width; y++)
    for (let x = 0; x < width; x++)
      data.set(
        [
          (x * 73 + y * 151) % 256,
          (x * 17 + y * 63) % 256,
          (x * 97 + y * 31) % 256,
          255,
        ],
        (y * width + x) * 4
      );
  const input = { width, height: width, data };
  assert.deepEqual(detectPixelGrid(input), { x: null, y: null });
  const result = repairPixelImage(input, { logicalSize: 128 });
  assert.equal(result.inferred, true);
  assert.equal(result.width / result.scale, 128);
});

test('preserves a native 64px irregular sprite including single-pixel eyes and silhouette', () => {
  const size = 64,
    data = new Uint8ClampedArray(size * size * 4);
  for (let y = 7; y < 58; y++)
    for (let x = 19 + (y % 3); x < 44 - (y % 5); x++)
      data.set(
        (x + y) % 3 ? [29, 25, 32, 255] : [160, 85, 54, 255],
        (y * size + x) * 4
      );
  data.set([255, 255, 255, 255], (17 * size + 30) * 4);
  const result = repairPixelImage({ width: size, height: size, data });
  assert.equal(result.scale, 1);
  assert.deepEqual(result.data, data);
  assert.notEqual(result.data, data);
});

function visibleColors(data: Uint8ClampedArray) {
  const colors = new Set<string>();
  for (let i = 0; i < data.length; i += 4)
    if (data[i + 3]) colors.add([...data.slice(i, i + 3)].join(','));
  return colors;
}

test('limits the entire image palette and preserves rare bright/dark details', () => {
  const size = 64,
    data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i++)
    data.set([70 + (i % 100), 30 + (i % 90), 20 + (i % 60), 255], i * 4);
  data.set([255, 255, 255, 255], 0);
  data.set([0, 0, 0, 255], 4);
  for (const maxColors of [2, 16, 32]) {
    const result = repairPixelImage(
      { width: size, height: size, data },
      { maxColors }
    );
    const colors = visibleColors(result.data);
    assert.ok(colors.size <= maxColors);
    assert.ok(colors.has('255,255,255'));
    assert.ok(colors.has('0,0,0'));
  }
});

test('uses only the supplied palette without recoloring transparent pixels', () => {
  const input = grid(8, 256);
  input.data.fill(0, 0, 4);
  const result = repairPixelImage(input, { palette: ['#11121C', '#D3A264'] });
  assert.deepEqual([...visibleColors(result.data)].sort(), [
    '17,18,28',
    '211,162,100',
  ]);
  const transparent = repairPixelImage(
    {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([1, 2, 3, 0, 255, 255, 255, 255]),
    },
    { palette: ['#000000', '#FFFFFF'] }
  );
  assert.deepEqual([...transparent.data.slice(0, 4)], [0, 0, 0, 0]);
  assert.deepEqual(pixelRepairPalette('["#11121c", "#D3A264", "#11121C"]'), [
    '#11121C',
    '#D3A264',
  ]);
  assert.equal(pixelRepairPalette('not a palette'), undefined);
});

test('cleans contour alpha while preserving a stable translucent interior', () => {
  const width = 256,
    data = new Uint8ClampedArray(width * width * 4);
  for (let y = 64; y < 192; y++) {
    data.set([80, 100, 140, 100], (y * width + 63) * 4);
    for (let x = 64; x < 192; x++)
      data.set([80, 100, 140, 253], (y * width + x) * 4);
  }
  const opaque = repairPixelImage({ width, height: width, data });
  assert.deepEqual(
    [...new Set(opaque.data.filter((_, i) => i % 4 === 3))].sort(
      (a, b) => a - b
    ),
    [0, 255]
  );
  for (let y = 96; y < 160; y++)
    for (let x = 96; x < 160; x++) data[(y * width + x) * 4 + 3] = 100;
  const translucent = repairPixelImage({ width, height: width, data });
  assert.ok(translucent.data.some((a, i) => i % 4 === 3 && a === 100));
});

test('default repair retains source peach skin and brown clothing instead of imposing a prompt palette', () => {
  const size = 256;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      data.set(
        y < size / 2 ? [236, 173, 128, 255] : [122, 79, 57, 255],
        (y * size + x) * 4
      );
  const result = repairPixelImage({ width: size, height: size, data });
  assert.deepEqual([...visibleColors(result.data)].sort(), [
    '122,79,57',
    '236,173,128',
  ]);
});

test('cleans subtle isolated cell noise without smoothing native or reliably aligned pixel art', () => {
  const size = 256;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < data.length; i += 4) data.set([180, 130, 90, 255], i);
  for (let y = 96; y < 100; y++)
    for (let x = 96; x < 100; x++)
      data.set([198, 148, 108, 255], (y * size + x) * 4);
  const result = repairPixelImage(
    { width: size, height: size, data },
    { logicalSize: 64 }
  );
  assert.equal(result.inferred, true);
  assert.deepEqual([...visibleColors(result.data)], ['180,130,90']);
  const native = repairPixelImage(
    { width: size, height: size, data },
    { logicalSize: 256 }
  );
  assert.deepEqual(native.data, data);
});

test('keeps neutral eye highlights even when a warm light is brighter', () => {
  const size = 64;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < data.length; i += 4)
    data.set([80 + ((i / 4) % 90), 50 + ((i / 4) % 70), 30, 255], i);
  data.set([255, 240, 80, 255], 0);
  data.set([220, 215, 205, 255], 4);
  const result = repairPixelImage({ width: size, height: size, data });
  assert.deepEqual([...result.data.slice(4, 8)], [220, 215, 205, 255]);
  assert.ok(visibleColors(result.data).size <= 64);
});

test('default fallback preserves a thin accessory that the old 128px reduction discarded', () => {
  const size = 512;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < data.length; i += 4) data.set([200, 125, 45, 255], i);
  for (let y = 200; y < 212; y++)
    for (let x = 102; x < 104; x++)
      data.set([215, 135, 55, 255], (y * size + x) * 4);
  const source = { width: size, height: size, data };
  const result = repairPixelImage(source);
  assert.equal(result.inferred, true);
  assert.equal(result.width / result.scale, 256);
  assert.ok(visibleColors(result.data).has('215,135,55'));
  assert.ok(
    !visibleColors(
      repairPixelImage(source, { logicalSize: 128, maxColors: 32 }).data
    ).has('215,135,55')
  );
});
