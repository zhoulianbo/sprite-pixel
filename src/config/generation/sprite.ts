export const SPRITE_DIRECTIONS = {
  4: ['north', 'east', 'south', 'west'],
  8: [
    'north',
    'north_east',
    'east',
    'south_east',
    'south',
    'south_west',
    'west',
    'north_west',
  ],
} as const;

export type SpriteDirection = (typeof SPRITE_DIRECTIONS)[8][number];

export const SPRITE_DIRECTION_VALUES = SPRITE_DIRECTIONS[8];

export const DIRECTION_PAD_ORDER: Array<SpriteDirection | null> = [
  'north_west',
  'north',
  'north_east',
  'west',
  null,
  'east',
  'south_west',
  'south',
  'south_east',
];

const DIRECTION_MIRROR_PAIR: Partial<Record<SpriteDirection, SpriteDirection>> =
  {
    east: 'west',
    west: 'east',
    north_east: 'north_west',
    north_west: 'north_east',
    south_east: 'south_west',
    south_west: 'south_east',
  };

const DIRECTION_GENERATE_SOURCE: Partial<
  Record<SpriteDirection, SpriteDirection>
> = {
  west: 'east',
  north_west: 'north_east',
  south_west: 'south_east',
};

export function isSpriteDirection(value: string): value is SpriteDirection {
  return (SPRITE_DIRECTION_VALUES as readonly string[]).includes(value);
}

export function directionMirrorOf(direction: string) {
  return isSpriteDirection(direction)
    ? DIRECTION_MIRROR_PAIR[direction]
    : undefined;
}

export function directionGenerateSource(direction: string) {
  if (!isSpriteDirection(direction)) return direction;
  return DIRECTION_GENERATE_SOURCE[direction] || direction;
}

export function linkedDirections(direction: string) {
  if (!isSpriteDirection(direction)) return [direction];
  const pair = DIRECTION_MIRROR_PAIR[direction];
  return pair ? [direction, pair] : [direction];
}

export function toggleLinkedDirections(
  selected: readonly string[],
  direction: string
) {
  const enabled = selected.includes(direction);
  const next = new Set(selected);
  for (const item of linkedDirections(direction)) {
    if (enabled) next.delete(item);
    else next.add(item);
  }
  const resolved = SPRITE_DIRECTION_VALUES.filter((item) => next.has(item));
  return resolved.length ? resolved : [...selected];
}

export function uniqueDirectionSources(selected: readonly string[]) {
  const sources = new Set(
    selected
      .map((item) => directionGenerateSource(item))
      .filter(isSpriteDirection)
  );
  return SPRITE_DIRECTION_VALUES.filter((item) => sources.has(item));
}

export function resolveDirectionSelection(values?: readonly string[]) {
  const next = new Set<SpriteDirection>();
  for (const value of values || []) {
    for (const item of linkedDirections(value)) {
      if (isSpriteDirection(item)) next.add(item);
    }
  }
  const selected = SPRITE_DIRECTION_VALUES.filter((item) => next.has(item));
  return {
    selected,
    sources: uniqueDirectionSources(selected),
  };
}

export type ProductGenerationStatus =
  'pending' | 'processing' | 'success' | 'partial' | 'failed';

export function aggregateGenerationStatus(
  statuses: string[]
): ProductGenerationStatus {
  if (statuses.some((status) => ['pending', 'processing'].includes(status))) {
    return 'processing';
  }
  const succeeded = statuses.filter((status) => status === 'success').length;
  const failed = statuses.filter((status) =>
    ['failed', 'canceled', 'postprocessing_failed'].includes(status)
  ).length;
  if (succeeded === statuses.length && statuses.length > 0) return 'success';
  if (succeeded > 0) return 'partial';
  if (failed > 0) return 'failed';
  return 'pending';
}

export const animationAutoFrameCounts = {
  idle: 4,
  walk: 8,
  run: 8,
  attack: 6,
  jump: 6,
  hurt: 4,
  death: 8,
  custom: 6,
} as const;

export function resolveAnimationFrameCount(
  frames: number | 'auto' | undefined,
  action?: string
) {
  if (typeof frames === 'number' && Number.isFinite(frames) && frames > 0) {
    return frames;
  }
  const key = (
    action || ''
  ).toLowerCase() as keyof typeof animationAutoFrameCounts;
  return animationAutoFrameCounts[key] ?? animationAutoFrameCounts.custom;
}

export function resolveAnimationGrid(
  frames: number | 'auto' | undefined,
  action?: string
) {
  const frameCount = resolveAnimationFrameCount(frames, action);
  let columns = Math.min(frameCount, 4);
  let rows = Math.ceil(frameCount / columns);
  if (rows === 1 && columns > 3) {
    columns = Math.ceil(Math.sqrt(frameCount));
    rows = Math.ceil(frameCount / columns);
  }
  return { frameCount, columns, rows };
}

export function resolveAnimationSheetSize(
  frames: number | 'auto' | undefined,
  frameSize?: number | string,
  action?: string
) {
  const cell = Number(frameSize);
  const size = Number.isFinite(cell) && cell > 0 ? cell : 64;
  const grid = resolveAnimationGrid(frames, action);
  const width = grid.columns * size;
  const height = grid.rows * size;
  return {
    ...grid,
    frameSize: size,
    width,
    height,
    aspectRatio: `${width}x${height}`,
  };
}

export const GPT_IMAGE_SIZE_LIMITS = {
  minPixels: 655_360,
  maxPixels: 8_294_400,
  maxEdge: 3840,
  maxRatio: 3,
  multiple: 16,
} as const;

export function isValidGptImagePixelSize(width: number, height: number) {
  const pixels = width * height;
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  return (
    width > 0 &&
    height > 0 &&
    width % GPT_IMAGE_SIZE_LIMITS.multiple === 0 &&
    height % GPT_IMAGE_SIZE_LIMITS.multiple === 0 &&
    long <= GPT_IMAGE_SIZE_LIMITS.maxEdge &&
    pixels >= GPT_IMAGE_SIZE_LIMITS.minPixels &&
    pixels <= GPT_IMAGE_SIZE_LIMITS.maxPixels &&
    long / short <= GPT_IMAGE_SIZE_LIMITS.maxRatio
  );
}

export function fitGptImagePixelSize(width: number, height: number) {
  const baseW = Math.max(1, Math.round(width));
  const baseH = Math.max(1, Math.round(height));
  let scale = 1;
  while (scale <= GPT_IMAGE_SIZE_LIMITS.maxEdge) {
    const nextW = baseW * scale;
    const nextH = baseH * scale;
    if (
      nextW > GPT_IMAGE_SIZE_LIMITS.maxEdge ||
      nextH > GPT_IMAGE_SIZE_LIMITS.maxEdge
    ) {
      break;
    }
    if (isValidGptImagePixelSize(nextW, nextH)) {
      return {
        width: nextW,
        height: nextH,
        scale,
        aspectRatio: `${nextW}x${nextH}`,
      };
    }
    scale += 1;
  }
  return {
    width: 1024,
    height: 1024,
    scale: 0,
    aspectRatio: '1024x1024',
  };
}

export function resolveProviderAnimationSheetSize(
  frames: number | 'auto' | undefined,
  frameSize?: number | string,
  action?: string
) {
  const sheet = resolveAnimationSheetSize(frames, frameSize, action);
  const provider = fitGptImagePixelSize(sheet.width, sheet.height);
  return { ...sheet, provider };
}
