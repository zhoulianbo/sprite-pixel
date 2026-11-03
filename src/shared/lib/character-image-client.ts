import type { PixelRepairOptions, PixelRepairResult } from './pixel-repair';
import { imageInfo } from './sprite-tools/image-info';

export type CharacterImageTarget = { fileId?: string; generationId?: string };
export type CharacterImageMetadata = {
  style: string;
  revision: string;
  cleanupPending: boolean;
  repairOptions?: PixelRepairOptions;
};
export type CharacterPixelDraft = {
  blob: Blob;
  url: string;
  revision: string;
  inferred: boolean;
};
export function characterImageEndpoint(target: CharacterImageTarget) {
  return `/api/character-images?${new URLSearchParams(target.fileId ? { fileId: target.fileId } : { generationId: target.generationId || '' })}`;
}

/** Explicit repair preview only. No uploads or saved-image changes. */
export async function prepareCharacterPixels(
  target: CharacterImageTarget,
  metadata: CharacterImageMetadata,
  signal: AbortSignal
): Promise<CharacterPixelDraft> {
  const response = await fetch(characterImageEndpoint(target), { signal });
  if (!response.ok) throw new Error('IMAGE_READ_FAILED');
  if (response.headers.get('X-Image-Revision') !== metadata.revision)
    throw new Error('IMAGE_CHANGED');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 10 * 1024 * 1024) throw new Error('IMAGE_TOO_LARGE');
  const info = imageInfo(bytes);
  if (
    info.width > 4096 ||
    info.height > 4096 ||
    info.width * info.height > 16_000_000
  )
    throw new Error('IMAGE_TOO_LARGE');
  const bitmap = await createImageBitmap(
    new Blob([bytes], { type: info.mime })
  );
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context || signal.aborted) {
    bitmap.close();
    throw new Error('ABORTED');
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const job = new Worker(new URL('./pixel-repair.worker.ts', import.meta.url));
  let onAbort: () => void = () => {};
  let result: PixelRepairResult;
  try {
    result = await new Promise<PixelRepairResult>((resolve, reject) => {
      onAbort = () => reject(new Error('ABORTED'));
      signal.addEventListener('abort', onAbort, { once: true });
      job.onmessage = ({ data }) =>
        data.error ? reject(new Error(data.error)) : resolve(data.result);
      job.onerror = () => reject(new Error('REPAIR_FAILED'));
      if (signal.aborted) {
        onAbort();
        return;
      }
      job.postMessage(
        {
          width: pixels.width,
          height: pixels.height,
          data: pixels.data,
          options: metadata.repairOptions,
        },
        [pixels.data.buffer]
      );
    });
  } finally {
    signal.removeEventListener('abort', onAbort);
    job.terminate();
  }
  if (signal.aborted) throw new Error('ABORTED');
  canvas.width = result.width;
  canvas.height = result.height;
  const output = context.createImageData(result.width, result.height);
  output.data.set(result.data);
  context.putImageData(output, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('REPAIR_FAILED'))),
      'image/png'
    )
  );
  if (signal.aborted) throw new Error('ABORTED');
  if (blob.size > 10 * 1024 * 1024) throw new Error('IMAGE_TOO_LARGE');
  return {
    blob,
    url: URL.createObjectURL(blob),
    revision: metadata.revision,
    inferred: result.inferred,
  };
}
