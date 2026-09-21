import { checkFrames, checkSize, LIMITS } from './core';
import { createGifCompositor } from './gif-compositor';

const worker = self as unknown as {
  onmessage: ((event: MessageEvent<ArrayBuffer>) => void) | null;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};
worker.onmessage = async ({ data }) => {
  try {
    if (data.byteLength > LIMITS.bytes) throw new Error('fileLimit');
    const { parseGIF, decompressFrame } = await import('gifuct-js');
    // Header check occurs before parsing/decompressing large frame data.
    const bytes = new Uint8Array(data);
    if (
      bytes.length < 13 ||
      String.fromCharCode(...bytes.subarray(0, 6)).match(/^GIF8[79]a$/) === null
    )
      throw new Error('invalidImage');
    const size = {
      width: bytes[6] | (bytes[7] << 8),
      height: bytes[8] | (bytes[9] << 8),
    };
    checkSize(size);
    const gif = parseGIF(data);
    const images = gif.frames.filter((frame) => 'image' in frame);
    checkFrames(images.map(() => size));
    for (const image of images) {
      const descriptor = image.image.descriptor;
      checkSize(descriptor);
      if (
        descriptor.left + descriptor.width > size.width ||
        descriptor.top + descriptor.height > size.height
      )
        throw new Error('invalidImage');
    }
    const color = gif.gct?.[gif.lsd.backgroundColorIndex];
    const compose = createGifCompositor(
      size.width,
      size.height,
      color ? [...color, 255] : [0, 0, 0, 0]
    );
    for (let index = 0; index < images.length; index++) {
      const decoded = decompressFrame(images[index], gif.gct, true);
      const pixels = compose(decoded);
      worker.postMessage(
        {
          type: 'frame',
          index,
          total: images.length,
          ...size,
          duration: decoded.delay > 0 ? decoded.delay : 100,
          pixels: pixels.buffer,
        },
        [pixels.buffer]
      );
    }
    worker.postMessage({ type: 'done' });
  } catch (error) {
    worker.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'invalidImage',
    });
  }
};
