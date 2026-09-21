/** Hand-authored GIF fixture: fixed 3-bit LZW codes reset before each pixel. */
export function gifFixture() {
  const bytes: number[] = [];
  const word = (n: number) => [n & 255, n >> 8];
  bytes.push(
    ...Buffer.from('GIF89a'),
    ...word(3),
    ...word(2),
    0x81,
    0,
    0,
    0,
    0,
    0,
    255,
    0,
    0,
    0,
    255,
    0,
    0,
    0,
    255
  );
  const frames = [
    {
      x: 0,
      y: 0,
      w: 3,
      h: 2,
      pixels: [1, 1, 1, 0, 0, 0],
      delay: 10,
      disposal: 1,
    },
    { x: 1, y: 0, w: 1, h: 1, pixels: [2], delay: 20, disposal: 2 },
    { x: 2, y: 1, w: 1, h: 1, pixels: [3], delay: 30, disposal: 3 },
    { x: 0, y: 1, w: 1, h: 1, pixels: [2], delay: 40, disposal: 1 },
  ];
  for (const f of frames) {
    bytes.push(0x21, 0xf9, 4, (f.disposal << 2) | 1, ...word(f.delay), 0, 0);
    bytes.push(
      0x2c,
      ...word(f.x),
      ...word(f.y),
      ...word(f.w),
      ...word(f.h),
      0,
      2
    );
    const codes = f.pixels.flatMap((pixel) => [4, pixel]).concat(5);
    const compressed: number[] = [];
    let value = 0;
    let bits = 0;
    for (const code of codes) {
      value |= code << bits;
      bits += 3;
      while (bits >= 8) {
        compressed.push(value & 255);
        value >>= 8;
        bits -= 8;
      }
    }
    if (bits) compressed.push(value & 255);
    bytes.push(compressed.length, ...compressed, 0);
  }
  return new Uint8Array([...bytes, 0x3b]);
}
