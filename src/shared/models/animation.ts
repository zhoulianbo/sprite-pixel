import { and, asc, desc, eq, inArray, isNull, max } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  animationClip,
  animationSet,
  animationVersion,
  assetFile,
  assetItem,
  project,
} from '@/config/db/schema';
import {
  animationFrameFileId,
  parseAnimationFrames,
  type StoredAnimationFrame,
} from '@/shared/lib/animation-frames';
import { getUuid } from '@/shared/lib/hash';
import { getAssetPublicUrlResolver } from '@/shared/services/storage';

export type OwnedAnimationClip = {
  clipId: string;
  versionId: string | null;
  projectId: string;
  itemId: string;
  name: string;
  action: string;
  direction: string;
  frameCount: number;
  fps: number;
  projectName: string;
  projectSettingsJson: string;
  previewUrl: string | null;
};

export async function listOwnedAnimationClips(
  userId: string
): Promise<OwnedAnimationClip[]> {
  const rows = await db()
    .select({
      clip: animationClip,
      set: animationSet,
      version: animationVersion,
      projectName: project.name,
      projectSettingsJson: project.settingsJson,
    })
    .from(animationClip)
    .innerJoin(animationSet, eq(animationSet.id, animationClip.animationSetId))
    .innerJoin(project, eq(project.id, animationSet.projectId))
    .innerJoin(assetItem, eq(assetItem.id, animationSet.itemId))
    .leftJoin(
      animationVersion,
      and(
        eq(animationVersion.clipId, animationClip.id),
        eq(animationVersion.isCurrent, true)
      )
    )
    .where(
      and(
        eq(project.userId, userId),
        eq(project.status, 'active'),
        isNull(animationSet.deletedAt),
        isNull(assetItem.deletedAt),
        isNull(project.deletedAt)
      )
    )
    .orderBy(desc(animationSet.updatedAt), animationClip.sortOrder);

  const previewFileIdByVersion = new Map<string, string>();
  for (const row of rows) {
    if (!row.version) continue;
    const firstFrame = parseAnimationFrames(row.version.framesJson)[0];
    const fileId = firstFrame
      ? animationFrameFileId(firstFrame, row.version.spritesheetFileId)
      : row.version.spritesheetFileId || '';
    if (fileId) previewFileIdByVersion.set(row.version.id, fileId);
  }
  const previewFileIds = [...new Set(previewFileIdByVersion.values())];
  const previewByFileId = new Map<string, string>();
  if (previewFileIds.length) {
    const files = await db()
      .select({ id: assetFile.id, storageKey: assetFile.storageKey })
      .from(assetFile)
      .where(
        and(inArray(assetFile.id, previewFileIds), isNull(assetFile.deletedAt))
      );
    const urlFor = await getAssetPublicUrlResolver();
    for (const file of files) {
      previewByFileId.set(file.id, urlFor(file.storageKey));
    }
  }

  return rows.map(
    (row: {
      clip: { id: string; direction: string };
      set: { projectId: string; itemId: string; name: string; action: string };
      version?: {
        id?: string | null;
        frameCount?: number | null;
        fps?: number | null;
      } | null;
      projectName: string;
      projectSettingsJson: string;
    }) => ({
      clipId: row.clip.id,
      versionId: row.version?.id || null,
      projectId: row.set.projectId,
      itemId: row.set.itemId,
      name: row.set.name,
      action: row.set.action,
      direction: row.clip.direction,
      frameCount: row.version?.frameCount || 0,
      fps: row.version?.fps || 0,
      projectName: row.projectName,
      projectSettingsJson: row.projectSettingsJson,
      previewUrl: row.version?.id
        ? previewByFileId.get(
            previewFileIdByVersion.get(row.version.id) || ''
          ) || null
        : null,
    })
  );
}

export async function getAnimationEditorData(
  userId: string,
  versionId: string
) {
  const [context] = await db()
    .select({
      version: {
        id: animationVersion.id,
        fps: animationVersion.fps,
        frameWidth: animationVersion.frameWidth,
        frameHeight: animationVersion.frameHeight,
        frameCount: animationVersion.frameCount,
        versionNo: animationVersion.versionNo,
        spritesheetFileId: animationVersion.spritesheetFileId,
        framesJson: animationVersion.framesJson,
        editorJson: animationVersion.editorJson,
      },
      clip: {
        id: animationClip.id,
        direction: animationClip.direction,
      },
      set: {
        id: animationSet.id,
        loop: animationSet.loop,
        projectId: animationSet.projectId,
        itemId: animationSet.itemId,
        name: animationSet.name,
        action: animationSet.action,
      },
      item: {
        id: assetItem.id,
        name: assetItem.name,
      },
    })
    .from(animationVersion)
    .innerJoin(animationClip, eq(animationClip.id, animationVersion.clipId))
    .innerJoin(animationSet, eq(animationSet.id, animationClip.animationSetId))
    .innerJoin(project, eq(project.id, animationSet.projectId))
    .innerJoin(assetItem, eq(assetItem.id, animationSet.itemId))
    .where(and(eq(animationVersion.id, versionId), eq(project.userId, userId)))
    .limit(1);
  if (!context) return null;
  const storedFrames = parseAnimationFrames(context.version.framesJson);
  const fileIds = [
    ...new Set(
      storedFrames
        .map((frame) =>
          animationFrameFileId(frame, context.version.spritesheetFileId)
        )
        .filter(Boolean)
    ),
  ];
  const [versions, files, urlFor] = await Promise.all([
    db()
      .select({
        id: animationVersion.id,
        versionNo: animationVersion.versionNo,
        isCurrent: animationVersion.isCurrent,
      })
      .from(animationVersion)
      .where(eq(animationVersion.clipId, context.clip.id))
      .orderBy(asc(animationVersion.versionNo)),
    fileIds.length
      ? db()
          .select()
          .from(assetFile)
          .where(
            and(
              inArray(assetFile.id, fileIds),
              eq(assetFile.projectId, context.set.projectId),
              isNull(assetFile.deletedAt)
            )
          )
      : Promise.resolve([]),
    getAssetPublicUrlResolver(),
  ]);
  const filesById = new Map(files.map((file: any) => [file.id, file]));
  return {
    ...context,
    version: {
      id: context.version.id,
      fps: context.version.fps,
      frameWidth: context.version.frameWidth,
      frameHeight: context.version.frameHeight,
      versionNo: context.version.versionNo,
    },
    versions,
    frames: storedFrames.flatMap((frame, frameIndex) => {
      const fileId = animationFrameFileId(
        frame,
        context.version.spritesheetFileId
      );
      const file = filesById.get(fileId) as
        typeof assetFile.$inferSelect | undefined;
      if (!file) return [];
      return [
        {
          id: frame.id,
          fileId,
          frameIndex,
          durationMs: frame.durationMs,
          offsetX: frame.offsetX,
          offsetY: frame.offsetY,
          metadata: frame.crop ? { crop: frame.crop } : {},
          file: { id: file.id, url: urlFor(file.storageKey) },
        },
      ];
    }),
  };
}

export async function saveAnimationVersion(
  userId: string,
  clipId: string,
  input: {
    parentVersionId: string;
    fps: number;
    loop: boolean;
    frames: Array<{
      frameId: string;
      fileId?: string;
      durationMs?: number | null;
      offsetX: number;
      offsetY: number;
    }>;
  }
) {
  const [owned] = await db()
    .select({
      clip: animationClip,
      set: animationSet,
      parent: animationVersion,
    })
    .from(animationClip)
    .innerJoin(animationSet, eq(animationSet.id, animationClip.animationSetId))
    .innerJoin(project, eq(project.id, animationSet.projectId))
    .innerJoin(
      animationVersion,
      and(
        eq(animationVersion.id, input.parentVersionId),
        eq(animationVersion.clipId, animationClip.id)
      )
    )
    .where(and(eq(animationClip.id, clipId), eq(project.userId, userId)))
    .limit(1);
  if (!owned) return null;
  const sourceFrames = parseAnimationFrames(owned.parent.framesJson);
  const sourceById = new Map<string, StoredAnimationFrame>(
    sourceFrames.map((frame) => [frame.id, frame])
  );
  if (
    new Set(input.frames.map((frame) => frame.frameId)).size !==
      input.frames.length ||
    input.frames.some((frame) => !sourceById.has(frame.frameId))
  ) {
    return null;
  }
  const nextFrames = input.frames.map((frame) => {
    const source = sourceById.get(frame.frameId)!;
    const sourceFileId = animationFrameFileId(
      source,
      owned.parent.spritesheetFileId
    );
    const fileId = frame.fileId || sourceFileId;
    return {
      id: getUuid(),
      ...(fileId && fileId !== owned.parent.spritesheetFileId
        ? { fileId }
        : {}),
      durationMs: frame.durationMs ?? source.durationMs,
      offsetX: frame.fileId ? 0 : frame.offsetX,
      offsetY: frame.fileId ? 0 : frame.offsetY,
      ...(frame.fileId || !source.crop ? {} : { crop: source.crop }),
    } satisfies StoredAnimationFrame;
  });
  const referencedFileIds = [
    ...new Set(
      nextFrames
        .map((frame) =>
          animationFrameFileId(frame, owned.parent.spritesheetFileId)
        )
        .filter(Boolean)
    ),
  ];
  const referencedFiles = referencedFileIds.length
    ? await db()
        .select({ id: assetFile.id })
        .from(assetFile)
        .where(
          and(
            inArray(assetFile.id, referencedFileIds),
            eq(assetFile.projectId, owned.set.projectId),
            eq(assetFile.itemId, owned.set.itemId),
            eq(assetFile.status, 'ready'),
            isNull(assetFile.deletedAt)
          )
        )
    : [];
  if (referencedFiles.length !== referencedFileIds.length) return null;

  const [maximum] = await db()
    .select({ value: max(animationVersion.versionNo) })
    .from(animationVersion)
    .where(eq(animationVersion.clipId, clipId));
  const versionId = getUuid();
  const now = new Date().toISOString();
  await db().transaction(async (tx: any) => {
    await tx
      .update(animationVersion)
      .set({ isCurrent: false })
      .where(eq(animationVersion.clipId, clipId));
    await tx.insert(animationVersion).values({
      id: versionId,
      clipId,
      versionNo: Number(maximum?.value || 0) + 1,
      parentVersionId: input.parentVersionId,
      generationId: owned.parent.generationId,
      isCurrent: true,
      fps: input.fps,
      frameWidth: owned.parent.frameWidth,
      frameHeight: owned.parent.frameHeight,
      frameCount: input.frames.length,
      spritesheetFileId: owned.parent.spritesheetFileId,
      framesJson: JSON.stringify(nextFrames),
      editorJson: owned.parent.editorJson,
      createdAt: now,
    });
    await tx
      .update(animationSet)
      .set({ loop: input.loop, updatedAt: now })
      .where(eq(animationSet.id, owned.set.id));
  });
  return getAnimationEditorData(userId, versionId);
}
