export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_EDGE = 4096;

export function userUploadStorageKey(
  fileId: string,
  extension: string,
  now = new Date()
) {
  return `uploads/${now.toISOString().slice(0, 7)}/${fileId}.${extension}`;
}

export function projectAssetStorageKey(
  projectId: string,
  type: string,
  fileId: string,
  extension: string
) {
  return `projects/${projectId}/${type}/${fileId}.${extension}`;
}

export function generationAssetType(taskType: string) {
  if (taskType === 'animation') return 'animation';
  if (taskType === 'icon_batch') return 'icon';
  return 'character';
}

export function isRootStorageKey(key: string) {
  return key.startsWith('projects/') || key.startsWith('uploads/');
}

export function isProviderReachableUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local')
    ) {
      return false;
    }
    if (host.endsWith('.r2.cloudflarestorage.com')) {
      return parsed.searchParams.has('X-Amz-Signature');
    }
    return true;
  } catch {
    return false;
  }
}

export function extensionFromMime(mime: string) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}
