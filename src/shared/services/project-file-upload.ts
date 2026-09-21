import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/core/db';
import { assetFile, assetVariant } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';
import { imageInfo } from '@/shared/lib/sprite-tools/image-info';
import {
  extensionFromMime,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_EDGE,
  userUploadStorageKey,
} from '@/shared/lib/storage-paths';
import { getProjectItem } from '@/shared/models/asset';
import { getStorageService } from '@/shared/services/storage';

export const allowedUploadRoles = new Set([
  'source',
  'reference',
  'base_reference',
  'motion_reference',
  'icon',
]);

export const signUploadSchema = z.object({
  role: z.string(),
  contentType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  filename: z.string().min(1).max(255),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  itemId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
});

export const completeUploadSchema = z.object({
  fileId: z.string().uuid(),
});

export class ProjectFileUploadError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export async function assertUploadTargets(
  projectId: string,
  itemId?: string,
  variantId?: string
) {
  if (itemId && !(await getProjectItem(projectId, itemId))) {
    throw new ProjectFileUploadError('ASSET_NOT_FOUND', 404);
  }
  if (!variantId) return;
  const [ownedVariant] = await db()
    .select({ id: assetVariant.id })
    .from(assetVariant)
    .where(
      and(
        eq(assetVariant.id, variantId),
        eq(assetVariant.projectId, projectId),
        itemId ? eq(assetVariant.itemId, itemId) : undefined
      )
    )
    .limit(1);
  if (!ownedVariant) {
    throw new ProjectFileUploadError('VARIANT_NOT_FOUND', 404);
  }
}

export async function createSignedUserUpload(
  projectId: string,
  input: z.infer<typeof signUploadSchema>
) {
  if (!allowedUploadRoles.has(input.role)) {
    throw new ProjectFileUploadError('INVALID_UPLOAD', 400);
  }
  await assertUploadTargets(projectId, input.itemId, input.variantId);

  const fileId = getUuid();
  const storageKey = userUploadStorageKey(
    fileId,
    extensionFromMime(input.contentType)
  );
  let signed;
  try {
    const storage = await getStorageService();
    signed = await storage.createSignedUploadUrl({
      key: storageKey,
      contentType: input.contentType,
    });
  } catch {
    throw new ProjectFileUploadError('STORAGE_NOT_CONFIGURED', 503);
  }

  const now = new Date().toISOString();
  await db().insert(assetFile).values({
    id: fileId,
    projectId,
    itemId: input.itemId || null,
    variantId: input.variantId || null,
    mediaType: 'image',
    role: input.role,
    storageKey,
    originalFilename: input.filename.slice(0, 255),
    mimeType: input.contentType,
    sizeBytes: input.size,
    status: 'uploading',
    metadataJson: '{}',
    createdAt: now,
    updatedAt: now,
  });

  return {
    fileId,
    storageKey,
    uploadUrl: signed.uploadUrl,
    headers: signed.headers,
  };
}

export async function completeSignedUserUpload(
  projectId: string,
  fileId: string
) {
  const [file] = await db()
    .select()
    .from(assetFile)
    .where(and(eq(assetFile.id, fileId), eq(assetFile.projectId, projectId)))
    .limit(1);
  if (!file || file.deletedAt || file.status !== 'uploading') {
    throw new ProjectFileUploadError('REFERENCE_NOT_FOUND', 404);
  }
  if (!file.storageKey.startsWith('uploads/')) {
    throw new ProjectFileUploadError('INVALID_UPLOAD', 400);
  }

  let downloaded;
  try {
    const storage = await getStorageService();
    downloaded = await storage.downloadFile({ key: file.storageKey });
  } catch {
    throw new ProjectFileUploadError('STORAGE_NOT_CONFIGURED', 503);
  }
  if (!downloaded.success || !downloaded.body) {
    throw new ProjectFileUploadError('STORAGE_UPLOAD_FAILED', 400);
  }

  const buffer = await new Response(downloaded.body).arrayBuffer();
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new ProjectFileUploadError('FILE_TOO_LARGE', 413);
  }

  let info: ReturnType<typeof imageInfo>;
  try {
    info = imageInfo(buffer);
  } catch {
    throw new ProjectFileUploadError('INVALID_IMAGE', 400);
  }
  if (info.width > MAX_UPLOAD_EDGE || info.height > MAX_UPLOAD_EDGE) {
    throw new ProjectFileUploadError('IMAGE_DIMENSIONS_EXCEEDED', 400);
  }

  const now = new Date().toISOString();
  const [saved] = await db()
    .update(assetFile)
    .set({
      mimeType: info.mime,
      width: info.width,
      height: info.height,
      sizeBytes: buffer.byteLength,
      status: 'ready',
      updatedAt: now,
    })
    .where(eq(assetFile.id, fileId))
    .returning();

  return saved;
}
