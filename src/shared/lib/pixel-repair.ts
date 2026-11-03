/** Deterministic single-image grid reconstruction. No model or background removal. */
export type PixelRaster = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};
export type PixelRepairResult = PixelRaster & {
  pitch: number;
  scale: number;
  inferred: boolean;
};
export type PixelRepairOptions = {
  logicalSize?: number;
  maxColors?: number;
  palette?: string[];
};

export const defaultPixelRepairOptions = {
  logicalSize: 256,
  maxColors: 64,
} as const;

/** Only explicit palette fields/labelled prompt lines are interpreted as a palette. */
export function pixelRepairPalette(value: unknown): string[] | undefined {
  const text = typeof value === 'string' ? value : JSON.stringify(value || '');
  const colors = [
    ...new Set(text.match(/#[0-9a-f]{6}\b/gi)?.map((c) => c.toUpperCase())),
  ];
  return colors.length >= 2 && colors.length <= 256 ? colors : undefined;
}

function axisGrid(weights: Float64Array) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total < 1) return null;
  let best = { pitch: 1, phase: 0, score: 0 };
  const limit = Math.min(48, weights.length / 8);
  for (let pitch = 2; pitch <= limit; pitch += 0.25) {
    const bins = Math.ceil(pitch * 4);
    const histogram = new Float64Array(bins);
    const baseline = new Float64Array(bins);
    for (let i = 1; i < weights.length; i++) {
      const bin = Math.round((i % pitch) * 4) % bins;
      histogram[bin] += weights[i];
      baseline[bin]++;
    }
    for (let phase = 0; phase < bins; phase++) {
      let mass = 0;
      let expected = 0;
      for (let d = -1; d <= 1; d++) {
        mass += histogram[(phase + d + bins) % bins];
        expected += baseline[(phase + d + bins) % bins];
      }
      // Positions are discrete, not uniformly distributed across quarter-pixel bins.
      // The old continuous baseline awarded arbitrary images a 0.375 score at pitch 2.
      const chance = expected / (weights.length - 1);
      const score = chance < 0.99 ? (mass / total - chance) / (1 - chance) : 0;
      if (
        score > best.score + 0.01 ||
        (score >= best.score - 0.002 && pitch > best.pitch)
      )
        best = { pitch, phase: phase / 4, score };
    }
  }
  return best.score >= 0.7 ? best : null;
}

export function detectPixelGrid(image: PixelRaster) {
  const { width, height, data } = image;
  const xs = new Float64Array(width),
    ys = new Float64Array(height);
  const step = Math.max(1, Math.floor(Math.max(width, height) / 512));
  const contrast = (a: number, b: number) => {
    const alpha = Math.abs(data[a + 3] - data[b + 3]);
    if (data[a + 3] < 24 || data[b + 3] < 24) return alpha;
    const color = Math.max(
      Math.abs(data[a] - data[b]),
      Math.abs(data[a + 1] - data[b + 1]),
      Math.abs(data[a + 2] - data[b + 2])
    );
    return Math.max(alpha, color > 20 ? color : 0);
  };
  for (let y = 0; y < height; y += step)
    for (let x = 1; x < width; x++) {
      const i = (y * width + x) * 4;
      xs[x] += contrast(i, i - 4);
    }
  for (let x = 0; x < width; x += step)
    for (let y = 1; y < height; y++) {
      const i = (y * width + x) * 4;
      ys[y] += contrast(i, i - width * 4);
    }
  return { x: axisGrid(xs), y: axisGrid(ys) };
}

function boundaries(length: number, pitch: number, phase: number) {
  const edges = [0];
  for (
    let x = phase > 0.75 ? phase : pitch + phase;
    x < length - 0.75;
    x += pitch
  ) {
    const edge = Math.round(x);
    if (edge > edges[edges.length - 1]) edges.push(edge);
  }
  edges.push(length);
  return edges;
}

function colorForBlock(
  image: PixelRaster,
  left: number,
  top: number,
  right: number,
  bottom: number
) {
  const groups = new Map<
    number,
    { n: number; r: number; g: number; b: number; a: number }
  >();
  let covered = 0;
  for (let y = top; y < bottom; y++)
    for (let x = left; x < right; x++) {
      const i = (y * image.width + x) * 4,
        a = image.data[i + 3];
      if (a < 32) continue;
      covered++;
      const r = image.data[i],
        g = image.data[i + 1],
        b = image.data[i + 2];
      const key = (r >> 4) * 256 + (g >> 4) * 16 + (b >> 4);
      const group = groups.get(key) || { n: 0, r: 0, g: 0, b: 0, a: 0 };
      group.n++;
      group.r += r;
      group.g += g;
      group.b += b;
      group.a += a;
      groups.set(key, group);
    }
  // Preserve thin and translucent details; never key colors or discard a half-empty cell.
  if (!covered) return [0, 0, 0, 0];
  const sorted = [...groups.values()].sort((a, b) => b.n - a.n);
  let chosen = sorted[0];
  const luma = (g: typeof chosen) =>
    (g.r * 0.299 + g.g * 0.587 + g.b * 0.114) / g.n;
  const dark = sorted.find(
    (g) => g.n / covered >= 0.4 && luma(g) < 65 && luma(chosen) - luma(g) > 50
  );
  if (dark) chosen = dark;
  let alpha = Math.round(chosen.a / chosen.n);
  if (alpha < 224) {
    // Snap anti-aliased contours, but keep an isolated translucent material.
    let translucentMaterial = false;
    for (let y = top; y < bottom; y++)
      for (let x = left; x < right; x++) {
        const a = image.data[(y * image.width + x) * 4 + 3];
        if (a < 32 || a >= 224) continue;
        const neighbors = [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ].map(([nx, ny]) =>
          nx >= 0 && nx < image.width && ny >= 0 && ny < image.height
            ? image.data[(ny * image.width + nx) * 4 + 3]
            : 0
        );
        // A stable translucent interior or a detached thin feature is intentional.
        if (
          neighbors.every((n) => n < 32) ||
          neighbors.every((n) => n >= 32 && n < 224 && Math.abs(n - a) <= 16)
        )
          translucentMaterial = true;
      }
    if (!translucentMaterial) alpha = alpha >= 128 ? 255 : 0;
  } else alpha = 255;
  return [
    Math.round(chosen.r / chosen.n),
    Math.round(chosen.g / chosen.n),
    Math.round(chosen.b / chosen.n),
    alpha,
  ];
}

type PaletteColor = { rgb: number[]; weight: number };

/** Remove low-contrast single-cell compression noise, never eyes, edges or transparency. */
function cleanCellNoise(
  data: Uint8ClampedArray,
  width: number,
  height: number
) {
  const source = data.slice();
  const difference = (a: number, b: number) =>
    Math.max(
      Math.abs(source[a] - source[b]),
      Math.abs(source[a + 1] - source[b + 1]),
      Math.abs(source[a + 2] - source[b + 2])
    );
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      if (source[i + 3] !== 255) continue;
      const neighbors = [i - 4, i + 4, i - width * 4, i + width * 4];
      // Avoid expanding the silhouette or erasing thin translucent materials.
      if (neighbors.some((n) => source[n + 3] !== 255)) continue;
      for (const candidate of neighbors) {
        const delta = difference(i, candidate);
        if (delta <= 8 || delta > 24) continue;
        if (neighbors.filter((n) => difference(n, candidate) <= 8).length < 3)
          continue;
        data.set(source.subarray(candidate, candidate + 3), i);
        break;
      }
    }
}

function limitPalette(
  data: Uint8ClampedArray,
  maxColors: number,
  supplied?: string[]
) {
  const colors = new Map<number, PaletteColor>();
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue;
    const key = data[i] * 65536 + data[i + 1] * 256 + data[i + 2];
    const color = colors.get(key);
    if (color) color.weight += data[i + 3] / 255;
    else
      colors.set(key, {
        rgb: [data[i], data[i + 1], data[i + 2]],
        weight: data[i + 3] / 255,
      });
  }
  let palette = supplied?.map((hex) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  );
  if (!palette && colors.size <= maxColors) return;
  if (!palette) {
    const entries = [...colors.values()];
    const luminance = (c: PaletteColor) =>
      c.rgb[0] * 0.299 + c.rgb[1] * 0.587 + c.rgb[2] * 0.114;
    // Rare bright eyes and dark outlines must not get averaged into skin/clothing.
    const ranked = [...entries].sort((a, b) => luminance(a) - luminance(b));
    const extremes = [ranked[0], ranked[ranked.length - 1]];
    // A warm lantern can be brighter than the whites of the eyes. Reserve those
    // neutral highlights separately so a global palette cannot tint them green/brown.
    const neutralHighlight = entries
      .filter(
        (c) =>
          luminance(c) > 180 && Math.max(...c.rgb) - Math.min(...c.rgb) <= 32
      )
      .sort((a, b) => b.weight - a.weight)[0];
    if (
      maxColors > 2 &&
      neutralHighlight &&
      !extremes.includes(neutralHighlight)
    )
      extremes.push(neutralHighlight);
    const boxes =
      maxColors > extremes.length
        ? [entries.filter((c) => !extremes.includes(c))]
        : [];
    const range = (box: PaletteColor[]) =>
      [0, 1, 2].map((channel) => {
        let low = 255,
          high = 0;
        for (const c of box) {
          low = Math.min(low, c.rgb[channel]);
          high = Math.max(high, c.rgb[channel]);
        }
        return high - low;
      });
    while (boxes.length < maxColors - extremes.length) {
      let selected = -1,
        best = -1;
      boxes.forEach((box, index) => {
        if (box.length < 2) return;
        const score =
          Math.max(...range(box)) *
          Math.sqrt(box.reduce((n, c) => n + c.weight, 0));
        if (score > best) {
          selected = index;
          best = score;
        }
      });
      if (selected < 0) break;
      const box = boxes[selected],
        ranges = range(box);
      const channel = ranges.indexOf(Math.max(...ranges));
      box.sort((a, b) => a.rgb[channel] - b.rgb[channel]);
      const half = box.reduce((n, c) => n + c.weight, 0) / 2;
      let weight = 0,
        split = 1;
      for (; split < box.length; split++) {
        weight += box[split - 1].weight;
        if (weight >= half) break;
      }
      split = Math.min(split, box.length - 1);
      boxes.splice(selected, 1, box.slice(0, split), box.slice(split));
    }
    palette = [
      ...extremes.map((c) => c.rgb),
      ...boxes
        .filter((box) => box.length)
        .map((box) => {
          const weight = box.reduce((n, c) => n + c.weight, 0);
          return [0, 1, 2].map((channel) =>
            Math.round(
              box.reduce((n, c) => n + c.rgb[channel] * c.weight, 0) / weight
            )
          );
        }),
    ];
  }
  const mapped = new Map<number, number[]>();
  for (const [key, color] of colors) {
    let nearest = palette[0],
      distance = Infinity;
    for (const candidate of palette) {
      const d = candidate.reduce(
        (n, v, channel) =>
          n + (v - color.rgb[channel]) ** 2 * [2, 3, 1][channel],
        0
      );
      if (d < distance) {
        nearest = candidate;
        distance = d;
      }
    }
    mapped.set(key, nearest);
  }
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) {
      data.fill(0, i, i + 4);
      continue;
    }
    data.set(mapped.get(data[i] * 65536 + data[i + 1] * 256 + data[i + 2])!, i);
  }
}

export function repairPixelImage(
  image: PixelRaster,
  options: PixelRepairOptions = {}
): PixelRepairResult {
  const { width, height, data } = image;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 4096 ||
    height > 4096 ||
    width * height > 16_000_000 ||
    data.length !== width * height * 4
  )
    throw new Error('IMAGE_TOO_LARGE');
  if (!data.some((v, i) => i % 4 === 3 && v >= 16))
    throw new Error('EMPTY_IMAGE');
  const logicalSize = Math.max(
    16,
    Math.min(
      256,
      Math.round(options.logicalSize || defaultPixelRepairOptions.logicalSize)
    )
  );
  const maxColors = Math.max(
    2,
    Math.min(
      256,
      Math.round(options.maxColors || defaultPixelRepairOptions.maxColors)
    )
  );
  const palette = pixelRepairPalette(options.palette);
  // Native sprites already use individual logical pixels. Never infer 2px from their contours.
  if (Math.max(width, height) <= Math.min(logicalSize, 128)) {
    const output = data.slice();
    limitPalette(output, maxColors, palette);
    return { width, height, data: output, pitch: 1, scale: 1, inferred: false };
  }
  const grid = detectPixelGrid(image);
  const detected = [grid.x?.pitch, grid.y?.pitch].filter(
    (v): v is number => !!v
  );
  // A small native sprite needs no artificial enlargement or loss of detail.
  const fallback = Math.max(1, Math.max(width, height) / logicalSize);
  const reliable =
    detected.length === 2 && Math.abs(detected[0] - detected[1]) < 0.3;
  const pitch = reliable ? Math.min(...detected) : fallback;
  const scale = Math.max(1, Math.round(pitch));
  const x = boundaries(width, pitch, reliable && grid.x ? grid.x.phase : 0);
  const y = boundaries(height, pitch, reliable && grid.y ? grid.y.phase : 0);
  const outW = (x.length - 1) * scale,
    outH = (y.length - 1) * scale;
  if (outW > 4096 || outH > 4096 || outW * outH > 16_000_000)
    throw new Error('IMAGE_TOO_LARGE');
  const cells = new Uint8ClampedArray((x.length - 1) * (y.length - 1) * 4);
  for (let row = 0; row < y.length - 1; row++)
    for (let col = 0; col < x.length - 1; col++) {
      const rgba = colorForBlock(image, x[col], y[row], x[col + 1], y[row + 1]);
      cells.set(rgba, (row * (x.length - 1) + col) * 4);
    }
  if (!reliable && pitch > 1) cleanCellNoise(cells, x.length - 1, y.length - 1);
  limitPalette(cells, maxColors, palette);
  const output = new Uint8ClampedArray(outW * outH * 4);
  for (let row = 0; row < y.length - 1; row++)
    for (let col = 0; col < x.length - 1; col++) {
      const rgba = cells.subarray(
        (row * (x.length - 1) + col) * 4,
        (row * (x.length - 1) + col + 1) * 4
      );
      for (let dy = 0; dy < scale; dy++)
        for (let dx = 0; dx < scale; dx++)
          output.set(rgba, ((row * scale + dy) * outW + col * scale + dx) * 4);
    }
  return {
    width: outW,
    height: outH,
    data: output,
    pitch,
    scale,
    inferred: !reliable,
  };
}
