export const generationOptionValues = {
  style: [
    'none',
    'pixel-art',
    'cartoon',
    'illustration',
    'hand-painted',
    'anime-2d',
  ],
  perspective: ['none', 'side', 'top-down', 'front', 'isometric'],
  quality: ['1k', '2k', '4k'],
  characterType: ['humanoid', 'monster', 'animal', 'robot', 'custom'],
  editType: ['pose', 'costume'],
  actionType: [
    'idle',
    'walk',
    'run',
    'jump',
    'dash',
    'attack',
    'shoot',
    'cast',
    'hurt',
    'custom',
    'pickup',
    'wave',
    'death',
  ],
  direction: ['right', 'left', 'up', 'down', 'four-way', 'eight-way'],
  frames: ['auto', '16', '25'],
  frameSize: ['64', '128', '256'],
} as const;

export type GenerationField = keyof typeof generationOptionValues;

export type GenerationOptionValue<Field extends GenerationField> =
  (typeof generationOptionValues)[Field][number];

export const animationDirectionValues = [
  'original',
  'east',
  'west',
  'north',
  'south',
] as const;

export const animationDirectionDefault = animationDirectionValues[0];

export const iconStyleValues = [
  'pixel-art',
  'hand-painted',
  'cartoon',
  'anime-2d',
  'dark-fantasy',
  'cyberpunk',
] as const;

export type IconStyleValue = (typeof iconStyleValues)[number];

export const iconStylePreviewImages: Record<IconStyleValue, string> = {
  'pixel-art': '/imgs/features/icon/style-pixel-art.webp',
  'hand-painted': '/imgs/features/icon/style-hand-painted.webp',
  cartoon: '/imgs/features/icon/style-cartoon.webp',
  'anime-2d': '/imgs/features/icon/style-anime-2d.webp',
  'dark-fantasy': '/imgs/features/icon/style-dark-fantasy.webp',
  cyberpunk: '/imgs/features/icon/style-cyberpunk.webp',
};

export function getIconStylePreviewImage(value: string) {
  return (
    iconStylePreviewImages[value as IconStyleValue] ||
    iconStylePreviewImages['pixel-art']
  );
}

export const actionTypeImages: Partial<
  Record<GenerationOptionValue<'actionType'>, string>
> = {
  idle: '/imgs/actions/idle.webp',
  walk: '/imgs/actions/walk.webp',
  run: '/imgs/actions/run.webp',
  jump: '/imgs/actions/jump.webp',
  dash: '/imgs/actions/dash.webp',
  attack: '/imgs/actions/attack.webp',
  shoot: '/imgs/actions/shoot.webp',
  cast: '/imgs/actions/cast.webp',
  hurt: '/imgs/actions/hurt.webp',
  pickup: '/imgs/actions/pickup.webp',
  wave: '/imgs/actions/wave.webp',
  death: '/imgs/actions/death.webp',
};

export function getActionTypeImage(value: string) {
  return actionTypeImages[value as GenerationOptionValue<'actionType'>];
}

export const generationDefaults = {
  style: 'none',
  perspective: 'none',
  quality: '1k',
  characterType: 'humanoid',
  editType: 'pose',
  actionType: 'idle',
  direction: 'right',
  frames: 'auto',
  frameSize: '128',
} as const;

export const CHARACTER_OUTPUT_ASPECT_RATIO = '1024x1024';

export const generationQualityAspectRatio = {
  '1k': '1024x1024',
  '2k': '2048x2048',
  '4k': '2880x2880',
} as const;

export function resolveGenerationAspectRatio(quality?: string) {
  if (quality && quality in generationQualityAspectRatio) {
    return generationQualityAspectRatio[
      quality as GenerationOptionValue<'quality'>
    ];
  }
  return generationQualityAspectRatio[generationDefaults.quality];
}

export function getGenerationOptionLabel(
  field: GenerationField,
  value: string,
  t: (key: string) => string
) {
  if (field === 'frames' && /^\d+$/.test(value)) return value;
  if (field === 'frameSize') return `${value}×${value}`;
  return t(`options.${field}.${value}`);
}

export function mapGenerationOptions(
  field: GenerationField,
  t: (key: string) => string
) {
  return generationOptionValues[field].map((value) => ({
    value,
    label: getGenerationOptionLabel(field, value, t),
  }));
}

export function mapIconStyleOptions(t: (key: string) => string) {
  return iconStyleValues.map((value) => ({
    value,
    label: getGenerationOptionLabel('style', value, t),
  }));
}
