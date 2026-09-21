import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';

import { CharacterWorkspace } from '@/shared/blocks/projects/character-workspace';
import { DashboardDetailCrumb } from '@/shared/blocks/projects/project-console-header';
import {
  getItemWorkspace,
  listProjectItemsWithPreview,
} from '@/shared/models/asset';

export default async function CharacterItemLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string; itemId: string }>;
}) {
  const { projectId, itemId } = await params;
  const [workspace, characters] = await Promise.all([
    getItemWorkspace(projectId, itemId),
    listProjectItemsWithPreview(projectId, 'character'),
  ]);
  if (!workspace || workspace.item.type !== 'character') notFound();
  return (
    <>
      <DashboardDetailCrumb title={workspace.item.name} />
      <CharacterWorkspace
        projectId={projectId}
        workspace={workspace}
        characters={characters}
      />
      {children}
    </>
  );
}
