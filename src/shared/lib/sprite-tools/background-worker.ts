import * as ort from 'onnxruntime-web/wasm';

import { BACKGROUND_MODEL_CACHE } from '../../../config/tools/background-model';
import type { BackgroundResources } from './background-client';

const scope = self as unknown as {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage: (message: unknown) => void;
};
let session: ort.InferenceSession | undefined;
let initializing: Promise<void> | undefined;
const CACHE = BACKGROUND_MODEL_CACHE;
function progress(phase: string, loaded = 0, total = 0) {
  scope.postMessage({ type: 'progress', phase, loaded, total });
}
async function digest(buffer: ArrayBuffer) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)),
    (b) => b.toString(16).padStart(2, '0')
  ).join('');
}
async function initialize(resources: BackgroundResources) {
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = resources.runtimeUrl;
  let cache: Cache | undefined;
  let buffer: ArrayBuffer | undefined;
  try {
    cache = await caches.open(CACHE);
    const hit = await cache.match(resources.modelUrl);
    if (hit) {
      progress('cached');
      const bytes = await hit.arrayBuffer();
      if (
        bytes.byteLength === resources.bytes &&
        (await digest(bytes)) === resources.sha256
      )
        buffer = bytes;
      else await cache.delete(resources.modelUrl);
    }
  } catch {
    progress('cacheUnavailable');
  }
  if (!buffer) {
    const response = await fetch(resources.modelUrl, { mode: 'cors' }).catch(
      () => {
        throw new Error('MODEL_DOWNLOAD_FAILED');
      }
    );
    if (!response.ok || !response.body)
      throw new Error('MODEL_DOWNLOAD_FAILED');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    progress('downloading', loaded, resources.bytes);
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        loaded += value.length;
        if (loaded > resources.bytes) throw new Error('MODEL_INVALID');
        chunks.push(value);
        progress('downloading', loaded, resources.bytes);
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    const joined = new Uint8Array(loaded);
    let offset = 0;
    for (const part of chunks) {
      joined.set(part, offset);
      offset += part.length;
    }
    chunks.length = 0;
    buffer = joined.buffer;
    if (
      buffer.byteLength !== resources.bytes ||
      (await digest(buffer)) !== resources.sha256
    )
      throw new Error('MODEL_INVALID');
    if (cache) {
      try {
        await cache.put(
          resources.modelUrl,
          new Response(buffer, {
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Length': String(buffer.byteLength),
            },
          })
        );
        progress('cached');
      } catch {
        progress('cacheUnavailable');
      }
    }
  }
  progress('initializing');
  session = await ort.InferenceSession.create(buffer, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  });
}
async function remove(
  blob: Blob,
  options: { threshold: number; hardEdge: boolean }
) {
  if (!session) throw new Error('MODEL_FAILED');
  const threshold = Math.min(
    0.9,
    Math.max(0.1, Number(options.threshold) || 0.5)
  );
  const hardEdge = options.hardEdge !== false;
  const softness = hardEdge ? 0 : 0.08;
  const bitmap = await createImageBitmap(blob);
  const input = new OffscreenCanvas(1024, 1024);
  const context = input.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('BROWSER_UNSUPPORTED');
  let tensor: ort.Tensor | undefined;
  let outputs: ort.InferenceSession.ReturnType | undefined;
  try {
    context.drawImage(bitmap, 0, 0, 1024, 1024);
    const rgba = context.getImageData(0, 0, 1024, 1024).data;
    const area = 1024 * 1024;
    const data = new Float32Array(area * 3);
    let max = 0;
    for (let i = 0; i < area; i++)
      for (let c = 0; c < 3; c++) max = Math.max(max, rgba[i * 4 + c]);
    const scale = max || 255;
    for (let i = 0; i < area; i++)
      for (let c = 0; c < 3; c++)
        data[c * area + i] = rgba[i * 4 + c] / scale - 0.5;
    tensor = new ort.Tensor('float32', data, [1, 3, 1024, 1024]);
    outputs = await session.run({ [session.inputNames[0]]: tensor });
    const output = outputs[session.outputNames[0]];
    const mask = output.data as Float32Array;
    const width = Number(output.dims[3]),
      height = Number(output.dims[2]);
    let low = Infinity,
      high = -Infinity;
    for (let i = 0; i < width * height; i++) {
      low = Math.min(low, mask[i]);
      high = Math.max(high, mask[i]);
    }
    const maskCanvas = new OffscreenCanvas(width, height);
    const maskContext = maskCanvas.getContext('2d')!;
    const pixels = maskContext.createImageData(width, height);
    const span = high > low ? high - low : 1;
    for (let i = 0; i < width * height; i++) {
      const value = high > low ? (mask[i] - low) / span : 0;
      const alpha =
        softness <= 0
          ? value >= threshold
            ? 255
            : 0
          : Math.round(
              Math.min(
                1,
                Math.max(0, (value - (threshold - softness)) / (softness * 2))
              ) * 255
            );
      pixels.data.set([255, 255, 255, alpha], i * 4);
    }
    maskContext.putImageData(pixels, 0, 0);
    const result = new OffscreenCanvas(bitmap.width, bitmap.height);
    const resultContext = result.getContext('2d')!;
    resultContext.drawImage(bitmap, 0, 0);
    resultContext.globalCompositeOperation = 'destination-in';
    resultContext.imageSmoothingEnabled = !hardEdge;
    resultContext.drawImage(maskCanvas, 0, 0, bitmap.width, bitmap.height);
    const png = await result.convertToBlob({ type: 'image/png' });
    maskCanvas.width = 0;
    result.width = 0;
    return png;
  } finally {
    bitmap.close();
    input.width = 0;
    tensor?.dispose();
    if (outputs) for (const value of Object.values(outputs)) value.dispose();
  }
}
scope.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      initializing ||= initialize(data.resources);
      try {
        await initializing;
      } catch (error) {
        initializing = undefined;
        throw error;
      }
      scope.postMessage({ type: 'ready' });
    } else if (data.type === 'remove') {
      const blob = await remove(data.blob, {
        threshold: data.threshold,
        hardEdge: data.hardEdge,
      });
      scope.postMessage({ type: 'result', blob });
    }
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    scope.postMessage({
      type: 'error',
      code: [
        'MODEL_DOWNLOAD_FAILED',
        'MODEL_INVALID',
        'BROWSER_UNSUPPORTED',
      ].includes(code)
        ? code
        : 'MODEL_FAILED',
    });
  }
};
