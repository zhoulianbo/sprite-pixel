import {
  chooseAnimationBackground,
  hasTransparentBackground,
} from './animation-background';

export type CharacterComposition = { x: number; y: number; scale: number };
export const DEFAULT_COMPOSITION: CharacterComposition = {
  x: 50,
  y: 50,
  scale: 72,
};
export const COMPOSITION_INSET = 8;

/** Scale is a percentage of the safe area's longest edge, for every aspect ratio. */
export function clampCharacterComposition(
  value: CharacterComposition,
  aspect: number
) {
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const scale = Math.max(
    10,
    Math.min(100, Number.isFinite(value.scale) ? value.scale : 72)
  );
  const edge = ((100 - COMPOSITION_INSET * 2) * scale) / 100;
  const width = ratio >= 1 ? edge : edge * ratio;
  const height = ratio >= 1 ? edge / ratio : edge;
  const clamp = (n: number, half: number) =>
    Math.max(
      COMPOSITION_INSET + half,
      Math.min(100 - COMPOSITION_INSET - half, Number.isFinite(n) ? n : 50)
    );
  return {
    x: clamp(value.x, width / 2),
    y: clamp(value.y, height / 2),
    scale,
    width,
    height,
  };
}

/** Remove only fully transparent outer padding; preserve every visible alpha value. */
export async function loadCompositionImage(url: string) {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = url;
  await image.decode();
  const source = document.createElement('canvas');
  source.width = image.naturalWidth;
  source.height = image.naturalHeight;
  const context = source.getContext('2d')!;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, source.width, source.height).data;
  let left = source.width,
    top = source.height,
    right = -1,
    bottom = -1;
  for (let y = 0; y < source.height; y++)
    for (let x = 0; x < source.width; x++) {
      if (pixels[(y * source.width + x) * 4 + 3] > 0) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  if (right < left) throw new Error('INVALID_IMAGE');
  const cropped = document.createElement('canvas');
  cropped.width = right - left + 1;
  cropped.height = bottom - top + 1;
  cropped
    .getContext('2d')!
    .drawImage(
      source,
      left,
      top,
      cropped.width,
      cropped.height,
      0,
      0,
      cropped.width,
      cropped.height
    );
  return {
    canvas: cropped,
    background: hasTransparentBackground(pixels, source.width, source.height)
      ? chooseAnimationBackground(pixels)
      : undefined,
  };
}
