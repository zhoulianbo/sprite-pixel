import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  detectPixelArt,
  drawLine,
  extractPalette,
  hexToRgba,
  readPixel,
} from '../src/shared/lib/pixel-drawing';

test('pixel drawing writes a bresenham line', () => {
  const width = 8;
  const height = 8;
  const data = new Uint8ClampedArray(width * height * 4);
  drawLine(data, width, height, 0, 0, 3, 0, hexToRgba('#ff0000'), 1);
  assert.deepEqual(readPixel(data, width, height, 0, 0), [255, 0, 0, 255]);
  assert.deepEqual(readPixel(data, width, height, 3, 0), [255, 0, 0, 255]);
  assert.equal(readPixel(data, width, height, 0, 1)?.[3], 0);

  const diagonal = new Uint8ClampedArray(width * height * 4);
  drawLine(diagonal, width, height, 0, 0, 3, 3, hexToRgba('#00ff00'), 1);
  assert.deepEqual(readPixel(diagonal, width, height, 1, 1), [0, 255, 0, 255]);
  assert.deepEqual(readPixel(diagonal, width, height, 2, 2), [0, 255, 0, 255]);
});

test('detectPixelArt accepts flat palettes and rejects noisy images', () => {
  const width = 16;
  const height = 16;
  const pixel = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const color = x < 8 ? 20 : 200;
      pixel[index] = color;
      pixel[index + 1] = color;
      pixel[index + 2] = color;
      pixel[index + 3] = 255;
    }
  }
  assert.equal(detectPixelArt(pixel, width, height), true);
  assert.deepEqual(extractPalette(pixel, 4).sort(), ['#141414', '#c8c8c8']);

  const noisy = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < noisy.length; i += 4) {
    noisy[i] = i % 255;
    noisy[i + 1] = (i * 3) % 255;
    noisy[i + 2] = (i * 7) % 255;
    noisy[i + 3] = 255;
  }
  assert.equal(detectPixelArt(noisy, width, height), false);
});
