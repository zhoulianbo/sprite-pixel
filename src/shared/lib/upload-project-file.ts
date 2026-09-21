import { readApiPayload } from '@/shared/lib/product-api-error';
import { imageInfo } from '@/shared/lib/sprite-tools/image-info';
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_EDGE } from '@/shared/lib/storage-paths';

export async function uploadProjectReferenceFile({
  projectId,
  file,
  role,
  itemId,
  variantId,
}: {
  projectId: string;
  file: File;
  role: string;
  itemId?: string;
  variantId?: string;
}) {
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new Error('FILE_TOO_LARGE');
  }

  const buffer = await file.arrayBuffer();
  let info: ReturnType<typeof imageInfo>;
  try {
    info = imageInfo(buffer);
  } catch {
    throw new Error('INVALID_IMAGE');
  }
  if (info.width > MAX_UPLOAD_EDGE || info.height > MAX_UPLOAD_EDGE) {
    throw new Error('IMAGE_DIMENSIONS_EXCEEDED');
  }

  const signed = await readApiPayload(
    await fetch(`/api/projects/${projectId}/files/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role,
        contentType: info.mime,
        filename: file.name,
        size: file.size,
        itemId,
        variantId,
      }),
    })
  );

  const uploaded = await fetch(signed.data.uploadUrl, {
    method: 'PUT',
    headers: signed.data.headers,
    body: file,
  });
  if (!uploaded.ok) {
    throw new Error('STORAGE_UPLOAD_FAILED');
  }

  const completed = await readApiPayload(
    await fetch(`/api/projects/${projectId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: signed.data.fileId }),
    })
  );
  return completed.data.id as string;
}
