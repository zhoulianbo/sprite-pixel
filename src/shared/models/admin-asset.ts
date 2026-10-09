import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  animationClip,
  animationSet,
  animationVersion,
  assetFile,
  assetItem,
  project,
  user,
} from '@/config/db/schema';
import {
  animationFrameFileId,
  parseAnimationFrames,
} from '@/shared/lib/animation-frames';
import { getAssetPublicUrlResolver } from '@/shared/services/storage';

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
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  framesJson: string;
  spritesheetFileId: string | null;
};

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
    })
    .from(assetFile)
    .innerJoin(assetItem, eq(assetItem.id, assetFile.itemId))
    .innerJoin(project, eq(project.id, assetItem.projectId))
    .innerJoin(user, eq(user.id, project.userId))
    .where(assetConditions(kind, email))
    .orderBy(desc(assetItem.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const urlFor = await getAssetPublicUrlResolver();
  return rows.map(({ storageKey, ...row }: (typeof rows)[number]) => ({
    ...row,
    previewUrl: urlFor(storageKey),
  }));
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
      frameWidth: animationVersion.frameWidth,
      frameHeight: animationVersion.frameHeight,
      frameCount: animationVersion.frameCount,
      framesJson: animationVersion.framesJson,
      spritesheetFileId: animationVersion.spritesheetFileId,
    })
    .from(animationClip)
    .innerJoin(animationSet, eq(animationSet.id, animationClip.animationSetId))
    .innerJoin(animationVersion, eq(animationVersion.clipId, animationClip.id))
    .innerJoin(assetItem, eq(assetItem.id, animationSet.itemId))
    .innerJoin(project, eq(project.id, animationSet.projectId))
    .innerJoin(user, eq(user.id, project.userId))
    .where(animationConditions(email))
    .orderBy(desc(animationVersion.createdAt))
    .limit(limit)
    .offset((page - 1) * limit)) as AdminAnimationRow[];

  const fileIds = [
    ...new Set(
      rows.flatMap((row) =>
        parseAnimationFrames(row.framesJson)
          .map((frame) => animationFrameFileId(frame, row.spritesheetFileId))
          .filter(Boolean)
      )
    ),
  ];
  const files = fileIds.length
    ? await db()
        .select({ id: assetFile.id, storageKey: assetFile.storageKey })
        .from(assetFile)
        .where(and(inArray(assetFile.id, fileIds), isNull(assetFile.deletedAt)))
    : [];
  const urlFor = await getAssetPublicUrlResolver();
  const urlByFileId = new Map<string, string>(
    files.map((file: { id: string; storageKey: string }): [string, string] => [
      file.id,
      urlFor(file.storageKey),
    ])
  );

  return rows.map(({ framesJson, spritesheetFileId, ...row }) => ({
    ...row,
    frames: parseAnimationFrames(framesJson).flatMap((frame) => {
      const fileId = animationFrameFileId(frame, spritesheetFileId);
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
  }));
}
