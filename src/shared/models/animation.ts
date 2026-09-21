import { and, asc, desc, eq, inArray, isNull, max } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  animationClip,
  animationFrame,
  animationSet,
  animationVersion,
  assetFile,
  assetItem,
  project,
} from '@/config/db/schema';
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

  const versionIds = rows
    .map((row: { version?: { id?: string } | null }) => row.version?.id)
    .filter((id: string | undefined): id is string => Boolean(id));
  const previewByVersion = new Map<string, string>();
  if (versionIds.length) {
    const frames = await db()
      .select({
        versionId: animationFrame.versionId,
        storageKey: assetFile.storageKey,
      })
      .from(animationFrame)
      .innerJoin(assetFile, eq(assetFile.id, animationFrame.fileId))
      .where(
        and(
          inArray(animationFrame.versionId, versionIds),
          eq(animationFrame.frameIndex, 0)
        )
      );
    const urlFor = await getAssetPublicUrlResolver();
    for (const frame of frames) {
      if (!previewByVersion.has(frame.versionId)) {
        previewByVersion.set(frame.versionId, urlFor(frame.storageKey));
      }
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
        ? previewByVersion.get(row.version.id) || null
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
      version: animationVersion,
      clip: animationClip,
      set: animationSet,
      item: assetItem,
    })
    .from(animationVersion)
    .innerJoin(animationClip, eq(animationClip.id, animationVersion.clipId))
    .innerJoin(animationSet, eq(animationSet.id, animationClip.animationSetId))
    .innerJoin(project, eq(project.id, animationSet.projectId))
    .innerJoin(assetItem, eq(assetItem.id, animationSet.itemId))
    .where(and(eq(animationVersion.id, versionId), eq(project.userId, userId)))
    .limit(1);
  if (!context) return null;
  const frames = await db()
    .select({ frame: animationFrame, file: assetFile })
    .from(animationFrame)
    .innerJoin(assetFile, eq(assetFile.id, animationFrame.fileId))
    .where(eq(animationFrame.versionId, versionId))
    .orderBy(asc(animationFrame.frameIndex));
  const urlFor = await getAssetPublicUrlResolver();
  return {
    ...context,
    frames: frames.map(({ frame, file }: any) => ({
      ...frame,
      metadata: JSON.parse(frame.metadataJson || '{}'),
      file: { ...file, url: urlFor(file.storageKey) },
    })),
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
  const sourceFrames = input.frames.length
    ? await db()
        .select()
        .from(animationFrame)
        .where(
          and(
            eq(animationFrame.versionId, input.parentVersionId),
            inArray(
              animationFrame.id,
              input.frames.map((frame) => frame.frameId)
            )
          )
        )
    : [];
  const sourceById = new Map(
    sourceFrames.map((frame: any) => [frame.id, frame])
  );
  if (sourceFrames.length !== input.frames.length) return null;

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
      editorJson: owned.parent.editorJson,
      createdAt: now,
    });
    if (input.frames.length) {
      await tx.insert(animationFrame).values(
        input.frames.map((frame, frameIndex) => {
          const source = sourceById.get(
            frame.frameId
          ) as typeof animationFrame.$inferSelect;
          return {
            id: getUuid(),
            versionId,
            fileId: source.fileId,
            frameIndex,
            durationMs: frame.durationMs ?? source.durationMs,
            offsetX: frame.offsetX,
            offsetY: frame.offsetY,
            metadataJson: source.metadataJson,
            createdAt: now,
          };
        })
      );
    }
    await tx
      .update(animationSet)
      .set({ loop: input.loop, updatedAt: now })
      .where(eq(animationSet.id, owned.set.id));
  });
  return getAnimationEditorData(userId, versionId);
}
