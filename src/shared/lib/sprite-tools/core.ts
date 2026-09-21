export const LIMITS = {
  bytes: 50 * 1024 * 1024,
  frames: 256,
  pixels: 32_000_000,
  imagePixels: 16_000_000,
  edge: 8192,
} as const;

export type Tool = 'maker' | 'splitter';
export function toolPath(tool: Tool) {
  return tool === 'maker' ? '/sprite-sheet-maker' : '/sprite-sheet-cutter';
}
export type Size = { width: number; height: number };
export type Rect = Size & { x: number; y: number };
export type Frame = Size & {
  id: string;
  name: string;
  blob: Blob;
  duration: number;
  originalIndex: number;
  empty?: boolean;
  trim?: { x: number; y: number; sourceW: number; sourceH: number };
};
export type MakerOptions = {
  layout: 'grid' | 'horizontal' | 'vertical';
  columns: number;
  padding: number;
  gap: number;
  align: 'bottom' | 'center' | 'top-left';
  background: string;
  trim?: boolean;
};
export type SliceOptions = {
  mode: 'count' | 'size';
  columns: number;
  rows: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  gapX: number;
  gapY: number;
  trimRight?: number;
  trimBottom?: number;
};
export const defaultMaker: MakerOptions = {
  layout: 'grid',
  columns: 4,
  padding: 0,
  gap: 0,
  align: 'bottom',
  background: '',
};

/** Pick grid columns so the sheet is at least as wide as tall (columns ≥ rows). */
export function suggestMakerGridColumns(frameCount: number): number {
  if (!Number.isInteger(frameCount) || frameCount < 1) {
    return defaultMaker.columns;
  }
  if (frameCount === 1) return 1;

  let bestColumns = 1;
  let bestScore = Infinity;

  for (let columns = 1; columns <= frameCount; columns++) {
    const rows = Math.ceil(frameCount / columns);
    if (columns < rows) continue;
    const score = Math.abs(columns - rows);
    if (score < bestScore || (score === bestScore && columns < bestColumns)) {
      bestScore = score;
      bestColumns = columns;
    }
  }

  return bestColumns;
}
export const defaultSlice: SliceOptions = {
  mode: 'count',
  columns: 4,
  rows: 4,
  width: 32,
  height: 32,
  offsetX: 0,
  offsetY: 0,
  gapX: 0,
  gapY: 0,
};

export type SpriteSheetSliceHints = {
  columns?: number;
  rows?: number;
  frameCount?: number;
  preferredFrameSize?: number;
};

const AUTO_GRID_FRAME_COUNTS = [4, 6, 8, 12, 16, 24, 25, 32] as const;

function positiveInteger(value: number | undefined) {
  return Number.isInteger(value) && Number(value) > 0
    ? Number(value)
    : undefined;
}

function automaticGrid(size: Size, preferredFrameSize: number) {
  if (
    size.width % preferredFrameSize === 0 &&
    size.height % preferredFrameSize === 0
  ) {
    const columns = size.width / preferredFrameSize;
    const rows = size.height / preferredFrameSize;
    if (columns * rows >= 2 && columns * rows <= LIMITS.frames) {
      return { columns, rows };
    }
  }

  const ratio = size.width / size.height;
  const candidates = AUTO_GRID_FRAME_COUNTS.flatMap((frameCount) =>
    Array.from({ length: frameCount }, (_, index) => index + 1)
      .filter((columns) => frameCount % columns === 0)
      .map((columns) => {
        const rows = frameCount / columns;
        const cellWidth = size.width / columns;
        const cellHeight = size.height / rows;
        const squareError = Math.abs(Math.log(cellWidth / cellHeight));
        const ratioError = Math.abs(Math.log(columns / rows / ratio));
        const integerError =
          (Math.abs(cellWidth - Math.round(cellWidth)) +
            Math.abs(cellHeight - Math.round(cellHeight))) /
          Math.max(1, Math.min(cellWidth, cellHeight));
        const countBias = Math.abs(frameCount - 8) / 80;
        return {
          columns,
          rows,
          score: squareError * 4 + ratioError * 2 + integerError + countBias,
        };
      })
  );
  candidates.sort((a, b) => a.score - b.score);
  return candidates[0] || { columns: 1, rows: 1 };
}

/**
 * Resolve one regular sprite-sheet grid for both generated previews and the
 * browser cutter. Explicit generation metadata wins; otherwise the image
 * dimensions provide an editable best-effort estimate around 128px cells.
 */
export function resolveSpriteSheetSlice(
  size: Size,
  hints: SpriteSheetSliceHints = {}
) {
  checkSize(size);
  const hintedColumns = positiveInteger(hints.columns);
  const hintedRows = positiveInteger(hints.rows);
  const preferredFrameSize = positiveInteger(hints.preferredFrameSize) || 128;
  const inferred =
    hintedColumns && hintedRows
      ? { columns: hintedColumns, rows: hintedRows }
      : automaticGrid(size, preferredFrameSize);
  const options: SliceOptions = {
    ...defaultSlice,
    mode: 'count',
    columns: inferred.columns,
    rows: inferred.rows,
  };
  const grid = sliceGrid(size, options);
  const requestedFrameCount = positiveInteger(hints.frameCount);
  const frameCount = Math.min(
    requestedFrameCount || grid.rects.length,
    grid.rects.length
  );
  return {
    options,
    grid,
    rects: grid.rects.slice(0, frameCount),
    frameCount,
  };
}
export function checkSize({ width, height }: Size) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1
  )
    throw new Error('invalidGrid');
  if (
    width > LIMITS.edge ||
    height > LIMITS.edge ||
    width * height > LIMITS.imagePixels
  )
    throw new Error('imageLimit');
}
export function checkFrames(frames: Size[]) {
  if (!frames.length) throw new Error('empty');
  if (frames.length > LIMITS.frames) throw new Error('frameLimit');
  let pixels = 0;
  frames.forEach((frame) => {
    checkSize(frame);
    pixels += frame.width * frame.height;
  });
  if (pixels > LIMITS.pixels) throw new Error('pixelLimit');
}
function nonnegative(...values: number[]) {
  if (values.some((value) => !Number.isInteger(value) || value < 0))
    throw new Error('invalidGrid');
}
export function naturalSort<T extends { name: string }>(frames: T[]) {
  return [...frames].sort((a, b) =>
    a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' })
  );
}
export function packFrames(frames: Size[], options: MakerOptions) {
  checkFrames(frames);
  nonnegative(options.padding, options.gap);
  if (!Number.isInteger(options.columns) || options.columns < 1)
    throw new Error('invalidGrid');
  const cellWidth = Math.max(...frames.map((f) => f.width));
  const cellHeight = Math.max(...frames.map((f) => f.height));
  const columns =
    options.layout === 'horizontal'
      ? frames.length
      : options.layout === 'vertical'
        ? 1
        : Math.min(options.columns, frames.length);
  const rows = Math.ceil(frames.length / columns);
  const width =
    options.padding * 2 + columns * cellWidth + (columns - 1) * options.gap;
  const height =
    options.padding * 2 + rows * cellHeight + (rows - 1) * options.gap;
  checkSize({ width, height });
  const cells: Rect[] = frames.map((_, index) => ({
    x: options.padding + (index % columns) * (cellWidth + options.gap),
    y:
      options.padding +
      Math.floor(index / columns) * (cellHeight + options.gap),
    width: cellWidth,
    height: cellHeight,
  }));
  const rects = frames.map((frame, index) => ({
    ...frame,
    x:
      cells[index].x +
      (options.align === 'top-left'
        ? 0
        : Math.floor((cellWidth - frame.width) / 2)),
    y:
      cells[index].y +
      (options.align === 'bottom'
        ? cellHeight - frame.height
        : options.align === 'center'
          ? Math.floor((cellHeight - frame.height) / 2)
          : 0),
  }));
  return { width, height, columns, rows, cellWidth, cellHeight, cells, rects };
}
export function sliceGrid(size: Size, options: SliceOptions) {
  checkSize(size);
  nonnegative(
    options.offsetX,
    options.offsetY,
    options.gapX,
    options.gapY,
    options.trimRight ?? 0,
    options.trimBottom ?? 0
  );
  const availableWidth =
    size.width - options.offsetX - (options.trimRight ?? 0);
  const availableHeight =
    size.height - options.offsetY - (options.trimBottom ?? 0);
  if (availableWidth < 1 || availableHeight < 1) throw new Error('bounds');
  let { columns, rows, width, height } = options;
  if (options.mode === 'count') {
    if (![columns, rows].every((n) => Number.isInteger(n) && n > 0))
      throw new Error('invalidGrid');
    width = Math.floor(
      (availableWidth - (columns - 1) * options.gapX) / columns
    );
    height = Math.floor((availableHeight - (rows - 1) * options.gapY) / rows);
  } else {
    checkSize({ width, height });
    columns = Math.floor(
      (availableWidth + options.gapX) / (width + options.gapX)
    );
    rows = Math.floor(
      (availableHeight + options.gapY) / (height + options.gapY)
    );
  }
  if (columns < 1 || rows < 1 || width < 1 || height < 1)
    throw new Error('bounds');
  if (columns * rows > LIMITS.frames) throw new Error('frameLimit');
  const usedWidth = columns * width + (columns - 1) * options.gapX;
  const usedHeight = rows * height + (rows - 1) * options.gapY;
  if (usedWidth > availableWidth || usedHeight > availableHeight)
    throw new Error('bounds');
  const rects = Array.from({ length: columns * rows }, (_, index) => ({
    x: options.offsetX + (index % columns) * (width + options.gapX),
    y: options.offsetY + Math.floor(index / columns) * (height + options.gapY),
    width,
    height,
  }));
  checkFrames(rects);
  return {
    columns,
    rows,
    width,
    height,
    rects,
    remainderX: availableWidth - usedWidth,
    remainderY: availableHeight - usedHeight,
  };
}
export function frameFilename(index: number, name: string) {
  const clean =
    name
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .slice(0, 64) || 'frame';
  return `${String(index + 1).padStart(3, '0')}-${clean}.png`;
}
export const ATLAS_FORMATS = [
  'jsonHash',
  'jsonArray',
  'css',
  'xml',
  'gif',
] as const;
export type AtlasFormat = (typeof ATLAS_FORMATS)[number];
export const ATLAS_FORMAT_LABELS = {
  jsonHash: 'formatJsonHash',
  jsonArray: 'formatJsonArray',
  css: 'formatCss',
  xml: 'formatXml',
  gif: 'formatGif',
} as const;
function atlasTrim(frame: Frame) {
  if (!frame.trim) {
    return {
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: frame.width, h: frame.height },
      sourceSize: { w: frame.width, h: frame.height },
    };
  }
  const trimmed =
    frame.trim.x !== 0 ||
    frame.trim.y !== 0 ||
    frame.trim.sourceW !== frame.width ||
    frame.trim.sourceH !== frame.height;
  return {
    trimmed,
    spriteSourceSize: {
      x: frame.trim.x,
      y: frame.trim.y,
      w: frame.width,
      h: frame.height,
    },
    sourceSize: { w: frame.trim.sourceW, h: frame.trim.sourceH },
  };
}
export function createAtlas(
  frames: Frame[],
  pack: ReturnType<typeof packFrames>,
  fps: number | null
) {
  return {
    frames: Object.fromEntries(
      frames.map((frame, index) => [
        frameFilename(index, frame.name),
        {
          frame: {
            x: pack.rects[index].x,
            y: pack.rects[index].y,
            w: frame.width,
            h: frame.height,
          },
          rotated: false,
          ...atlasTrim(frame),
          duration: fps ? Math.round(1000 / fps) : frame.duration,
        },
      ])
    ),
    meta: {
      app: 'SpritePixel',
      version: '1.0',
      image: 'sprite-sheet.png',
      format: 'RGBA8888',
      size: { w: pack.width, h: pack.height },
      scale: '1',
      frameOrder: frames.map((frame, index) =>
        frameFilename(index, frame.name)
      ),
    },
  };
}
export function createAtlasArray(
  frames: Frame[],
  pack: ReturnType<typeof packFrames>,
  fps: number | null
) {
  const atlas = createAtlas(frames, pack, fps);
  return {
    frames: atlas.meta.frameOrder.map((filename) => ({
      filename,
      ...atlas.frames[filename],
    })),
    meta: atlas.meta,
  };
}
function cssIdent(filename: string) {
  return `sprite-${filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-')}`;
}
export function createCssAtlas(
  frames: Frame[],
  pack: ReturnType<typeof packFrames>
) {
  const atlas = createAtlas(frames, pack, null);
  const rules = [
    '.sprite { display: inline-block; background-image: url(sprite-sheet.png); background-repeat: no-repeat; }',
  ];
  for (const filename of atlas.meta.frameOrder) {
    const { frame } = atlas.frames[filename];
    rules.push(
      `.${cssIdent(filename)} { width: ${frame.w}px; height: ${frame.h}px; background-position: -${frame.x}px -${frame.y}px; }`
    );
  }
  return `${rules.join('\n')}\n`;
}
function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
export function createXmlAtlas(
  frames: Frame[],
  pack: ReturnType<typeof packFrames>
) {
  const atlas = createAtlas(frames, pack, null);
  const subs = atlas.meta.frameOrder.map((filename) => {
    const { frame } = atlas.frames[filename];
    return `  <SubTexture name="${xmlEscape(filename)}" x="${frame.x}" y="${frame.y}" width="${frame.w}" height="${frame.h}"/>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<TextureAtlas imagePath="sprite-sheet.png" width="${pack.width}" height="${pack.height}">\n${subs.join('\n')}\n</TextureAtlas>\n`;
}
export function isTransparent(data: Uint8ClampedArray) {
  for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) return false;
  return true;
}
export function isEffectivelyTransparent(
  data: Uint8ClampedArray,
  maximumOpaqueCoverage = 0.0005
) {
  const pixels = Math.floor(data.length / 4);
  if (!pixels) return true;
  let alphaTotal = 0;
  const maximumAlphaTotal = pixels * maximumOpaqueCoverage * 255;
  for (let index = 3; index < data.length; index += 4) {
    alphaTotal += data[index];
    if (alphaTotal >= maximumAlphaTotal) return false;
  }
  return true;
}
export function trimBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Rect {
  if (data.length !== width * height * 4) throw new Error('invalidImage');
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return { x: 0, y: 0, width: 1, height: 1 };
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}
