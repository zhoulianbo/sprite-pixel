import type { StorageProvider } from '@/extensions/storage';
import { animationVideoStorageKey } from '@/shared/lib/storage-paths';

/** Archive before frame processing, and reuse the same object on retries. */
export async function storeAnimationSourceVideo(
  input: {
    taskId: string;
    createdAt: Date;
    sourceUrl: string;
    storedKey?: string;
  },
  storage: StorageProvider
) {
  if (storage.name !== 'r2' || !storage.createSignedDownloadUrl) {
    throw new Error('VIDEO_R2_NOT_CONFIGURED');
  }
  const key =
    input.storedKey || animationVideoStorageKey(input.taskId, input.createdAt);
  if (!(await storage.exists?.({ key }))) {
    const uploaded = await storage.downloadAndUpload({
      url: input.sourceUrl,
      key,
      contentType: 'video/mp4',
      disposition: 'inline',
    });
    if (!uploaded.success) throw new Error('VIDEO_R2_STORAGE_FAILED');
  }
  return {
    key,
    // The processor can read the saved video even with a private R2 endpoint.
    downloadUrl: await storage.createSignedDownloadUrl({
      key,
      expiresIn: 3600,
    }),
  };
}
