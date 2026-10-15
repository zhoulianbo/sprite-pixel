import { VIDEO_LIMIT, type VideoOptions } from '@/config/tools/free-tools';
import { enforceSlidingWindowRateLimit } from '@/shared/lib/rate-limit';
import {
  verifyVideoCredential,
  videoMime,
  videoTaskId,
  type VideoCredential,
} from '@/shared/lib/sprite-tools/video-contract';
import {
  processorConfig,
  processSpriteVideo,
} from '@/shared/services/sprite-media-processor';
import { getStorageService } from '@/shared/services/storage';

export function videoRateLimit(request: Request) {
  return enforceSlidingWindowRateLimit(request, {
    windowMs: 600_000,
    maxRequests: 10,
    keyPrefix: 'free-video',
    ipOnly: true,
  });
}
export function toolError(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  const known: Record<string, number> = {
    UPLOAD_EXPIRED: 410,
    INVALID_VIDEO: 400,
    FILE_TOO_LARGE: 413,
    UPLOAD_FAILED: 400,
    MEDIA_PROCESSOR_BUSY: 429,
    MEDIA_PROCESSOR_NOT_CONFIGURED: 503,
  };
  const message = code in known ? code : 'PROCESSING_FAILED';
  return Response.json(
    { code: -1, message },
    { status: known[code] || 502, headers: { 'Cache-Control': 'no-store' } }
  );
}
export async function validateVideoObject(credential: VideoCredential) {
  const storage = await getStorageService();
  const source = await storage.downloadFile({ key: credential.key });
  if (!source.success || !source.body) throw new Error('UPLOAD_FAILED');
  const reader = source.body.getReader();
  let size = 0;
  let header = new Uint8Array(0);
  try {
    if (Number(source.contentLength) > VIDEO_LIMIT)
      throw new Error('FILE_TOO_LARGE');
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > VIDEO_LIMIT || size > credential.size)
        throw new Error('FILE_TOO_LARGE');
      if (header.length < 4096) {
        const next = new Uint8Array(
          Math.min(4096, header.length + value.length)
        );
        next.set(header);
        next.set(value.subarray(0, next.length - header.length), header.length);
        header = next;
      }
    }
    if (
      size !== credential.size ||
      videoMime(header) !== credential.contentType
    )
      throw new Error('INVALID_VIDEO');
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export async function processFreeVideo(token: string, options: VideoOptions) {
  const credential = await verifyVideoCredential(
    token,
    processorConfig().secret
  );
  await validateVideoObject(credential);
  const storage = await getStorageService();
  const sourceVideoUrl = await storage.createSignedDownloadUrl({
    key: credential.key,
    expiresIn: 3600,
  });
  const generationTaskId = await videoTaskId(credential.id, options);
  return processSpriteVideo({
    generationId: credential.id,
    generationTaskId,
    sourceVideoUrl,
    outputPrefix: credential.key.slice(0, credential.key.lastIndexOf('/')),
    frameCount: options.frame_count,
    frameSize: options.frame_size,
    fps: options.fps,
    loop: options.loop,
    action: 'idle',
    direction: 'none',
  });
}
