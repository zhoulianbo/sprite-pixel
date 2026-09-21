import { checkSize } from './core';

/** Inspect dimensions before asking the browser to allocate a decoded image. */
export function imageInfo(buffer: ArrayBuffer) {
  const b = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...b.subarray(start, start + length));
  let width = 0;
  let height = 0;
  let mime = '';
  if (b.length >= 24 && ascii(1, 3) === 'PNG' && b[0] === 137) {
    width = view.getUint32(16);
    height = view.getUint32(20);
    mime = 'image/png';
    for (let i = 8; i + 12 <= b.length;) {
      const length = view.getUint32(i);
      if (ascii(i + 4, 4) === 'acTL') throw new Error('staticOnly');
      i += length + 12;
    }
  } else if (
    b.length >= 30 &&
    ascii(0, 4) === 'RIFF' &&
    ascii(8, 4) === 'WEBP'
  ) {
    mime = 'image/webp';
    const tag = ascii(12, 4);
    if (tag === 'VP8X') {
      if (b[20] & 2) throw new Error('staticOnly');
      width = 1 + b[24] + (b[25] << 8) + (b[26] << 16);
      height = 1 + b[27] + (b[28] << 8) + (b[29] << 16);
    } else if (tag === 'VP8L' && b[20] === 0x2f) {
      const bits = view.getUint32(21, true);
      width = 1 + (bits & 0x3fff);
      height = 1 + ((bits >>> 14) & 0x3fff);
    } else if (
      tag === 'VP8 ' &&
      b[23] === 0x9d &&
      b[24] === 1 &&
      b[25] === 0x2a
    ) {
      width = view.getUint16(26, true) & 0x3fff;
      height = view.getUint16(28, true) & 0x3fff;
    }
  } else if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    mime = 'image/jpeg';
    for (let i = 2; i + 4 <= b.length;) {
      if (b[i] !== 0xff) break;
      while (b[i] === 0xff) i++;
      const marker = b[i++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (i + 2 > b.length) break;
      const length = view.getUint16(i);
      if (length < 2 || i + length > b.length) break;
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker) &&
        length >= 8
      ) {
        height = view.getUint16(i + 3);
        width = view.getUint16(i + 5);
        break;
      }
      i += length;
    }
  }
  if (!width || !height || !mime) throw new Error('invalidImage');
  checkSize({ width, height });
  return { width, height, mime };
}
