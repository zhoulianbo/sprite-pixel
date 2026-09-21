import { cookies } from 'next/headers';
import { and, count, desc, eq, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import { assetItem, project } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';
import { getDefaultProjectId } from '@/shared/lib/project-id';

export const LAST_PROJECT_COOKIE = 'sv_last_project';

export type Project = typeof project.$inferSelect;
export type NewProjectInput = {
  name: string;
  description?: string;
  gameGenre: string;
  artStyle?: string;
  paletteJson?: string | null;
  negativePrompt?: string | null;
  settingsJson?: string;
};

export function isSystemDefaultProject(value: Pick<Project, 'settingsJson'>) {
  try {
    return JSON.parse(value.settingsJson || '{}').systemDefault === true;
  } catch {
    return false;
  }
}

export function displayProjectName(
  value: Pick<Project, 'name' | 'settingsJson'>,
  defaultLabel: string
) {
  return isSystemDefaultProject(value) && value.name === 'Default Project'
    ? defaultLabel
    : value.name;
}

export async function listProjects(userId: string) {
  return db()
    .select({
      id: project.id,
      userId: project.userId,
      name: project.name,
      description: project.description,
      gameGenre: project.gameGenre,
      artStyle: project.artStyle,
      paletteJson: project.paletteJson,
      negativePrompt: project.negativePrompt,
      settingsJson: project.settingsJson,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      deletedAt: project.deletedAt,
      assetCount: count(assetItem.id),
    })
    .from(project)
    .leftJoin(
      assetItem,
      and(
        eq(assetItem.projectId, project.id),
        eq(assetItem.status, 'active'),
        isNull(assetItem.deletedAt)
      )
    )
    .where(
      and(
        eq(project.userId, userId),
        eq(project.status, 'active'),
        isNull(project.deletedAt)
      )
    )
    .groupBy(project.id)
    .orderBy(desc(project.updatedAt));
}

export async function getOwnedProject(userId: string, projectId: string) {
  const [result] = await db()
    .select()
    .from(project)
    .where(
      and(
        eq(project.id, projectId),
        eq(project.userId, userId),
        eq(project.status, 'active'),
        isNull(project.deletedAt)
      )
    )
    .limit(1);
  return result as Project | undefined;
}

export async function createProject(userId: string, input: NewProjectInput) {
  const now = new Date().toISOString();
  const [result] = await db()
    .insert(project)
    .values({
      id: getUuid(),
      userId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      gameGenre: input.gameGenre,
      artStyle: input.artStyle || 'pixel_art',
      paletteJson: input.paletteJson ?? null,
      negativePrompt: input.negativePrompt ?? null,
      settingsJson: input.settingsJson || '{}',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return result as Project;
}

export async function updateProject(
  userId: string,
  projectId: string,
  input: NewProjectInput
) {
  const existing = await getOwnedProject(userId, projectId);
  if (!existing) return undefined;

  const now = new Date().toISOString();
  const [result] = await db()
    .update(project)
    .set({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      gameGenre: input.gameGenre,
      artStyle: input.artStyle || existing.artStyle,
      updatedAt: now,
    })
    .where(
      and(
        eq(project.id, projectId),
        eq(project.userId, userId),
        eq(project.status, 'active'),
        isNull(project.deletedAt)
      )
    )
    .returning();
  return result as Project | undefined;
}

export async function deleteProject(userId: string, projectId: string) {
  const existing = await getOwnedProject(userId, projectId);
  if (!existing) return undefined;

  const now = new Date().toISOString();
  const [result] = await db()
    .update(project)
    .set({
      status: 'deleted',
      deletedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(project.id, projectId),
        eq(project.userId, userId),
        eq(project.status, 'active'),
        isNull(project.deletedAt)
      )
    )
    .returning();
  return result as Project | undefined;
}

export async function ensureDefaultProject(userId: string) {
  const existing = await listProjects(userId);
  if (existing.length > 0) return existing[0] as Project;

  const now = new Date().toISOString();
  const id = getDefaultProjectId(userId);
  await db()
    .insert(project)
    .values({
      id,
      userId,
      name: 'Default Project',
      artStyle: 'pixel_art',
      gameGenre: '',
      settingsJson: JSON.stringify({ systemDefault: true }),
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: project.id });

  return (await getOwnedProject(userId, id)) || (await listProjects(userId))[0];
}

export async function resolveCurrentProject(userId: string) {
  const cookieStore = await cookies();
  const selectedId = cookieStore.get(LAST_PROJECT_COOKIE)?.value;
  if (selectedId) {
    const selected = await getOwnedProject(userId, selectedId);
    if (selected) return selected;
  }

  const projects = await listProjects(userId);
  const systemDefault = projects.find(isSystemDefaultProject);
  if (systemDefault) return systemDefault as Project;
  if (projects[0]) return projects[0] as Project;
  return ensureDefaultProject(userId);
}
