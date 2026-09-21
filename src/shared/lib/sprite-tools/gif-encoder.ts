import { checkSize } from './core';

export type GifSourceFrame = {
  data: Uint8ClampedArray;
  delay: number;
};

const TRANSPARENT = 128;

export function delayCentiseconds(ms: number) {
  const value = Math.round(ms / 10);
  return Math.max(2, Number.isFinite(value) && value > 0 ? value : 10);
}

export function encodeAnimatedGif(
  width: number,
  height: number,
  frames: GifSourceFrame[]
) {
  checkSize({ width, height });
  if (!frames.length) throw new Error('empty');
  const pixels = width * height;
  for (const frame of frames) {
    if (frame.data.length !== pixels * 4) throw new Error('invalidImage');
  }
  const palette = buildPalette(frames);
  const bytes: number[] = [
    71,
    73,
    70,
    56,
    57,
    97,
    width & 255,
    width >> 8,
    height & 255,
    height >> 8,
    0xf7,
    0,
    0,
  ];
  for (let i = 0; i < 256; i++) {
    const color = palette[i] ?? [0, 0, 0];
    bytes.push(color[0], color[1], color[2]);
  }
  bytes.push(
    0x21,
    0xff,
    0x0b,
    78,
    69,
    84,
    83,
    67,
    65,
    80,
    69,
    50,
    46,
    48,
    3,
    1,
    0,
    0,
    0
  );
  for (const frame of frames) {
    const indices = indexFrame(frame.data, palette);
    const delay = delayCentiseconds(frame.delay);
    bytes.push(
      0x21,
      0xf9,
      4,
      9,
      delay & 255,
      delay >> 8,
      0,
      0,
      0x2c,
      0,
      0,
      0,
      0,
      width & 255,
      width >> 8,
      height & 255,
      height >> 8,
      0,
      8
    );
    writeSubBlocks(bytes, lzwEncode(indices, 8));
  }
  bytes.push(0x3b);
  return Uint8Array.from(bytes);
}

type Rgb = [number, number, number];

function rgbKey(r: number, g: number, b: number) {
  return (r << 16) | (g << 8) | b;
}

function buildPalette(frames: GifSourceFrame[]): Rgb[] {
  const counts = new Map<number, number>();
  for (const frame of frames) {
    const { data } = frame;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < TRANSPARENT) continue;
      const key = rgbKey(data[i], data[i + 1], data[i + 2]);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const opaque: Rgb[] =
    counts.size <= 255
      ? [...counts.keys()].map((key) => [
          (key >> 16) & 255,
          (key >> 8) & 255,
          key & 255,
        ])
      : medianCut(counts, 255);
  const palette: Rgb[] = [[0, 0, 0]];
  for (const color of opaque) palette.push(color);
  while (palette.length < 256) palette.push([0, 0, 0]);
  return palette;
}

function medianCut(counts: Map<number, number>, max: number): Rgb[] {
  type Sample = { r: number; g: number; b: number; n: number };
  const samples: Sample[] = [...counts.entries()].map(([key, n]) => ({
    r: (key >> 16) & 255,
    g: (key >> 8) & 255,
    b: key & 255,
    n,
  }));
  const boxes: Sample[][] = [samples];
  while (boxes.length < max) {
    let index = -1;
    let best = -1;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      const range = channelRange(boxes[i]);
      if (range > best) {
        best = range;
        index = i;
      }
    }
    if (index < 0) break;
    const [left, right] = splitBox(boxes[index]);
    boxes.splice(index, 1, left, right);
  }
  return boxes.map(averageBox);
}

function channelRange(box: { r: number; g: number; b: number }[]) {
  let rMin = 255;
  let rMax = 0;
  let gMin = 255;
  let gMax = 0;
  let bMin = 255;
  let bMax = 0;
  for (const color of box) {
    if (color.r < rMin) rMin = color.r;
    if (color.r > rMax) rMax = color.r;
    if (color.g < gMin) gMin = color.g;
    if (color.g > gMax) gMax = color.g;
    if (color.b < bMin) bMin = color.b;
    if (color.b > bMax) bMax = color.b;
  }
  return Math.max(rMax - rMin, gMax - gMin, bMax - bMin);
}

function splitBox<T extends { r: number; g: number; b: number; n: number }>(
  box: T[]
): [T[], T[]] {
  let rMin = 255;
  let rMax = 0;
  let gMin = 255;
  let gMax = 0;
  let bMin = 255;
  let bMax = 0;
  for (const color of box) {
    if (color.r < rMin) rMin = color.r;
    if (color.r > rMax) rMax = color.r;
    if (color.g < gMin) gMin = color.g;
    if (color.g > gMax) gMax = color.g;
    if (color.b < bMin) bMin = color.b;
    if (color.b > bMax) bMax = color.b;
  }
  const ranges = [rMax - rMin, gMax - gMin, bMax - bMin];
  const channel = (['r', 'g', 'b'] as const)[
    ranges.indexOf(Math.max(...ranges))
  ];
  const sorted = [...box].sort((a, b) => a[channel] - b[channel]);
  const half = sorted.reduce((sum, color) => sum + color.n, 0) / 2;
  let acc = 0;
  let index = 0;
  while (index < sorted.length - 1 && acc + sorted[index].n < half) {
    acc += sorted[index].n;
    index++;
  }
  if (index === 0) index = 1;
  return [sorted.slice(0, index), sorted.slice(index)];
}

function averageBox(
  box: { r: number; g: number; b: number; n: number }[]
): Rgb {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (const color of box) {
    r += color.r * color.n;
    g += color.g * color.n;
    b += color.b * color.n;
    n += color.n;
  }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

function indexFrame(data: Uint8ClampedArray, palette: Rgb[]) {
  const exact = new Map<number, number>();
  for (let i = 1; i < palette.length; i++) {
    const [r, g, b] = palette[i];
    const key = rgbKey(r, g, b);
    if (!exact.has(key)) exact.set(key, i);
  }
  const indices = new Uint8Array(data.length / 4);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    if (data[i + 3] < TRANSPARENT) {
      indices[p] = 0;
      continue;
    }
    const key = rgbKey(data[i], data[i + 1], data[i + 2]);
    indices[p] =
      exact.get(key) ?? nearest(data[i], data[i + 1], data[i + 2], palette);
  }
  return indices;
}

function nearest(r: number, g: number, b: number, palette: Rgb[]) {
  let best = 1;
  let bestD = Infinity;
  for (let i = 1; i < palette.length; i++) {
    const dr = r - palette[i][0];
    const dg = g - palette[i][1];
    const db = b - palette[i][2];
    const d = dr * dr + dg * dg + db * db;
    if (d < bestD) {
      bestD = d;
      best = i;
      if (d === 0) break;
    }
  }
  return best;
}

function lzwEncode(indices: Uint8Array, minCodeSize: number) {
  const clear = 1 << minCodeSize;
  const eoi = clear + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoi + 1;
  const output: number[] = [];
  let acc = 0;
  let bits = 0;
  const emit = (code: number) => {
    acc |= code << bits;
    bits += codeSize;
    while (bits >= 8) {
      output.push(acc & 255);
      acc >>= 8;
      bits -= 8;
    }
  };
  const dict = new Map<number, number>();
  const reset = () => {
    dict.clear();
    codeSize = minCodeSize + 1;
    nextCode = eoi + 1;
  };
  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const suffix = indices[i];
    const key = (prefix << 8) | suffix;
    const existing = dict.get(key);
    if (existing !== undefined) {
      prefix = existing;
      continue;
    }
    emit(prefix);
    if (nextCode < 4096) {
      dict.set(key, nextCode);
      nextCode++;
      // The decoder adds a dictionary entry after it reads the next emitted
      // code, so its table is one entry behind the encoder between writes.
      // Keep the current width for that code and grow it on the following one.
      if (nextCode === (1 << codeSize) + 1 && codeSize < 12) codeSize++;
    } else {
      emit(clear);
      reset();
    }
    prefix = suffix;
  }
  emit(prefix);
  emit(eoi);
  if (bits > 0) output.push(acc & 255);
  return output;
}

function writeSubBlocks(bytes: number[], data: number[]) {
  for (let i = 0; i < data.length; i += 255) {
    const chunk = data.slice(i, i + 255);
    bytes.push(chunk.length, ...chunk);
  }
  bytes.push(0);
}
