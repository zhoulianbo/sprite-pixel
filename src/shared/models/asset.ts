import { and, desc, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  animationClip,
  animationFrame,
  animationSet,
  animationVersion,
  assetFile,
  assetItem,
  assetVariant,
  project,
} from '@/config/db/schema';
import {
  assetRolesForFileKind,
  type ProjectFileKind,
} from '@/shared/lib/asset-file-kind';
import { getAssetPublicUrlResolver } from '@/shared/services/storage';

export type AssetFile = typeof assetFile.$inferSelect;

export async function findAssetFileById(fileId: string) {
  const [result] = await db()
    .select()
    .from(assetFile)
    .where(and(eq(assetFile.id, fileId), isNull(assetFile.deletedAt)))
    .limit(1);
  return result as AssetFile | undefined;
}

export async function getOwnedAssetFile(userId: string, fileId: string) {
  const [result] = await db()
    .select({ file: assetFile })
    .from(assetFile)
    .innerJoin(project, eq(project.id, assetFile.projectId))
    .where(
      and(
        eq(assetFile.id, fileId),
        eq(project.userId, userId),
        isNull(assetFile.deletedAt)
      )
    )
    .limit(1);
  return result?.file as AssetFile | undefined;
}

export async function listProjectItems(
  projectId: string,
  type: string
): Promise<(typeof assetItem.$inferSelect)[]> {
  return db()
    .select()
    .from(assetItem)
    .where(
      and(
        eq(assetItem.projectId, projectId),
        eq(assetItem.type, type),
        eq(assetItem.status, 'active'),
        isNull(assetItem.deletedAt)
      )
    )
    .orderBy(desc(assetItem.updatedAt));
}

async function attachItemPreviews<T extends { id: string; projectId: string }>(
  items: T[]
): Promise<Array<T & { preview: (AssetFile & { url: string }) | null }>> {
  if (!items.length) {
    return items.map((item) => ({ ...item, preview: null }));
  }
  const files = await db()
    .select()
    .from(assetFile)
    .where(
      and(
        inArray(
          assetFile.itemId,
          items.map((item) => item.id)
        ),
        eq(assetFile.status, 'ready'),
        isNull(assetFile.deletedAt)
      )
    )
    .orderBy(desc(assetFile.isActiveReference), desc(assetFile.createdAt));
  const previewByItem = new Map<string, (typeof files)[number]>();
  for (const file of files) {
    if (file.itemId && !previewByItem.has(file.itemId)) {
      previewByItem.set(file.itemId, file);
    }
  }
  const urlFor = await getAssetPublicUrlResolver();
  return items.map((item) => {
    const file = previewByItem.get(item.id);
    return {
      ...item,
      preview: file ? { ...file, url: urlFor(file.storageKey) } : null,
    };
  });
}

export async function listProjectItemsWithPreview(
  projectId: string,
  type: string
) {
  return attachItemPreviews(await listProjectItems(projectId, type));
}

export async function listOwnedItemsWithPreview(userId: string, type: string) {
  const items = (await db()
    .select({
      id: assetItem.id,
      projectId: assetItem.projectId,
      name: assetItem.name,
      description: assetItem.description,
      type: assetItem.type,
      updatedAt: assetItem.updatedAt,
      projectName: project.name,
      projectSettingsJson: project.settingsJson,
    })
    .from(assetItem)
    .innerJoin(project, eq(project.id, assetItem.projectId))
    .where(
      and(
        eq(project.userId, userId),
        eq(assetItem.type, type),
        eq(assetItem.status, 'active'),
        eq(project.status, 'active'),
        isNull(assetItem.deletedAt),
        isNull(project.deletedAt)
      )
    )
    .orderBy(desc(assetItem.updatedAt))) as Array<{
    id: string;
    projectId: string;
    name: string;
    description: string | null;
    type: string;
    updatedAt: string;
    projectName: string;
    projectSettingsJson: string;
  }>;
  return attachItemPreviews(items);
}

export type OwnedAssetFile = {
  id: string;
  projectId: string;
  itemId: string | null;
  name: string | null;
  metadataJson: string;
  createdAt: string;
  projectName: string;
  projectSettingsJson: string;
  url: string;
};

export async function listOwnedProjectReadyImages(
  userId: string,
  projectId: string,
  kind?: ProjectFileKind
): Promise<OwnedAssetFile[]> {
  const roles = kind ? assetRolesForFileKind(kind) : undefined;
  const rows = await db()
    .select({
      id: assetFile.id,
      projectId: assetFile.projectId,
      itemId: assetFile.itemId,
      name: assetItem.name,
      metadataJson: assetFile.metadataJson,
      createdAt: assetFile.createdAt,
      projectName: project.name,
      projectSettingsJson: project.settingsJson,
      storageKey: assetFile.storageKey,
    })
    .from(assetFile)
    .innerJoin(project, eq(project.id, assetFile.projectId))
    .leftJoin(assetItem, eq(assetItem.id, assetFile.itemId))
    .where(
      and(
        eq(project.userId, userId),
        eq(assetFile.projectId, projectId),
        eq(assetFile.mediaType, 'image'),
        eq(assetFile.status, 'ready'),
        eq(project.status, 'active'),
        isNull(assetFile.deletedAt),
        isNull(project.deletedAt),
        roles ? inArray(assetFile.role, roles) : undefined
      )
    )
    .orderBy(desc(assetFile.createdAt));
  const urlFor = await getAssetPublicUrlResolver();
  return rows.map(
    (row: {
      id: string;
      projectId: string;
      itemId: string | null;
      name: string | null;
      metadataJson: string;
      createdAt: string;
      projectName: string;
      projectSettingsJson: string;
      storageKey: string;
    }) => ({
      id: row.id,
      projectId: row.projectId,
      itemId: row.itemId,
      name: row.name,
      metadataJson: row.metadataJson,
      createdAt: row.createdAt,
      projectName: row.projectName,
      projectSettingsJson: row.projectSettingsJson,
      url: urlFor(row.storageKey),
    })
  );
}

export async function listOwnedFilesByRole(
  userId: string,
  role: string
): Promise<OwnedAssetFile[]> {
  const rows = await db()
    .select({
      id: assetFile.id,
      projectId: assetFile.projectId,
      itemId: assetFile.itemId,
      name: assetItem.name,
      metadataJson: assetFile.metadataJson,
      createdAt: assetFile.createdAt,
      projectName: project.name,
      projectSettingsJson: project.settingsJson,
      storageKey: assetFile.storageKey,
    })
    .from(assetFile)
    .innerJoin(project, eq(project.id, assetFile.projectId))
    .leftJoin(assetItem, eq(assetItem.id, assetFile.itemId))
    .where(
      and(
        eq(project.userId, userId),
        eq(assetFile.role, role),
        eq(assetFile.status, 'ready'),
        eq(project.status, 'active'),
        isNull(assetFile.deletedAt),
        isNull(project.deletedAt)
      )
    )
    .orderBy(desc(assetFile.createdAt));
  const urlFor = await getAssetPublicUrlResolver();
  return rows.map(
    (row: {
      id: string;
      projectId: string;
      itemId: string | null;
      name: string | null;
      metadataJson: string;
      createdAt: string;
      projectName: string;
      projectSettingsJson: string;
      storageKey: string;
    }) => ({
      id: row.id,
      projectId: row.projectId,
      itemId: row.itemId,
      name: row.name,
      metadataJson: row.metadataJson,
      createdAt: row.createdAt,
      projectName: row.projectName,
      projectSettingsJson: row.projectSettingsJson,
      url: urlFor(row.storageKey),
    })
  );
}

export async function getProjectItem(projectId: string, itemId: string) {
  const [item] = await db()
    .select()
    .from(assetItem)
    .where(
      and(
        eq(assetItem.id, itemId),
        eq(assetItem.projectId, projectId),
        isNull(assetItem.deletedAt)
      )
    )
    .limit(1);
  return item;
}

export async function getItemWorkspace(projectId: string, itemId: string) {
  const item = await getProjectItem(projectId, itemId);
  if (!item) return null;
  const variants = await db()
    .select()
    .from(assetVariant)
    .where(
      and(
        eq(assetVariant.projectId, projectId),
        eq(assetVariant.itemId, itemId),
        isNull(assetVariant.deletedAt)
      )
    )
    .orderBy(assetVariant.sortOrder);
  const files = await db()
    .select()
    .from(assetFile)
    .where(
      and(
        eq(assetFile.projectId, projectId),
        eq(assetFile.itemId, itemId),
        isNull(assetFile.deletedAt)
      )
    )
    .orderBy(desc(assetFile.createdAt));
  const animations = await db()
    .select({
      set: animationSet,
      clip: animationClip,
      version: animationVersion,
    })
    .from(animationSet)
    .innerJoin(animationClip, eq(animationClip.animationSetId, animationSet.id))
    .leftJoin(
      animationVersion,
      and(
        eq(animationVersion.clipId, animationClip.id),
        eq(animationVersion.isCurrent, true)
      )
    )
    .where(
      and(
        eq(animationSet.projectId, projectId),
        eq(animationSet.itemId, itemId),
        isNull(animationSet.deletedAt)
      )
    )
    .orderBy(desc(animationSet.updatedAt), animationClip.sortOrder);
  const urlFor = await getAssetPublicUrlResolver();
  const animationsWithFrames = await Promise.all(
    animations.map(async (animation: any) => {
      if (!animation.version) return { ...animation, frames: [] };
      const frames = await db()
        .select({ frame: animationFrame, file: assetFile })
        .from(animationFrame)
        .innerJoin(assetFile, eq(assetFile.id, animationFrame.fileId))
        .where(eq(animationFrame.versionId, animation.version.id))
        .orderBy(animationFrame.frameIndex);
      return {
        ...animation,
        frames: frames.map(({ frame, file }: any) => ({
          ...frame,
          metadata: JSON.parse(frame.metadataJson || '{}'),
          file: { ...file, url: urlFor(file.storageKey) },
        })),
      };
    })
  );
  return {
    item,
    variants,
    files: files.map((file: any) => ({
      ...file,
      url: urlFor(file.storageKey),
    })),
    animations: animationsWithFrames,
  };
}

export async function setActiveBaseReference(
  projectId: string,
  itemId: string,
  variantId: string,
  fileId: string
) {
  return db().transaction(async (tx: any) => {
    const [candidate] = await tx
      .select({ id: assetFile.id })
      .from(assetFile)
      .where(
        and(
          eq(assetFile.id, fileId),
          eq(assetFile.projectId, projectId),
          eq(assetFile.itemId, itemId),
          eq(assetFile.variantId, variantId),
          isNull(assetFile.deletedAt)
        )
      )
      .limit(1);
    if (!candidate) return undefined;

    await tx
      .update(assetFile)
      .set({ isActiveReference: false, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(assetFile.projectId, projectId),
          eq(assetFile.itemId, itemId),
          eq(assetFile.isActiveReference, true),
          isNull(assetFile.deletedAt)
        )
      );
    const [result] = await tx
      .update(assetFile)
      .set({ isActiveReference: true, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(assetFile.id, fileId),
          eq(assetFile.projectId, projectId),
          eq(assetFile.itemId, itemId),
          eq(assetFile.variantId, variantId),
          isNull(assetFile.deletedAt)
        )
      )
      .returning();
    return result;
  });
}

export async function updateCharacterFileName(
  projectId: string,
  itemId: string,
  fileId: string,
  name: string
) {
  const now = new Date().toISOString();
  const [file] = await db()
    .select({ variantId: assetFile.variantId })
    .from(assetFile)
    .where(
      and(
        eq(assetFile.id, fileId),
        eq(assetFile.projectId, projectId),
        eq(assetFile.itemId, itemId),
        isNull(assetFile.deletedAt)
      )
    )
    .limit(1);
  if (!file?.variantId) return undefined;
  const [result] = await db()
    .update(assetVariant)
    .set({
      name,
      updatedAt: now,
    })
    .where(
      and(
        eq(assetVariant.id, file.variantId),
        eq(assetVariant.projectId, projectId),
        eq(assetVariant.itemId, itemId),
        isNull(assetVariant.deletedAt)
      )
    )
    .returning();
  return result;
}

export async function updateCharacterItem(
  projectId: string,
  itemId: string,
  input: { name: string }
) {
  const now = new Date().toISOString();
  const [result] = await db()
    .update(assetItem)
    .set({
      name: input.name,
      updatedAt: now,
    })
    .where(
      and(
        eq(assetItem.id, itemId),
        eq(assetItem.projectId, projectId),
        eq(assetItem.type, 'character'),
        eq(assetItem.status, 'active'),
        isNull(assetItem.deletedAt)
      )
    )
    .returning();
  return result;
}

export async function deleteCharacterItem(projectId: string, itemId: string) {
  const now = new Date().toISOString();
  const [result] = await db()
    .update(assetItem)
    .set({
      status: 'deleted',
      deletedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(assetItem.id, itemId),
        eq(assetItem.projectId, projectId),
        eq(assetItem.type, 'character'),
        eq(assetItem.status, 'active'),
        isNull(assetItem.deletedAt)
      )
    )
    .returning();
  return result;
}

export async function deleteCharacterFile(
  projectId: string,
  itemId: string,
  fileId: string
) {
  const now = new Date().toISOString();
  const [result] = await db()
    .update(assetFile)
    .set({
      isActiveReference: false,
      deletedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(assetFile.id, fileId),
        eq(assetFile.projectId, projectId),
        eq(assetFile.itemId, itemId),
        isNull(assetFile.deletedAt)
      )
    )
    .returning();
  return result;
}
