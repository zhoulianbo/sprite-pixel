import {
  AtlasFormat,
  checkFrames,
  checkSize,
  createAtlas,
  createAtlasArray,
  createCssAtlas,
  createXmlAtlas,
  Frame,
  frameFilename,
  isEffectivelyTransparent,
  isTransparent,
  LIMITS,
  MakerOptions,
  packFrames,
  Rect,
  trimBounds,
} from './core';
import { encodeAnimatedGif } from './gif-encoder';
import { imageInfo } from './image-info';

export const abortCheck = (signal: AbortSignal) => {
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
};
export function makeCanvas(width: number, height: number) {
  checkSize({ width, height });
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('canvasError');
  context.imageSmoothingEnabled = false;
  return { canvas, context };
}
export function pngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('exportError'))),
      'image/png'
    )
  );
}
export async function readImages(
  files: File[],
  existing: Frame[],
  signal: AbortSignal,
  progress: (done: number, total: number) => void
) {
  if (!files.length) throw new Error('empty');
  if (files.reduce((n, f) => n + f.size, 0) > LIMITS.bytes)
    throw new Error('fileLimit');
  if (files.length + existing.length > LIMITS.frames)
    throw new Error('frameLimit');
  const result: Frame[] = [];
  for (let i = 0; i < files.length; i++) {
    abortCheck(signal);
    const file = files[i];
    const buffer = await file.arrayBuffer();
    abortCheck(signal);
    const info = imageInfo(buffer);
    checkFrames([...existing, ...result, info]);
    const blob = new Blob([buffer], { type: info.mime });
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(blob);
    } catch {
      throw new Error('invalidImage');
    }
    try {
      abortCheck(signal);
      const frame = {
        id: crypto.randomUUID(),
        name: file.name,
        width: bitmap.width,
        height: bitmap.height,
        blob,
        duration: 1000 / 12,
        originalIndex: existing.length + i,
      };
      checkFrames([...existing, ...result, frame]);
      result.push(frame);
    } finally {
      bitmap.close();
    }
    progress(i + 1, files.length);
  }
  return result;
}
export async function readGif(
  file: File,
  signal: AbortSignal,
  progress: (done: number, total: number) => void
): Promise<Frame[]> {
  if (file.size > LIMITS.bytes) throw new Error('fileLimit');
  const buffer = await file.arrayBuffer();
  abortCheck(signal);
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./gif.worker.ts', import.meta.url));
    const frames: Frame[] = [];
    let finished = false;
    let chain = Promise.resolve();
    const finish = (error?: unknown) => {
      if (finished) return;
      finished = true;
      worker.terminate();
      signal.removeEventListener('abort', cancel);
      if (error) reject(error);
      else resolve(frames);
    };
    const cancel = () => finish(new DOMException('Cancelled', 'AbortError'));
    signal.addEventListener('abort', cancel, { once: true });
    worker.onerror = () => finish(new Error('invalidImage'));
    worker.onmessage = ({ data }) => {
      chain = chain
        .then(async () => {
          if (finished) return;
          abortCheck(signal);
          if (data.type === 'error') throw new Error(data.error);
          if (data.type === 'done') {
            checkFrames(frames);
            finish();
            return;
          }
          const { canvas, context } = makeCanvas(data.width, data.height);
          context.putImageData(
            new ImageData(
              new Uint8ClampedArray(data.pixels),
              data.width,
              data.height
            ),
            0,
            0
          );
          const blob = await pngBlob(canvas);
          canvas.width = 0;
          canvas.height = 0;
          abortCheck(signal);
          frames.push({
            id: crypto.randomUUID(),
            name: `${file.name.replace(/\.gif$/i, '')}-${String(data.index + 1).padStart(3, '0')}.png`,
            blob,
            width: data.width,
            height: data.height,
            duration: data.duration,
            originalIndex: data.index,
          });
          progress(data.index + 1, data.total);
        })
        .catch(finish);
    };
    worker.postMessage(buffer, [buffer]);
  });
}
export async function renderSheet(
  frames: Frame[],
  options: MakerOptions,
  signal: AbortSignal,
  progress: (done: number, total: number) => void = () => {}
) {
  const pack = packFrames(frames, options);
  const { canvas, context } = makeCanvas(pack.width, pack.height);
  try {
    if (options.background) {
      context.fillStyle = options.background;
      context.fillRect(0, 0, pack.width, pack.height);
    }
    for (let i = 0; i < frames.length; i++) {
      abortCheck(signal);
      const bitmap = await createImageBitmap(frames[i].blob);
      try {
        abortCheck(signal);
        context.drawImage(bitmap, pack.rects[i].x, pack.rects[i].y);
        progress(i + 1, frames.length);
      } finally {
        bitmap.close();
      }
    }
    const blob = await pngBlob(canvas);
    abortCheck(signal);
    return { blob, pack };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
export async function extractFrames(
  sheet: Frame,
  rects: Rect[],
  signal: AbortSignal,
  progress: (done: number, total: number) => void,
  originals?: Frame[]
) {
  checkFrames(rects);
  const bitmap = await createImageBitmap(sheet.blob);
  const frames: Frame[] = [];
  try {
    for (let index = 0; index < rects.length; index++) {
      abortCheck(signal);
      const rect = rects[index];
      const { canvas, context } = makeCanvas(rect.width, rect.height);
      try {
        context.drawImage(
          bitmap,
          rect.x,
          rect.y,
          rect.width,
          rect.height,
          0,
          0,
          rect.width,
          rect.height
        );
        const empty = isEffectivelyTransparent(
          context.getImageData(0, 0, rect.width, rect.height).data
        );
        const blob = await pngBlob(canvas);
        abortCheck(signal);
        frames.push({
          id: `cell-${index}`,
          name:
            originals?.[index]?.name ||
            `frame-${String(index + 1).padStart(3, '0')}`,
          duration: originals?.[index]?.duration ?? 1000 / 12,
          originalIndex: index,
          width: rect.width,
          height: rect.height,
          blob,
          empty,
        });
        progress(index + 1, rects.length);
        if (index % 3 === 2) {
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 0);
          });
          abortCheck(signal);
        }
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    }
  } finally {
    bitmap.close();
  }
  return frames;
}
export async function zipFiles(
  entries: { name: string; blob: Blob }[],
  signal: AbortSignal,
  progress: (done: number, total: number) => void
) {
  const { zip } = await import('fflate');
  abortCheck(signal);
  const files: Record<string, Uint8Array> = {};
  for (let i = 0; i < entries.length; i++) {
    abortCheck(signal);
    files[entries[i].name] = new Uint8Array(
      await entries[i].blob.arrayBuffer()
    );
    progress(i + 1, entries.length);
  }
  abortCheck(signal);
  return new Promise<Blob>((resolve, reject) => {
    const terminate = zip(files, { level: 0 }, (error, data) => {
      signal.removeEventListener('abort', cancel);
      if (signal.aborted)
        return reject(new DOMException('Cancelled', 'AbortError'));
      if (error) reject(new Error('exportError'));
      else
        resolve(
          new Blob([data as Uint8Array<ArrayBuffer>], {
            type: 'application/zip',
          })
        );
    });
    const cancel = () => {
      terminate();
      reject(new DOMException('Cancelled', 'AbortError'));
    };
    signal.addEventListener('abort', cancel, { once: true });
  });
}
export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
export async function trimFrames(
  frames: Frame[],
  cache: Map<string, Frame>,
  signal: AbortSignal
) {
  const result: Frame[] = [];
  for (const frame of frames) {
    abortCheck(signal);
    const cached = cache.get(frame.id);
    if (cached) {
      result.push(cached);
      continue;
    }
    const next = await trimFrame(frame, signal);
    cache.set(frame.id, next);
    result.push(next);
  }
  return result;
}

async function trimFrame(frame: Frame, signal: AbortSignal) {
  abortCheck(signal);
  const bitmap = await createImageBitmap(frame.blob);
  const { canvas, context } = makeCanvas(bitmap.width, bitmap.height);
  try {
    abortCheck(signal);
    context.drawImage(bitmap, 0, 0);
    const image = context.getImageData(0, 0, bitmap.width, bitmap.height);
    const bounds = trimBounds(image.data, bitmap.width, bitmap.height);
    const source = {
      x: bounds.x,
      y: bounds.y,
      sourceW: bitmap.width,
      sourceH: bitmap.height,
    };
    if (
      bounds.x === 0 &&
      bounds.y === 0 &&
      bounds.width === bitmap.width &&
      bounds.height === bitmap.height
    ) {
      return { ...frame, trim: source };
    }
    const cropped = context.getImageData(
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height
    );
    const out = makeCanvas(bounds.width, bounds.height);
    try {
      out.context.putImageData(cropped, 0, 0);
      abortCheck(signal);
      return {
        ...frame,
        blob: await pngBlob(out.canvas),
        width: bounds.width,
        height: bounds.height,
        empty: isTransparent(cropped.data),
        trim: source,
      };
    } finally {
      out.canvas.width = 0;
      out.canvas.height = 0;
    }
  } finally {
    bitmap.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}

export async function encodeFramesGif(
  frames: Frame[],
  options: Pick<MakerOptions, 'align' | 'background'> & {
    fps: number | null;
  },
  signal: AbortSignal,
  progress: (done: number, total: number) => void
) {
  checkFrames(frames);
  const width = Math.max(...frames.map((frame) => frame.width));
  const height = Math.max(...frames.map((frame) => frame.height));
  checkSize({ width, height });
  const composed = [];
  for (let i = 0; i < frames.length; i++) {
    abortCheck(signal);
    const frame = frames[i];
    const bitmap = await createImageBitmap(frame.blob);
    const { canvas, context } = makeCanvas(width, height);
    try {
      if (options.background) {
        context.fillStyle = options.background;
        context.fillRect(0, 0, width, height);
      }
      const x =
        options.align === 'top-left'
          ? 0
          : Math.floor((width - frame.width) / 2);
      const y =
        options.align === 'bottom'
          ? height - frame.height
          : options.align === 'center'
            ? Math.floor((height - frame.height) / 2)
            : 0;
      context.drawImage(bitmap, x, y);
      const { data } = context.getImageData(0, 0, width, height);
      composed.push({
        data: new Uint8ClampedArray(data),
        delay: options.fps ? Math.round(1000 / options.fps) : frame.duration,
      });
      progress(i + 1, frames.length);
    } finally {
      bitmap.close();
      canvas.width = 0;
      canvas.height = 0;
    }
  }
  abortCheck(signal);
  return new Blob([encodeAnimatedGif(width, height, composed)], {
    type: 'image/gif',
  });
}

export async function exportAtlas(
  frames: Frame[],
  sheet: Awaited<ReturnType<typeof renderSheet>>,
  fps: number | null,
  formats: AtlasFormat[],
  signal: AbortSignal,
  progress: (done: number, total: number) => void,
  gifOptions?: Pick<MakerOptions, 'align' | 'background'>
) {
  const entries: { name: string; blob: Blob }[] = [
    { name: 'sprite-sheet.png', blob: sheet.blob },
  ];
  for (const format of formats) {
    if (format === 'jsonHash') {
      entries.push({
        name: 'sprite-sheet.json',
        blob: new Blob(
          [JSON.stringify(createAtlas(frames, sheet.pack, fps), null, 2)],
          { type: 'application/json' }
        ),
      });
    } else if (format === 'jsonArray') {
      entries.push({
        name: 'sprite-sheet.array.json',
        blob: new Blob(
          [JSON.stringify(createAtlasArray(frames, sheet.pack, fps), null, 2)],
          { type: 'application/json' }
        ),
      });
    } else if (format === 'css') {
      entries.push({
        name: 'sprite-sheet.css',
        blob: new Blob([createCssAtlas(frames, sheet.pack)], {
          type: 'text/css',
        }),
      });
    } else if (format === 'xml') {
      entries.push({
        name: 'sprite-sheet.xml',
        blob: new Blob([createXmlAtlas(frames, sheet.pack)], {
          type: 'application/xml',
        }),
      });
    } else if (format === 'gif') {
      entries.push({
        name: 'animation.gif',
        blob: await encodeFramesGif(
          frames,
          {
            align: gifOptions?.align ?? 'bottom',
            background: gifOptions?.background ?? '',
            fps,
          },
          signal,
          progress
        ),
      });
    }
  }
  return zipFiles(entries, signal, progress);
}
export const frameEntries = (frames: Frame[]) =>
  frames.map((frame, index) => ({
    name: frameFilename(index, frame.name),
    blob: frame.blob,
  }));
export async function exampleFrames(signal: AbortSignal) {
  const response = await fetch(
    '/imgs/demo/raccoon-forge-sprite-sheet-v1.webp',
    { signal }
  );
  if (!response.ok) throw new Error('invalidImage');
  const bitmap = await createImageBitmap(await response.blob());
  const frames: Frame[] = [];
  const width = bitmap.width / 8;
  const height = bitmap.height / 4;
  try {
    for (let i = 0; i < 8; i++) {
      abortCheck(signal);
      const { canvas, context } = makeCanvas(width, height);
      try {
        context.drawImage(
          bitmap,
          i * width,
          height,
          width,
          height,
          0,
          0,
          width,
          height
        );
        frames.push({
          id: `example-${i}`,
          name: `raccoon-walk-${i + 1}.png`,
          blob: await pngBlob(canvas),
          width,
          height,
          duration: 1000 / 12,
          originalIndex: i,
        });
      } finally {
        canvas.width = 0;
      }
    }
    abortCheck(signal);
    return frames;
  } finally {
    bitmap.close();
  }
}
