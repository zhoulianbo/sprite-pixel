import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { decompressFrames, parseGIF } from 'gifuct-js';

import {
  checkFrames,
  checkSize,
  createAtlas,
  createAtlasArray,
  createCssAtlas,
  createXmlAtlas,
  defaultMaker,
  defaultSlice,
  Frame,
  isEffectivelyTransparent,
  isTransparent,
  naturalSort,
  packFrames,
  resolveSpriteSheetSlice,
  sliceGrid,
  suggestMakerGridColumns,
  toolPath,
  trimBounds,
} from '../../src/shared/lib/sprite-tools/core';
import { createGifCompositor } from '../../src/shared/lib/sprite-tools/gif-compositor';
import {
  delayCentiseconds,
  encodeAnimatedGif,
} from '../../src/shared/lib/sprite-tools/gif-encoder';
import { imageInfo } from '../../src/shared/lib/sprite-tools/image-info';
import {
  sendHandoff,
  takeHandoff,
} from '../../src/shared/lib/sprite-tools/transfer';
import { gifFixture } from './fixtures';

function frame(name: string, width = 16, height = 16): Frame {
  return {
    id: name,
    name,
    width,
    height,
    duration: 150,
    originalIndex: 0,
    blob: new Blob(),
  };
}
test('natural ordering, mixed dimensions and bottom alignment preserve source rectangles', () => {
  assert.deepEqual(
    naturalSort([
      { name: 'run-10.png' },
      { name: 'run-2.png' },
      { name: 'run-1.png' },
    ]).map((f) => f.name),
    ['run-1.png', 'run-2.png', 'run-10.png']
  );
  const packed = packFrames(
    [frame('a', 16, 16), frame('b', 8, 10), frame('c', 4, 4)],
    { ...defaultMaker, columns: 2, padding: 3, gap: 2 }
  );
  assert.deepEqual([packed.width, packed.height], [40, 40]);
  assert.deepEqual(
    [
      packed.rects[1].x,
      packed.rects[1].y,
      packed.rects[1].width,
      packed.rects[1].height,
    ],
    [25, 9, 8, 10]
  );
  assert.deepEqual([packed.rects[2].x, packed.rects[2].y], [9, 33]);
  assert.equal(
    packFrames([frame('a'), frame('b')], {
      ...defaultMaker,
      layout: 'vertical',
    }).width,
    16
  );
  assert.equal(
    packFrames([frame('a'), frame('b')], {
      ...defaultMaker,
      layout: 'horizontal',
    }).width,
    32
  );
});
test('Maker margins and gaps round-trip to exact Splitter cell coordinates', () => {
  const inputs = Array.from({ length: 8 }, (_, i) => frame(String(i), 12, 20));
  const packed = packFrames(inputs, { ...defaultMaker, padding: 50, gap: 3 });
  const sliced = sliceGrid(packed, {
    ...defaultSlice,
    mode: 'size',
    width: 12,
    height: 20,
    offsetX: 50,
    offsetY: 50,
    trimRight: 50,
    trimBottom: 50,
    gapX: 3,
    gapY: 3,
  });
  assert.deepEqual(sliced.rects, packed.cells);
  assert.deepEqual(
    [sliced.columns, sliced.rows, sliced.remainderX, sliced.remainderY],
    [4, 2, 0, 0]
  );
});
test('non-divisible edges are reported and invalid or over-limit grids are rejected', () => {
  const grid = sliceGrid(
    { width: 101, height: 83 },
    { ...defaultSlice, offsetX: 2, offsetY: 2, gapX: 1, gapY: 1 }
  );
  assert.deepEqual(
    [grid.width, grid.height, grid.remainderX, grid.remainderY],
    [24, 19, 0, 2]
  );
  assert.throws(
    () =>
      sliceGrid({ width: 20, height: 20 }, { ...defaultSlice, offsetX: 21 }),
    /bounds/
  );
  assert.throws(
    () =>
      sliceGrid(
        { width: 20, height: 20 },
        { ...defaultSlice, mode: 'size', width: 21 }
      ),
    /bounds/
  );
  assert.throws(
    () =>
      sliceGrid({ width: 20, height: 20 }, { ...defaultSlice, columns: NaN }),
    /invalidGrid/
  );
  assert.throws(
    () =>
      sliceGrid(
        { width: 256, height: 256 },
        { ...defaultSlice, mode: 'size', width: 1, height: 1 }
      ),
    /frameLimit/
  );
  assert.throws(() => checkSize({ width: 8193, height: 1 }), /imageLimit/);
  assert.throws(
    () =>
      checkFrames(
        Array.from({ length: 3 }, () => ({ width: 4000, height: 4000 }))
      ),
    /pixelLimit/
  );
});
test('sprite sheet slicing shares explicit metadata and dimension estimates', () => {
  const generated = resolveSpriteSheetSlice(
    { width: 1774, height: 887 },
    { columns: 4, rows: 2, frameCount: 6 }
  );
  assert.deepEqual(
    [
      generated.grid.columns,
      generated.grid.rows,
      generated.frameCount,
      generated.grid.width,
      generated.grid.height,
      generated.grid.remainderX,
      generated.grid.remainderY,
    ],
    [4, 2, 6, 443, 443, 2, 1]
  );
  const inferred = resolveSpriteSheetSlice({ width: 640, height: 640 });
  assert.deepEqual(
    [inferred.grid.columns, inferred.grid.rows, inferred.grid.width],
    [5, 5, 128]
  );
  const wide = resolveSpriteSheetSlice({ width: 1774, height: 887 });
  assert.deepEqual([wide.grid.columns, wide.grid.rows], [4, 2]);
});
test('JSON hash contains source rectangles, unique names, exact order and timing', () => {
  const frames = [frame('same.png'), frame('same.png', 8, 8)];
  const atlas = createAtlas(frames, packFrames(frames, defaultMaker), null);
  assert.deepEqual(atlas.meta.frameOrder, ['001-same.png', '002-same.png']);
  assert.deepEqual(atlas.frames['002-same.png'].frame, {
    x: 20,
    y: 8,
    w: 8,
    h: 8,
  });
  assert.equal(atlas.frames['002-same.png'].duration, 150);
  assert.equal(
    createAtlas(frames, packFrames(frames, defaultMaker), 10).frames[
      '001-same.png'
    ].duration,
    100
  );
  const zipped = zipSync({
    'sprite-sheet.json': strToU8(JSON.stringify(atlas)),
  });
  assert.deepEqual(
    JSON.parse(strFromU8(unzipSync(zipped)['sprite-sheet.json'])),
    atlas
  );
});
test('array, CSS and XML atlases keep the same rectangles and unique names', () => {
  const frames = [frame('same.png'), frame('a & b.png', 8, 8)];
  const pack = packFrames(frames, defaultMaker);
  const hash = createAtlas(frames, pack, null);
  const array = createAtlasArray(frames, pack, null);
  const css = createCssAtlas(frames, pack);
  const xml = createXmlAtlas(frames, pack);
  assert.equal(array.frames.length, 2);
  assert.equal(array.frames[1].filename, '002-a-b.png');
  assert.deepEqual(array.frames[1].frame, hash.frames['002-a-b.png'].frame);
  assert.match(
    css,
    /\.sprite-002-a-b \{ width: 8px; height: 8px; background-position: -20px -8px; \}/
  );
  assert.match(
    xml,
    /<SubTexture name="002-a-b.png" x="20" y="8" width="8" height="8"\/>/
  );
  assert.match(xml, /imagePath="sprite-sheet.png"/);
});
test('GIF decoder + compositor restores partial patches, disposal 2/3, transparency and variable delays', () => {
  const encoded = gifFixture();
  const gif = parseGIF(encoded.buffer);
  const decoded = decompressFrames(gif, true);
  const compose = createGifCompositor(3, 2, [0, 0, 0, 255]);
  const pixels = decoded.map(compose);
  const red = [255, 0, 0, 255],
    green = [0, 255, 0, 255],
    blue = [0, 0, 255, 255],
    empty = [0, 0, 0, 0];
  assert.deepEqual(
    decoded.map((f) => f.delay),
    [100, 200, 300, 400]
  );
  assert.deepEqual([...pixels[0]], [red, red, red, empty, empty, empty].flat());
  assert.deepEqual(
    [...pixels[1]],
    [red, green, red, empty, empty, empty].flat()
  );
  assert.deepEqual(
    [...pixels[2]],
    [red, empty, red, empty, empty, blue].flat()
  );
  assert.deepEqual(
    [...pixels[3]],
    [red, empty, red, green, empty, empty].flat()
  );
});
test('transparent exclusion checks alpha only, not darkness or RGB', () => {
  assert.equal(isTransparent(new Uint8ClampedArray([255, 5, 4, 0])), true);
  assert.equal(isTransparent(new Uint8ClampedArray([0, 0, 0, 255])), false);
  assert.equal(isTransparent(new Uint8ClampedArray([0, 0, 0, 1])), false);
});
test('effective transparency ignores negligible alpha noise in empty cells', () => {
  const noisyEmpty = new Uint8ClampedArray(443 * 443 * 4);
  for (let pixel = 0; pixel < 250; pixel++) noisyEmpty[pixel * 4 + 3] = 42;
  assert.equal(isEffectivelyTransparent(noisyEmpty), true);

  const visible = new Uint8ClampedArray(443 * 443 * 4);
  for (let pixel = 0; pixel < 100; pixel++) visible[pixel * 4 + 3] = 255;
  assert.equal(isEffectivelyTransparent(visible), false);
});
test('trimBounds keeps the opaque box and a 1×1 fully transparent frame', () => {
  const data = new Uint8ClampedArray(4 * 4 * 4);
  const i = (1 * 4 + 2) * 4;
  data[i] = 255;
  data[i + 3] = 255;
  assert.deepEqual(trimBounds(data, 4, 4), { x: 2, y: 1, width: 1, height: 1 });
  assert.deepEqual(trimBounds(new Uint8ClampedArray(2 * 2 * 4), 2, 2), {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
});
test('JSON atlas records trim offsets when frames were cropped', () => {
  const frames = [
    {
      ...frame('a.png', 8, 10),
      trim: { x: 2, y: 1, sourceW: 16, sourceH: 16 },
    },
  ];
  const atlas = createAtlas(frames, packFrames(frames, defaultMaker), null);
  assert.equal(atlas.frames['001-a.png'].trimmed, true);
  assert.deepEqual(atlas.frames['001-a.png'].spriteSourceSize, {
    x: 2,
    y: 1,
    w: 8,
    h: 10,
  });
  assert.deepEqual(atlas.frames['001-a.png'].sourceSize, { w: 16, h: 16 });
  assert.equal(
    createAtlas(
      [frame('b.png')],
      packFrames([frame('b.png')], defaultMaker),
      null
    ).frames['001-b.png'].trimmed,
    false
  );
});
test('GIF encoder round-trips size, delay, color and transparency through gifuct-js', () => {
  assert.equal(delayCentiseconds(100), 10);
  assert.equal(delayCentiseconds(16), 2);
  const red = new Uint8ClampedArray(2 * 2 * 4);
  const mixed = new Uint8ClampedArray(2 * 2 * 4);
  for (let i = 0; i < 4; i++) red.set([255, 0, 0, 255], i * 4);
  mixed.set([0, 0, 255, 255], 0);
  const bytes = encodeAnimatedGif(2, 2, [
    { data: red, delay: 100 },
    { data: mixed, delay: 200 },
  ]);
  const gif = parseGIF(bytes.buffer);
  const decoded = decompressFrames(gif, true);
  assert.equal(decoded.length, 2);
  assert.equal(gif.lsd.width, 2);
  assert.equal(gif.lsd.height, 2);
  assert.deepEqual(
    decoded.map((item) => item.delay),
    [100, 200]
  );
  assert.deepEqual([...decoded[0].patch.slice(0, 4)], [255, 0, 0, 255]);
  assert.deepEqual([...decoded[1].patch.slice(0, 4)], [0, 0, 255, 255]);
  assert.equal(decoded[1].patch[7], 0);
});
test('GIF encoder keeps LZW codes valid across dictionary width changes', () => {
  const width = 96;
  const height = 64;
  const colors = [
    [255, 0, 0, 255],
    [0, 255, 0, 255],
    [0, 0, 255, 255],
    [255, 255, 0, 255],
    [0, 0, 0, 0],
  ] as const;
  const source = new Uint8ClampedArray(width * height * 4);
  let value = 0x12345678;
  for (let pixel = 0; pixel < width * height; pixel++) {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    source.set(colors[value % colors.length], pixel * 4);
  }
  const bytes = encodeAnimatedGif(width, height, [{ data: source, delay: 80 }]);
  const decoded = decompressFrames(parseGIF(bytes.buffer), true);
  assert.equal(decoded.length, 1);
  assert.deepEqual([...decoded[0].patch], [...source]);
});
test('dimension preflight rejects bad formats and oversized PNG before decoding', () => {
  const buffer = new ArrayBuffer(24);
  const b = new Uint8Array(buffer);
  b.set([137, 80, 78, 71]);
  const view = new DataView(buffer);
  view.setUint32(16, 9000);
  view.setUint32(20, 2);
  assert.throws(() => imageInfo(buffer), /imageLimit/);
  assert.throws(() => imageInfo(new ArrayBuffer(20)), /invalidImage/);
});
test('in-tab handoff is target-specific, consumed once, and preserves the exact frames', () => {
  const frames = [frame('walk.png')];
  sendHandoff({ target: 'maker', frames });
  assert.equal(takeHandoff('splitter'), undefined);
  assert.equal(takeHandoff('maker')?.frames, frames);
  assert.equal(takeHandoff('maker'), undefined);
});
test('English and Chinese have identical keys and complete SEO sections', () => {
  const en = JSON.parse(
    readFileSync('src/config/locale/messages/en/tools/sprites.json', 'utf8')
  );
  const zh = JSON.parse(
    readFileSync('src/config/locale/messages/zh/tools/sprites.json', 'utf8')
  );
  const paths = (value: any, prefix = ''): string[] =>
    typeof value === 'object'
      ? Object.entries(value).flatMap(([key, child]) =>
          paths(child, `${prefix}.${key}`)
        )
      : [prefix];
  assert.deepEqual(paths(en), paths(zh));
  for (const tool of ['maker', 'splitter']) {
    const copy = en[tool];
    const text = [
      copy.intro,
      ...['steps', 'features', 'useCases', 'guide', 'faq'].flatMap((section) =>
        copy[section].map((i: any) => `${i.title} ${i.text}`)
      ),
      copy.relatedText,
      copy.ctaText,
    ].join(' ');
    const count = text.split(/\s+/).length;
    assert.ok(count >= 800 && count <= 1200, `${tool}: ${count} words`);
  }
});
test('public cutter path stays mapped from the splitter tool id', () => {
  assert.equal(toolPath('maker'), '/sprite-sheet-maker');
  assert.equal(toolPath('splitter'), '/sprite-sheet-cutter');
});
test('suggestMakerGridColumns prefers landscape grids with minimal imbalance', () => {
  assert.equal(suggestMakerGridColumns(29), 6);
  assert.equal(suggestMakerGridColumns(16), 4);
  assert.equal(suggestMakerGridColumns(1), 1);
  assert.equal(suggestMakerGridColumns(10), 4);
});
