import { and, desc, eq, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  aiTask,
  assetFile,
  generation,
  generationTask,
} from '@/config/db/schema';
import { resolveCharacterStyle } from '@/config/generation/prompts';
import { getUuid } from '@/shared/lib/hash';
import { imageInfo } from '@/shared/lib/sprite-tools/image-info';
import {
  MAX_UPLOAD_BYTES,
  projectAssetStorageKey,
} from '@/shared/lib/storage-paths';
import { getOwnedAssetFile, getProjectItem } from '@/shared/models/asset';
import { getOwnedProject } from '@/shared/models/project';
import { getStorageService } from '@/shared/services/storage';

export type CharacterImageTarget = { fileId?: string; generationId?: string };
export class CharacterImageError extends Error {
  constructor(
    public code: string,
    public status = 400
  ) {
    super(code);
  }
}
function parse(value?: string | null): Record<string, any> {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

// Shared with the normal Save Character action, so repair and first Vault save cannot race.
export async function withCharacterImageLock<T>(
  linkId: string,
  work: () => Promise<T>
) {
  const [link] = await db()
    .select()
    .from(generationTask)
    .where(eq(generationTask.id, linkId))
    .limit(1);
  if (!link) throw new CharacterImageError('IMAGE_NOT_FOUND', 404);
  const metadata = parse(link.metadataJson);
  if (Number(metadata.characterImageLockUntil) > Date.now())
    throw new CharacterImageError('IMAGE_BUSY', 409);
  const locked = JSON.stringify({
    ...metadata,
    characterImageLockUntil: Date.now() + 120_000,
    characterImageLockId: getUuid(),
  });
  const claimed = await db()
    .update(generationTask)
    .set({ metadataJson: locked })
    .where(
      and(
        eq(generationTask.id, link.id),
        eq(generationTask.metadataJson, link.metadataJson)
      )
    )
    .returning({ id: generationTask.id });
  if (!claimed.length) throw new CharacterImageError('IMAGE_BUSY', 409);
  try {
    return await work();
  } finally {
    await db()
      .update(generationTask)
      .set({ metadataJson: link.metadataJson })
      .where(
        and(
          eq(generationTask.id, link.id),
          eq(generationTask.metadataJson, locked)
        )
      );
  }
}

export async function resolveCharacterImage(
  userId: string,
  target: CharacterImageTarget
) {
  if (Boolean(target.fileId) === Boolean(target.generationId))
    throw new CharacterImageError('IMAGE_NOT_FOUND', 404);
  let file = target.fileId
    ? await getOwnedAssetFile(userId, target.fileId)
    : undefined;
  if (
    target.fileId &&
    (!file || file.role !== 'base_reference' || file.status !== 'ready')
  )
    throw new CharacterImageError('IMAGE_NOT_FOUND', 404);
  const generationId = file?.generationId || target.generationId;
  const [logical] = generationId
    ? await db()
        .select()
        .from(generation)
        .where(
          and(eq(generation.id, generationId), eq(generation.userId, userId))
        )
        .limit(1)
    : [];
  if (
    !logical ||
    !['character', 'character_variant'].includes(logical.taskType) ||
    !(await getOwnedProject(userId, logical.projectId))
  )
    throw new CharacterImageError('IMAGE_NOT_FOUND', 404);
  if (logical.itemId) {
    const item = await getProjectItem(logical.projectId, logical.itemId);
    if (!item || item.type !== 'character')
      throw new CharacterImageError('IMAGE_NOT_FOUND', 404);
  }
  const [link] = await db()
    .select()
    .from(generationTask)
    .where(
      file?.generationTaskId
        ? eq(generationTask.id, file.generationTaskId)
        : eq(generationTask.generationId, logical.id)
    )
    .orderBy(desc(generationTask.createdAt))
    .limit(1);
  if (!link || link.generationId !== logical.id)
    throw new CharacterImageError('IMAGE_NOT_FOUND', 404);
  const [task] = await db()
    .select()
    .from(aiTask)
    .where(eq(aiTask.id, link.aiTaskId))
    .limit(1);
  if (!task || task.status !== 'success')
    throw new CharacterImageError('IMAGE_NOT_READY', 409);
  if (!file) {
    [file] = await db()
      .select()
      .from(assetFile)
      .where(
        and(
          eq(assetFile.generationTaskId, link.id),
          isNull(assetFile.parentFileId),
          isNull(assetFile.deletedAt)
        )
      )
      .limit(1);
  }
  const params = parse(logical.paramsJson);
  // Historical custom/untyped output is never guessed from prompt text.
  const style =
    params.style === undefined &&
    (!params.project?.artStyle ||
      ['none', 'custom'].includes(params.project.artStyle))
      ? 'none'
      : resolveCharacterStyle(params.style, params.project?.artStyle);
  const sourceUrl = parse(task.taskInfo).images?.find(
    (image: any) => image?.imageUrl
  )?.imageUrl as string | undefined;
  const revision = file?.storageKey || `provider:${task.id}`;
  if (!file && !sourceUrl)
    throw new CharacterImageError('IMAGE_NOT_FOUND', 404);
  return { logical, link, task, file, sourceUrl, revision, style };
}

export async function readCharacterImage(
  userId: string,
  target: CharacterImageTarget
) {
  const source = await resolveCharacterImage(userId, target);
  const storage = await getStorageService();
  if (source.file) {
    const result = await storage.downloadFile({ key: source.file.storageKey });
    if (!result.success || !result.body)
      throw new CharacterImageError('IMAGE_READ_FAILED', 502);
    return {
      source,
      body: result.body,
      mime: source.file.mimeType || 'image/png',
    };
  }
  // Only the authenticated task's provider URL is accepted, never a caller-supplied URL.
  const response = await fetch(source.sourceUrl!, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok || !response.body)
    throw new CharacterImageError('IMAGE_READ_FAILED', 502);
  return {
    source,
    body: response.body,
    mime: response.headers.get('content-type') || 'image/png',
  };
}

async function providerStorageKey(url: string | undefined) {
  if (!url) return undefined;
  const storage = await getStorageService();
  // Provider-owned generated images only. Round-trip against configured storage to reject external URLs.
  const match = url.match(
    /(?:\/)((?:grsai|gemini|kie|fal|replicate)\/image\/[a-zA-Z0-9_-]+\.(?:png|jpg|jpeg|webp))(?:\?|$)/
  );
  const key = match?.[1];
  return key && storage.getPublicUrl({ key }) === url ? key : undefined;
}

async function cleanPreviousImages(file: typeof assetFile.$inferSelect) {
  const metadata = parse(file.metadataJson);
  const pending: string[] = Array.isArray(metadata.pixelRepairCleanup)
    ? metadata.pixelRepairCleanup
    : [];
  const storage = await getStorageService();
  // assetFile is canonical. Synchronize the provider preview before deleting its old object.
  // This is retryable because D1 cannot wrap interactive operations in a transaction.
  if (metadata.pixelRepairSyncPending) {
    try {
      const [link] = await db()
        .select()
        .from(generationTask)
        .where(eq(generationTask.id, file.generationTaskId!))
        .limit(1);
      const [task] = await db()
        .select()
        .from(aiTask)
        .where(eq(aiTask.id, link.aiTaskId))
        .limit(1);
      const info = parse(task.taskInfo);
      const previous = info.images?.find(
        (image: any) => image?.imageUrl
      )?.imageUrl;
      const url = storage.getPublicUrl({ key: file.storageKey });
      if (!url) return true;
      await db()
        .update(aiTask)
        .set({
          taskInfo: JSON.stringify({
            ...info,
            images: (info.images || []).map((image: any) =>
              image.imageUrl === previous ? { ...image, imageUrl: url } : image
            ),
          }),
        })
        .where(eq(aiTask.id, task.id));
    } catch {
      return true;
    }
  }
  const remaining: string[] = [];
  for (const key of pending) {
    if (key === file.storageKey) continue;
    // Mirrored/aliased records can share a key. Do not break a still-live asset.
    const referenced = await db()
      .select({ id: assetFile.id })
      .from(assetFile)
      .where(and(eq(assetFile.storageKey, key), isNull(assetFile.deletedAt)))
      .limit(1);
    if (referenced.length) continue;
    try {
      await storage.deleteFile({ key });
    } catch {
      remaining.push(key);
    }
  }
  const next = JSON.stringify({
    ...metadata,
    pixelRepairCleanup: remaining,
    pixelRepairSyncPending: false,
  });
  await db()
    .update(assetFile)
    .set({ metadataJson: next })
    .where(
      and(
        eq(assetFile.id, file.id),
        eq(assetFile.storageKey, file.storageKey),
        eq(assetFile.metadataJson, file.metadataJson)
      )
    );
  return remaining.length > 0;
}

export async function saveCharacterImageRepair(
  userId: string,
  target: CharacterImageTarget,
  revision: string,
  buffer?: ArrayBuffer
) {
  const initial = await resolveCharacterImage(userId, target);
  if (initial.style !== 'pixel-art')
    throw new CharacterImageError('PIXEL_STYLE_REQUIRED');
  return withCharacterImageLock(initial.link.id, async () => {
    const source = await resolveCharacterImage(userId, target);
    if (revision !== source.revision)
      throw new CharacterImageError('IMAGE_CHANGED', 409);
    const storage = await getStorageService();
    if (!buffer) {
      if (!source.file) throw new CharacterImageError('IMAGE_NOT_FOUND', 404);
      const cleanupPending = await cleanPreviousImages(source.file);
      return {
        fileId: source.file.id,
        url: storage.getPublicUrl({ key: source.file.storageKey }),
        revision: source.revision,
        cleanupPending,
      };
    }
    if (!buffer.byteLength || buffer.byteLength > MAX_UPLOAD_BYTES)
      throw new CharacterImageError('INVALID_IMAGE');
    let info: ReturnType<typeof imageInfo>;
    try {
      info = imageInfo(buffer);
    } catch {
      throw new CharacterImageError('INVALID_IMAGE');
    }
    if (info.mime !== 'image/png' || info.width > 4096 || info.height > 4096)
      throw new CharacterImageError('INVALID_IMAGE');
    const fileId = source.file?.id || getUuid();
    const key = projectAssetStorageKey(
      source.logical.projectId,
      'character',
      getUuid(),
      'png'
    );
    const uploaded = await storage.uploadFile({
      key,
      body: new Uint8Array(buffer),
      contentType: 'image/png',
      disposition: 'inline',
    });
    if (!uploaded.success)
      throw new CharacterImageError('IMAGE_SAVE_FAILED', 502);
    const oldKey =
      source.file?.storageKey || (await providerStorageKey(source.sourceUrl));
    const metadata = parse(source.file?.metadataJson);
    const now = new Date().toISOString();
    const values = {
      storageKey: key,
      mimeType: 'image/png',
      width: info.width,
      height: info.height,
      sizeBytes: buffer.byteLength,
      metadataJson: JSON.stringify({
        ...metadata,
        pixelRepair: { version: 3, savedAt: now },
        pixelRepairSyncPending: true,
        pixelRepairCleanup: [
          ...new Set([
            ...(metadata.pixelRepairCleanup || []),
            ...(oldKey ? [oldKey] : []),
          ]),
        ],
      }),
      updatedAt: now,
    };
    let saved: typeof assetFile.$inferSelect;
    try {
      if (source.file) {
        [saved] = await db()
          .update(assetFile)
          .set(values)
          .where(
            and(
              eq(assetFile.id, fileId),
              eq(assetFile.storageKey, source.revision),
              isNull(assetFile.deletedAt)
            )
          )
          .returning();
        if (!saved!) throw new CharacterImageError('IMAGE_CHANGED', 409);
      } else {
        // A repaired preview is staged; the normal Save Character action attaches it to the Vault.
        [saved] = await db()
          .insert(assetFile)
          .values({
            id: fileId,
            projectId: source.logical.projectId,
            itemId: source.logical.itemId,
            variantId: source.logical.variantId,
            generationId: source.logical.id,
            generationTaskId: source.link.id,
            mediaType: 'image',
            role: 'base_reference',
            status: 'ready',
            isActiveReference: source.logical.taskType === 'character',
            originalFilename: 'character.png',
            createdAt: now,
            ...values,
          })
          .returning();
      }
    } catch (error) {
      // A write may have committed even when its response was lost. Never delete a live object.
      const [persisted] = await db()
        .select()
        .from(assetFile)
        .where(and(eq(assetFile.id, fileId), eq(assetFile.storageKey, key)))
        .limit(1);
      if (persisted) saved = persisted;
      else {
        await storage.deleteFile({ key }).catch(() => {});
        throw error;
      }
    }
    // Cleanup intent is already durable. A failure never rolls back the valid replacement.
    const cleanupPending = await cleanPreviousImages(saved!);
    return {
      fileId,
      url: storage.getPublicUrl({ key }),
      revision: key,
      cleanupPending,
    };
  });
}
