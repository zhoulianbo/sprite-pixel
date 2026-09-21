import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { ProjectConsoleShell } from '@/shared/blocks/projects/project-console-header';
import {
  getOwnedProject,
  isSystemDefaultProject,
} from '@/shared/models/project';
import { getUserInfo } from '@/shared/models/user';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getUserInfo();
  if (!user) notFound();
  const project = await getOwnedProject(user.id, projectId);
  if (!project) notFound();
  const t = await getTranslations('workspace.projects');
  const projectName =
    isSystemDefaultProject(project) && project.name === 'Default Project'
      ? t('default')
      : project.name;
  return (
    <ProjectConsoleShell projectId={project.id} projectName={projectName}>
      {children}
    </ProjectConsoleShell>
  );
}
