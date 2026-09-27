export type PixelTool =
  | 'pencil'
  | 'eraser'
  | 'fill'
  | 'eyedropper'
  | 'line'
  | 'rect'
  | 'circle';

export type Rgba = [number, number, number, number];

export function hexToRgba(hex: string): Rgba {
  const value = hex.replace('#', '');
  const normalized =
    value.length === 3
      ? value
          .split('')
          .map((part) => part + part)
          .join('')
      : value.padEnd(6, '0').slice(0, 6);
  const number = Number.parseInt(normalized, 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255, 255];
}

export function rgbaToHex(color: Rgba) {
  const [r, g, b, a] = color;
  if (a < 8) return '#00000000';
  return `#${[r, g, b]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;
}

function pixelIndex(width: number, x: number, y: number) {
  return (y * width + x) * 4;
}

export function readPixel(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number
): Rgba | null {
  if (x < 0 || y < 0 || x >= width || y >= height) return null;
  const index = pixelIndex(width, x, y);
  return [data[index], data[index + 1], data[index + 2], data[index + 3]];
}

function writePixel(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  color: Rgba | null
) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const index = pixelIndex(width, x, y);
  if (!color) {
    data[index] = 0;
    data[index + 1] = 0;
    data[index + 2] = 0;
    data[index + 3] = 0;
    return;
  }
  data[index] = color[0];
  data[index + 1] = color[1];
  data[index + 2] = color[2];
  data[index + 3] = color[3];
}

export function stampBrush(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  color: Rgba | null,
  size: number
) {
  const radius = Math.max(1, Math.floor(size));
  const offset = Math.floor((radius - 1) / 2);
  for (let dy = 0; dy < radius; dy++) {
    for (let dx = 0; dx < radius; dx++) {
      writePixel(data, width, height, x + dx - offset, y + dy - offset, color);
    }
  }
}

function sameColor(a: Rgba | null, b: Rgba | null) {
  if (!a && !b) return true;
  if (!a || !b) return (a?.[3] || 0) < 8 && (b?.[3] || 0) < 8;
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

export function floodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  fill: Rgba
) {
  const target = readPixel(data, width, height, x, y);
  if (sameColor(target, fill)) return;
  const stack = [[x, y]];
  const seen = new Uint8Array(width * height);
  while (stack.length) {
    const [cx, cy] = stack.pop() as [number, number];
    if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue;
    const key = cy * width + cx;
    if (seen[key]) continue;
    seen[key] = 1;
    if (!sameColor(readPixel(data, width, height, cx, cy), target)) continue;
    writePixel(data, width, height, cx, cy, fill);
    stack.push([cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]);
  }
}

export function drawLine(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: Rgba | null,
  size: number
) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  while (true) {
    stampBrush(data, width, height, x, y, color, size);
    if (x === x1 && y === y1) break;
    const doubleErr = 2 * err;
    if (doubleErr > -dy) {
      err -= dy;
      x += sx;
    }
    if (doubleErr < dx) {
      err += dx;
      y += sy;
    }
  }
}

export function drawRect(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: Rgba | null,
  size: number
) {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  for (let x = minX; x <= maxX; x++) {
    stampBrush(data, width, height, x, minY, color, size);
    stampBrush(data, width, height, x, maxY, color, size);
  }
  for (let y = minY; y <= maxY; y++) {
    stampBrush(data, width, height, minX, y, color, size);
    stampBrush(data, width, height, maxX, y, color, size);
  }
}

export function drawCircle(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  ex: number,
  ey: number,
  color: Rgba | null,
  size: number
) {
  const radius = Math.round(Math.hypot(ex - cx, ey - cy));
  let x = radius;
  let y = 0;
  let err = 1 - radius;
  while (x >= y) {
    stampBrush(data, width, height, cx + x, cy + y, color, size);
    stampBrush(data, width, height, cx + y, cy + x, color, size);
    stampBrush(data, width, height, cx - x, cy + y, color, size);
    stampBrush(data, width, height, cx - y, cy + x, color, size);
    stampBrush(data, width, height, cx + x, cy - y, color, size);
    stampBrush(data, width, height, cx + y, cy - x, color, size);
    stampBrush(data, width, height, cx - x, cy - y, color, size);
    stampBrush(data, width, height, cx - y, cy - x, color, size);
    y += 1;
    if (err < 0) err += 2 * y + 1;
    else {
      x -= 1;
      err += 2 * (y - x) + 1;
    }
  }
}

export function collectShapePoints(
  tool: 'line' | 'rect' | 'circle',
  x0: number,
  y0: number,
  x1: number,
  y1: number
) {
  const points: Array<[number, number]> = [];
  if (tool === 'line') {
    drawLineOn((x, y) => points.push([x, y]), x0, y0, x1, y1);
    return points;
  }
  if (tool === 'rect') {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    for (let x = minX; x <= maxX; x++) {
      points.push([x, minY], [x, maxY]);
    }
    for (let y = minY; y <= maxY; y++) {
      points.push([minX, y], [maxX, y]);
    }
    return points;
  }
  const radius = Math.round(Math.hypot(x1 - x0, y1 - y0));
  let x = radius;
  let y = 0;
  let err = 1 - radius;
  while (x >= y) {
    points.push(
      [x0 + x, y0 + y],
      [x0 + y, y0 + x],
      [x0 - x, y0 + y],
      [x0 - y, y0 + x],
      [x0 + x, y0 - y],
      [x0 + y, y0 - x],
      [x0 - x, y0 - y],
      [x0 - y, y0 - x]
    );
    y += 1;
    if (err < 0) err += 2 * y + 1;
    else {
      x -= 1;
      err += 2 * (y - x) + 1;
    }
  }
  return points;
}

function drawLineOn(
  stamp: (x: number, y: number) => void,
  x0: number,
  y0: number,
  x1: number,
  y1: number
) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  while (true) {
    stamp(x, y);
    if (x === x1 && y === y1) break;
    const doubleErr = 2 * err;
    if (doubleErr > -dy) {
      err -= dy;
      x += sx;
    }
    if (doubleErr < dx) {
      err += dx;
      y += sy;
    }
  }
}

export function flipHorizontal(data: Uint8ClampedArray, width: number, height: number) {
  const clone = new Uint8ClampedArray(data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const from = pixelIndex(width, width - 1 - x, y);
      const to = pixelIndex(width, x, y);
      data[to] = clone[from];
      data[to + 1] = clone[from + 1];
      data[to + 2] = clone[from + 2];
      data[to + 3] = clone[from + 3];
    }
  }
}

export function flipVertical(data: Uint8ClampedArray, width: number, height: number) {
  const clone = new Uint8ClampedArray(data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const from = pixelIndex(width, x, height - 1 - y);
      const to = pixelIndex(width, x, y);
      data[to] = clone[from];
      data[to + 1] = clone[from + 1];
      data[to + 2] = clone[from + 2];
      data[to + 3] = clone[from + 3];
    }
  }
}

export function rotateClockwise(
  data: Uint8ClampedArray,
  width: number,
  height: number
) {
  if (width !== height) return;
  const clone = new Uint8ClampedArray(data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const from = pixelIndex(width, x, y);
      const to = pixelIndex(width, height - 1 - y, x);
      data[to] = clone[from];
      data[to + 1] = clone[from + 1];
      data[to + 2] = clone[from + 2];
      data[to + 3] = clone[from + 3];
    }
  }
}

export function extractPalette(data: Uint8ClampedArray, limit = 32) {
  const counts = new Map<string, { color: Rgba; count: number }>();
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 8) continue;
    const color: Rgba = [
      data[index],
      data[index + 1],
      data[index + 2],
      data[index + 3],
    ];
    const key = rgbaToHex(color);
    const current = counts.get(key);
    if (current) current.count += 1;
    else counts.set(key, { color, count: 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((entry) => rgbaToHex(entry.color));
}

export function detectPixelArt(
  data: Uint8ClampedArray,
  width: number,
  height: number
) {
  const unique = new Set<string>();
  let samples = 0;
  let transitions = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = pixelIndex(width, x, y);
      if (data[index + 3] < 8) continue;
      unique.add(`${data[index]},${data[index + 1]},${data[index + 2]}`);
      if (x + 1 >= width) continue;
      const next = pixelIndex(width, x + 1, y);
      if (data[next + 3] < 8) continue;
      samples += 1;
      if (
        data[index] !== data[next] ||
        data[index + 1] !== data[next + 1] ||
        data[index + 2] !== data[next + 2]
      ) {
        transitions += 1;
      }
    }
  }
  if (!samples) return false;
  const uniqueRatio = unique.size / Math.max(width * height, 1);
  const transitionRatio = transitions / samples;
  return unique.size <= 384 && uniqueRatio < 0.12 && transitionRatio < 0.42;
}

export function clonePixels(data: Uint8ClampedArray) {
  return new Uint8ClampedArray(data);
}
