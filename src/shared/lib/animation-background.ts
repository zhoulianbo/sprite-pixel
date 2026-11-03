import { ANIMATION_KEY_COLORS } from '../../config/generation/animation-background';

const rgb = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

export function chooseAnimationBackground(
  pixels: Uint8ClampedArray,
  override?: string
) {
  if (override && !/^#[0-9a-fA-F]{6}$/.test(override))
    throw new Error('INVALID_IMAGE');
  const colors = new Set<number>();
  let visible = 0;
  let translucent = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 16) continue;
    visible++;
    if (pixels[i + 3] < 240) translucent++;
    colors.add(
      ((pixels[i] >> 4) << 8) |
        ((pixels[i + 1] >> 4) << 4) |
        (pixels[i + 2] >> 4)
    );
  }
  if (!colors.size) throw new Error('INVALID_IMAGE');
  const candidates = override ? [override] : ANIMATION_KEY_COLORS;
  let best = { backgroundColor: candidates[0] as string, distance: -1 };
  for (const color of candidates) {
    const candidate = rgb(color);
    let distance = Infinity;
    for (const bin of colors) {
      const source = [
        (bin >> 8) * 16 + 8,
        ((bin >> 4) & 15) * 16 + 8,
        (bin & 15) * 16 + 8,
      ];
      distance = Math.min(
        distance,
        Math.hypot(...source.map((c, i) => c - candidate[i]))
      );
    }
    if (distance > best.distance) best = { backgroundColor: color, distance };
  }
  // Binning can overestimate the distance by up to 14 RGB units.
  return {
    backgroundColor: best.backgroundColor,
    // Smoke, glass and other substantial translucent regions need soft segmentation.
    backgroundKeySafe: best.distance >= 100 && translucent / visible < 0.05,
  };
}

/** Require transparent canvas space, not merely a slightly translucent character. */
export function hasTransparentBackground(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
) {
  let transparent = 0,
    borderTransparent = 0,
    borderCount = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const clear = pixels[(y * width + x) * 4 + 3] <= 8;
      if (clear) transparent++;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        borderCount++;
        if (clear) borderTransparent++;
      }
    }
  return (
    transparent >= width * height * 0.01 &&
    borderTransparent >= borderCount * 0.25
  );
}
