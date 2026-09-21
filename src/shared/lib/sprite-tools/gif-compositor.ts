import { checkSize } from './core';

export type GifPatch = {
  dims: { left: number; top: number; width: number; height: number };
  patch: Uint8ClampedArray;
  disposalType: number;
  transparentIndex?: number;
};

/** Composite patches before disposal; previous disposal applies before the next frame. */
export function createGifCompositor(
  width: number,
  height: number,
  background: number[]
) {
  checkSize({ width, height });
  const pixels = new Uint8ClampedArray(width * height * 4);
  let previous: GifPatch | undefined;
  let restore: Uint8ClampedArray | undefined;
  return (frame: GifPatch) => {
    const { left, top, width: w, height: h } = frame.dims;
    if (
      left < 0 ||
      top < 0 ||
      left + w > width ||
      top + h > height ||
      frame.patch.length !== w * h * 4
    )
      throw new Error('invalidImage');
    if (!previous && frame.transparentIndex === undefined) {
      for (let i = 0; i < pixels.length; i += 4) pixels.set(background, i);
    }
    if (previous?.disposalType === 2) {
      const d = previous.dims;
      const color =
        previous.transparentIndex !== undefined ? [0, 0, 0, 0] : background;
      for (let y = d.top; y < d.top + d.height; y++) {
        for (let x = d.left; x < d.left + d.width; x++)
          pixels.set(color, (y * width + x) * 4);
      }
    } else if (previous?.disposalType === 3 && restore) pixels.set(restore);
    restore = frame.disposalType === 3 ? pixels.slice() : undefined;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const source = (y * w + x) * 4;
        if (frame.patch[source + 3])
          pixels.set(
            frame.patch.subarray(source, source + 4),
            ((top + y) * width + left + x) * 4
          );
      }
    }
    // Retain only disposal metadata, not the decoded patch.
    previous = { ...frame, patch: new Uint8ClampedArray() };
    return pixels.slice();
  };
}
