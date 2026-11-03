import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  aiTask,
  animationClip,
  animationSet,
  animationVersion,
  assetFile,
  assetItem,
  galleryItem,
  generation,
  generationInput,
  generationTask,
  project,
  user,
} from '@/config/db/schema';
import {
  animationFrameFileId,
  parseAnimationFrames,
} from '@/shared/lib/animation-frames';
import {
  getAssetPublicUrlResolver,
  getStorageService,
} from '@/shared/services/storage';

type AdminAssetKind = 'character' | 'icon';

type AdminAnimationRow = {
  id: string;
  name: string;
  characterName: string;
  action: string;
  direction: string;
  createdAt: string;
  projectName: string;
  owner: typeof user.$inferSelect;
  fps: number;
  frameCount: number;
  generationId: string | null;
  storageKey: string | null;
  allowGallery: boolean | null;
  galleryStatus: string | null;
};

function generationStyle(paramsJson: string | null) {
  if (!paramsJson) return null;
  try {
    const style = JSON.parse(paramsJson)?.style;
    return typeof style === 'string' && style.trim() ? style.trim() : null;
  } catch {
    return null;
  }
}

function assetRole(kind: AdminAssetKind) {
  return kind === 'character' ? 'base_reference' : 'icon';
}

function assetConditions(kind: AdminAssetKind, email?: string) {
  return and(
    eq(assetItem.type, kind),
    eq(assetItem.status, 'active'),
    isNull(assetItem.deletedAt),
    eq(assetFile.role, assetRole(kind)),
    eq(assetFile.status, 'ready'),
    isNull(assetFile.deletedAt),
    kind === 'character' ? eq(assetFile.isActiveReference, true) : undefined,
    email ? eq(user.email, email) : undefined
  );
}

export async function getAdminAssetsCount({
  kind,
  email,
}: {
  kind: AdminAssetKind;
  email?: string;
}) {
  const [result] = await db()
    .select({ count: count() })
    .from(assetFile)
    .innerJoin(assetItem, eq(assetItem.id, assetFile.itemId))
    .innerJoin(project, eq(project.id, assetItem.projectId))
    .innerJoin(user, eq(user.id, project.userId))
    .where(assetConditions(kind, email));

  return result?.count || 0;
}

export async function getAdminAssets({
  kind,
  email,
  page = 1,
  limit = 30,
}: {
  kind: AdminAssetKind;
  email?: string;
  page?: number;
  limit?: number;
}) {
  const rows = await db()
    .select({
      id: assetItem.id,
      name: assetItem.name,
      description: assetItem.description,
      createdAt: assetItem.createdAt,
      projectName: project.name,
      owner: user,
      storageKey: assetFile.storageKey,
      width: assetFile.width,
      height: assetFile.height,
      sourceType: assetItem.sourceType,
      generationParamsJson: generation.paramsJson,
      allowGallery: generation.allowGallery,
      galleryStatus: galleryItem.status,
    })
    .from(assetFile)
    .innerJoin(assetItem, eq(assetItem.id, assetFile.itemId))
    .innerJoin(project, eq(project.id, assetItem.projectId))
    .innerJoin(user, eq(user.id, project.userId))
    .leftJoin(generation, eq(generation.id, assetFile.generationId))
    .leftJoin(
      galleryItem,
      and(
        eq(galleryItem.type, 'character'),
        eq(galleryItem.itemId, assetItem.id)
      )
    )
    .where(assetConditions(kind, email))
    .orderBy(desc(assetItem.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const urlFor = await getAssetPublicUrlResolver();
  return rows.map(
    ({ storageKey, generationParamsJson, ...row }: (typeof rows)[number]) => ({
      ...row,
      galleryEligible:
        row.sourceType === 'generated' && Boolean(row.allowGallery),
      galleryPublished: row.galleryStatus === 'published',
      selectedStyle: generationStyle(generationParamsJson),
      previewUrl: urlFor(storageKey),
    })
  );
}

function animationConditions(email?: string) {
  return and(
    eq(animationSet.status, 'ready'),
    eq(animationClip.status, 'ready'),
    eq(animationVersion.isCurrent, true),
    isNull(animationSet.deletedAt),
    isNull(assetItem.deletedAt),
    email ? eq(user.email, email) : undefined
  );
}

export async function getAdminAnimationsCount({ email }: { email?: string }) {
  const [result] = await db()
    .select({ count: count() })
    .from(animationClip)
    .innerJoin(animationSet, eq(animationSet.id, animationClip.animationSetId))
    .innerJoin(animationVersion, eq(animationVersion.clipId, animationClip.id))
    .innerJoin(assetItem, eq(assetItem.id, animationSet.itemId))
    .innerJoin(project, eq(project.id, animationSet.projectId))
    .innerJoin(user, eq(user.id, project.userId))
    .where(animationConditions(email));

  return result?.count || 0;
}

export async function getAdminAnimations({
  email,
  page = 1,
  limit = 30,
}: {
  email?: string;
  page?: number;
  limit?: number;
} = {}) {
  const rows = (await db()
    .select({
      id: animationClip.id,
      name: animationSet.name,
      characterName: assetItem.name,
      action: animationSet.action,
      direction: animationClip.direction,
      createdAt: animationVersion.createdAt,
      projectName: project.name,
      owner: user,
      fps: animationVersion.fps,
      frameCount: animationVersion.frameCount,
      generationId: animationVersion.generationId,
      storageKey: assetFile.storageKey,
      allowGallery: generation.allowGallery,
      galleryStatus: galleryItem.status,
    })
    .from(animationClip)
    .innerJoin(animationSet, eq(animationSet.id, animationClip.animationSetId))
    .innerJoin(animationVersion, eq(animationVersion.clipId, animationClip.id))
    .innerJoin(assetItem, eq(assetItem.id, animationSet.itemId))
    .innerJoin(project, eq(project.id, animationSet.projectId))
    .innerJoin(user, eq(user.id, project.userId))
    .leftJoin(generation, eq(generation.id, animationVersion.generationId))
    .leftJoin(
      galleryItem,
      and(
        eq(galleryItem.type, 'animation'),
        eq(galleryItem.animationClipId, animationClip.id)
      )
    )
    .leftJoin(
      assetFile,
      and(
        eq(assetFile.id, animationVersion.spritesheetFileId),
        isNull(assetFile.deletedAt)
      )
    )
    .where(animationConditions(email))
    .orderBy(desc(animationVersion.createdAt))
    .limit(limit)
    .offset((page - 1) * limit)) as AdminAnimationRow[];

  const generationIds = [
    ...new Set(
      rows
        .map((row) => row.generationId)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const references: {
    generationId: string;
    role: string;
    storageKey: string;
  }[] = [];
  // Reserve one of D1's 100 parameters for the ready status filter.
  const generationBatchSize = 99;
  for (
    let offset = 0;
    offset < generationIds.length;
    offset += generationBatchSize
  ) {
    const batch = await db()
      .select({
        generationId: generationInput.generationId,
        role: generationInput.role,
        storageKey: assetFile.storageKey,
      })
      .from(generationInput)
      .innerJoin(assetFile, eq(assetFile.id, generationInput.fileId))
      .where(
        and(
          inArray(
            generationInput.generationId,
            generationIds.slice(offset, offset + generationBatchSize)
          ),
          eq(assetFile.status, 'ready'),
          isNull(assetFile.deletedAt)
        )
      );
    references.push(...batch);
  }
  const referenceKeys = new Map<string, Map<string, string>>();
  for (const reference of references) {
    const byRole = referenceKeys.get(reference.generationId) ?? new Map();
    byRole.set(reference.role, reference.storageKey);
    referenceKeys.set(reference.generationId, byRole);
  }

  const urlFor = await getAssetPublicUrlResolver();
  return rows.map(({ storageKey, ...row }) => ({
    ...row,
    galleryEligible: Boolean(row.allowGallery),
    galleryPublished: row.galleryStatus === 'published',
    previewUrl: storageKey ? urlFor(storageKey) : null,
    referencePreviewUrl: (() => {
      if (!row.generationId) return null;
      const byRole = referenceKeys.get(row.generationId);
      const referenceKey =
        byRole?.get(`direction_reference:${row.direction}`) ??
        byRole?.get('reference') ??
        byRole?.values().next().value;
      return referenceKey ? urlFor(referenceKey) : null;
    })(),
  }));
}

export async function getAdminAnimationPreview(clipId: string) {
  const [version] = (await db()
    .select({
      fps: animationVersion.fps,
      frameWidth: animationVersion.frameWidth,
      frameHeight: animationVersion.frameHeight,
      framesJson: animationVersion.framesJson,
      spritesheetFileId: animationVersion.spritesheetFileId,
      videoTaskInfo: aiTask.taskInfo,
    })
    .from(animationClip)
    .innerJoin(animationSet, eq(animationSet.id, animationClip.animationSetId))
    .innerJoin(animationVersion, eq(animationVersion.clipId, animationClip.id))
    .innerJoin(assetItem, eq(assetItem.id, animationSet.itemId))
    .leftJoin(
      assetFile,
      and(
        eq(assetFile.id, animationVersion.spritesheetFileId),
        isNull(assetFile.deletedAt)
      )
    )
    // Follow the sheet's exact task, so directions, retries and edited versions
    // keep the video that actually produced this sheet.
    .leftJoin(generationTask, eq(generationTask.id, assetFile.generationTaskId))
    .leftJoin(aiTask, eq(aiTask.id, generationTask.aiTaskId))
    .where(and(animationConditions(), eq(animationClip.id, clipId)))
    .limit(1)) as {
    fps: number;
    frameWidth: number;
    frameHeight: number;
    framesJson: string;
    spritesheetFileId: string | null;
    videoTaskInfo: string | null;
  }[];
  if (!version) return null;

  let sourceVideoUrl: string | null = null;
  let sourceVideoKey: string | null = null;
  try {
    const info = JSON.parse(version.videoTaskInfo || '{}');
    sourceVideoKey =
      typeof info?.sourceVideoKey === 'string' ? info.sourceVideoKey : null;
    const url = Array.isArray(info?.videos)
      ? info.videos.find(
          (video: { videoUrl?: unknown } | null) =>
            typeof video?.videoUrl === 'string' && video.videoUrl.trim()
        )?.videoUrl
      : null;
    if (url && ['https:', 'http:'].includes(new URL(url).protocol)) {
      sourceVideoUrl = url;
    }
  } catch {
    // Older or incomplete tasks can still preview their sprite frames.
  }
  if (sourceVideoKey) {
    const storage = (await getStorageService()).getProvider('r2');
    sourceVideoUrl = storage?.getPublicUrl?.({ key: sourceVideoKey }) || null;
  }

  const frames = parseAnimationFrames(version.framesJson);
  const fileIds = [
    ...new Set(
      frames
        .map((frame) => animationFrameFileId(frame, version.spritesheetFileId))
        .filter(Boolean)
    ),
  ];
  const files: { id: string; storageKey: string }[] = [];
  // D1 allows at most 100 bound parameters per query.
  const fileBatchSize = 100;
  for (let offset = 0; offset < fileIds.length; offset += fileBatchSize) {
    const batch = await db()
      .select({ id: assetFile.id, storageKey: assetFile.storageKey })
      .from(assetFile)
      .where(
        and(
          inArray(assetFile.id, fileIds.slice(offset, offset + fileBatchSize)),
          isNull(assetFile.deletedAt)
        )
      );
    files.push(...batch);
  }
  const urlFor = await getAssetPublicUrlResolver();
  const urlByFileId = new Map<string, string>(
    files.map((file: { id: string; storageKey: string }): [string, string] => [
      file.id,
      urlFor(file.storageKey),
    ])
  );

  return {
    sourceVideoUrl,
    fps: version.fps,
    frameWidth: version.frameWidth,
    frameHeight: version.frameHeight,
    frames: frames.flatMap((frame) => {
      const fileId = animationFrameFileId(frame, version.spritesheetFileId);
      const url = urlByFileId.get(fileId);
      return url
        ? [
            {
              url,
              durationMs: frame.durationMs,
              offsetX: frame.offsetX,
              offsetY: frame.offsetY,
              crop: frame.crop,
            },
          ]
        : [];
    }),
  };
}

export type AdminAnimationPreviewData = NonNullable<
  Awaited<ReturnType<typeof getAdminAnimationPreview>>
>;
