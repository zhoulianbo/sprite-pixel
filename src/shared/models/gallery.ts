import { and, count, desc, eq, inArray, isNull, like, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  animationClip,
  animationSet,
  animationVersion,
  assetFile,
  assetItem,
  galleryItem,
  galleryLike,
  generation,
  project,
} from '@/config/db/schema';
import {
  animationFrameFileId,
  parseAnimationFrames,
} from '@/shared/lib/animation-frames';
import { getUuid } from '@/shared/lib/hash';
import { getAssetPublicUrlResolver } from '@/shared/services/storage';

export type GalleryAssetType = 'character' | 'animation';
export type GallerySort = 'latest' | 'likes' | 'downloads';

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function characterCategory(paramsJson: string | null) {
  return String(
    parseJson<Record<string, unknown>>(paramsJson, {}).characterType || ''
  );
}

async function findGallerySource(kind: GalleryAssetType, sourceId: string) {
  const [entry] = await db()
    .select()
    .from(galleryItem)
    .where(
      and(
        eq(galleryItem.type, kind),
        kind === 'character'
          ? eq(galleryItem.itemId, sourceId)
          : eq(galleryItem.animationClipId, sourceId)
      )
    )
    .limit(1);
  return entry;
}

async function publishCharacter(itemId: string) {
  const [source] = await db()
    .select({
      item: assetItem,
      file: assetFile,
      userId: project.userId,
      generationPrompt: generation.prompt,
      generationParams: generation.paramsJson,
      allowGallery: generation.allowGallery,
    })
    .from(assetItem)
    .innerJoin(project, eq(project.id, assetItem.projectId))
    .innerJoin(
      assetFile,
      and(
        eq(assetFile.itemId, assetItem.id),
        eq(assetFile.role, 'base_reference'),
        eq(assetFile.isActiveReference, true),
        eq(assetFile.status, 'ready'),
        isNull(assetFile.deletedAt)
      )
    )
    .leftJoin(generation, eq(generation.id, assetFile.generationId))
    .where(
      and(
        eq(assetItem.id, itemId),
        eq(assetItem.type, 'character'),
        eq(assetItem.status, 'active'),
        isNull(assetItem.deletedAt),
        isNull(project.deletedAt)
      )
    )
    .limit(1);
  if (
    !source ||
    source.item.sourceType !== 'generated' ||
    !source.allowGallery
  ) {
    return null;
  }

  const now = new Date().toISOString();
  const values = {
    userId: source.userId,
    projectId: source.item.projectId,
    itemId: source.item.id,
    animationClipId: null,
    animationVersionId: null,
    previewFileId: source.file.id,
    type: 'character',
    name: source.item.name,
    category: characterCategory(source.generationParams),
    width: source.file.width,
    height: source.file.height,
    sizeBytes: source.file.sizeBytes,
    prompt: source.generationPrompt || source.item.description,
    status: 'published',
    sourceCreatedAt: source.item.createdAt,
    publishedAt: now,
    updatedAt: now,
  } as const;
  const existing = await findGallerySource('character', itemId);
  if (existing) {
    const [updated] = await db()
      .update(galleryItem)
      .set(values)
      .where(eq(galleryItem.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db()
    .insert(galleryItem)
    .values({ id: getUuid(), ...values, createdAt: now })
    .returning();
  return created;
}

async function publishAnimation(clipId: string) {
  const [source] = await db()
    .select({
      clip: animationClip,
      set: animationSet,
      version: animationVersion,
      file: assetFile,
      userId: project.userId,
      prompt: generation.prompt,
      allowGallery: generation.allowGallery,
    })
    .from(animationClip)
    .innerJoin(animationSet, eq(animationSet.id, animationClip.animationSetId))
    .innerJoin(project, eq(project.id, animationSet.projectId))
    .innerJoin(
      animationVersion,
      and(
        eq(animationVersion.clipId, animationClip.id),
        eq(animationVersion.isCurrent, true)
      )
    )
    .innerJoin(assetFile, eq(assetFile.id, animationVersion.spritesheetFileId))
    .leftJoin(generation, eq(generation.id, animationVersion.generationId))
    .where(
      and(
        eq(animationClip.id, clipId),
        eq(animationClip.status, 'ready'),
        eq(animationSet.status, 'ready'),
        isNull(animationSet.deletedAt),
        isNull(assetFile.deletedAt),
        isNull(project.deletedAt)
      )
    )
    .limit(1);
  if (!source?.allowGallery) return null;

  const now = new Date().toISOString();
  const values = {
    userId: source.userId,
    projectId: source.set.projectId,
    itemId: source.set.itemId,
    animationClipId: source.clip.id,
    animationVersionId: source.version.id,
    previewFileId: source.file.id,
    type: 'animation',
    name: source.set.name,
    category: source.set.action,
    width: source.version.frameWidth,
    height: source.version.frameHeight,
    sizeBytes: source.file.sizeBytes,
    prompt: source.prompt,
    status: 'published',
    sourceCreatedAt: source.version.createdAt,
    publishedAt: now,
    updatedAt: now,
  } as const;
  const existing = await findGallerySource('animation', clipId);
  if (existing) {
    const [updated] = await db()
      .update(galleryItem)
      .set(values)
      .where(eq(galleryItem.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db()
    .insert(galleryItem)
    .values({ id: getUuid(), ...values, createdAt: now })
    .returning();
  return created;
}

export async function setGalleryPublished({
  kind,
  sourceId,
  published,
}: {
  kind: GalleryAssetType;
  sourceId: string;
  published: boolean;
}) {
  if (!published) {
    const existing = await findGallerySource(kind, sourceId);
    if (!existing) return null;
    const [updated] = await db()
      .update(galleryItem)
      .set({ status: 'hidden', updatedAt: new Date().toISOString() })
      .where(eq(galleryItem.id, existing.id))
      .returning();
    return updated;
  }
  return kind === 'character'
    ? publishCharacter(sourceId)
    : publishAnimation(sourceId);
}

export async function listGalleryItems({
  type = 'character',
  query = '',
  category = '',
  size = '',
  sort = 'latest',
  page = 1,
  limit = 12,
  userId,
}: {
  type?: GalleryAssetType;
  query?: string;
  category?: string;
  size?: string;
  sort?: GallerySort;
  page?: number;
  limit?: number;
  userId?: string;
}) {
  const sizeMatch = /^(\d+)x(\d+)$/.exec(size);
  const where = and(
    eq(galleryItem.status, 'published'),
    eq(galleryItem.type, type),
    query ? like(galleryItem.name, `%${query}%`) : undefined,
    category ? eq(galleryItem.category, category) : undefined,
    sizeMatch ? eq(galleryItem.width, Number(sizeMatch[1])) : undefined,
    sizeMatch ? eq(galleryItem.height, Number(sizeMatch[2])) : undefined
  );
  const safeLimit = Math.min(48, Math.max(1, limit));
  const safePage = Math.max(1, page);
  const order =
    sort === 'likes'
      ? [desc(galleryItem.likeCount), desc(galleryItem.sourceCreatedAt)]
      : sort === 'downloads'
        ? [desc(galleryItem.downloadCount), desc(galleryItem.sourceCreatedAt)]
        : [desc(galleryItem.sourceCreatedAt)];
  const [totalRow, rows, options] = await Promise.all([
    db().select({ count: count() }).from(galleryItem).where(where),
    db()
      .select({ item: galleryItem, storageKey: assetFile.storageKey })
      .from(galleryItem)
      .leftJoin(assetFile, eq(assetFile.id, galleryItem.previewFileId))
      .where(where)
      .orderBy(...order)
      .limit(safeLimit)
      .offset((safePage - 1) * safeLimit),
    db()
      .select({
        category: galleryItem.category,
        width: galleryItem.width,
        height: galleryItem.height,
      })
      .from(galleryItem)
      .where(
        and(eq(galleryItem.status, 'published'), eq(galleryItem.type, type))
      )
      .groupBy(galleryItem.category, galleryItem.width, galleryItem.height),
  ]);
  const typedRows = rows as Array<{
    item: typeof galleryItem.$inferSelect;
    storageKey: string | null;
  }>;
  const typedOptions = options as Array<{
    category: string;
    width: number | null;
    height: number | null;
  }>;
  const urlFor = await getAssetPublicUrlResolver();
  const likedRows =
    userId && typedRows.length
      ? await db()
          .select({ galleryItemId: galleryLike.galleryItemId })
          .from(galleryLike)
          .where(
            and(
              eq(galleryLike.userId, userId),
              inArray(
                galleryLike.galleryItemId,
                typedRows.map((row) => row.item.id)
              )
            )
          )
      : [];
  const likedIds = new Set(
    (likedRows as Array<{ galleryItemId: string }>).map(
      (row) => row.galleryItemId
    )
  );
  return {
    total: totalRow[0]?.count || 0,
    page: safePage,
    limit: safeLimit,
    items: typedRows.map(({ item, storageKey }) => ({
      ...item,
      liked: likedIds.has(item.id),
      previewUrl: storageKey ? urlFor(storageKey) : null,
    })),
    categories: [
      ...new Set(typedOptions.map((row) => row.category).filter(Boolean)),
    ],
    sizes: [
      ...new Set(
        typedOptions
          .filter((row) => row.width && row.height)
          .map((row) => `${row.width}x${row.height}`)
      ),
    ],
  };
}

export async function getGalleryAnimationPreview(galleryId: string) {
  const [source] = await db()
    .select({ version: animationVersion })
    .from(galleryItem)
    .innerJoin(
      animationVersion,
      eq(animationVersion.id, galleryItem.animationVersionId)
    )
    .where(
      and(
        eq(galleryItem.id, galleryId),
        eq(galleryItem.type, 'animation'),
        eq(galleryItem.status, 'published')
      )
    )
    .limit(1);
  if (!source) return null;
  const frames = parseAnimationFrames(source.version.framesJson);
  const fileIds = [
    ...new Set(
      frames
        .map((frame) =>
          animationFrameFileId(frame, source.version.spritesheetFileId)
        )
        .filter(Boolean)
    ),
  ];
  const files: { id: string; storageKey: string }[] = [];
  for (let offset = 0; offset < fileIds.length; offset += 100) {
    files.push(
      ...(await db()
        .select({ id: assetFile.id, storageKey: assetFile.storageKey })
        .from(assetFile)
        .where(
          and(
            inArray(assetFile.id, fileIds.slice(offset, offset + 100)),
            isNull(assetFile.deletedAt)
          )
        ))
    );
  }
  const urlFor = await getAssetPublicUrlResolver();
  const urlById = new Map(
    files.map((file) => [file.id, urlFor(file.storageKey)])
  );
  return {
    version: {
      fps: source.version.fps,
      frameWidth: source.version.frameWidth,
      frameHeight: source.version.frameHeight,
    },
    frames: frames.flatMap((frame, frameIndex) => {
      const fileId = animationFrameFileId(
        frame,
        source.version.spritesheetFileId
      );
      const url = urlById.get(fileId);
      return url
        ? [
            {
              id: frame.id,
              fileId,
              frameIndex,
              durationMs: frame.durationMs,
              offsetX: frame.offsetX,
              offsetY: frame.offsetY,
              metadata: frame.crop ? { crop: frame.crop } : {},
              file: { id: fileId, url },
            },
          ]
        : [];
    }),
  };
}

export async function incrementGalleryDownload(galleryId: string) {
  const [updated] = await db()
    .update(galleryItem)
    .set({
      downloadCount: sql`${galleryItem.downloadCount} + 1`,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(eq(galleryItem.id, galleryId), eq(galleryItem.status, 'published'))
    )
    .returning({ downloadCount: galleryItem.downloadCount });
  return updated;
}

export async function toggleGalleryLike(galleryId: string, userId: string) {
  const [published] = await db()
    .select({ id: galleryItem.id })
    .from(galleryItem)
    .where(
      and(eq(galleryItem.id, galleryId), eq(galleryItem.status, 'published'))
    )
    .limit(1);
  if (!published) return null;
  const [existing] = await db()
    .select({ id: galleryLike.id })
    .from(galleryLike)
    .where(
      and(
        eq(galleryLike.galleryItemId, galleryId),
        eq(galleryLike.userId, userId)
      )
    )
    .limit(1);
  let liked = true;
  if (existing) {
    await db().delete(galleryLike).where(eq(galleryLike.id, existing.id));
    liked = false;
  } else {
    await db().insert(galleryLike).values({
      id: getUuid(),
      galleryItemId: galleryId,
      userId,
      createdAt: new Date().toISOString(),
    });
  }
  const [item] = await db()
    .select({ likeCount: galleryItem.likeCount })
    .from(galleryItem)
    .where(eq(galleryItem.id, galleryId))
    .limit(1);
  return { liked, likeCount: item?.likeCount || 0 };
}
