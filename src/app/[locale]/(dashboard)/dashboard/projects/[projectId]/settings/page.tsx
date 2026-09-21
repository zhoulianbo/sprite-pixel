import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { ProjectSettingsForm } from '@/shared/blocks/projects/project-settings-form';
import {
  getOwnedProject,
  isSystemDefaultProject,
} from '@/shared/models/project';
import { getUserInfo } from '@/shared/models/user';

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getUserInfo();
  if (!user) notFound();
  const project = await getOwnedProject(user.id, projectId);
  if (!project) notFound();
  const t = await getTranslations('workspace');
  const title =
    isSystemDefaultProject(project) && project.name === 'Default Project'
      ? t('projects.default')
      : project.name;

  return (
    <div className="w-full max-w-3xl space-y-7">
      <header className="max-w-2xl">
        <h1 className="font-heading text-3xl font-semibold">
          {t('projectSettings.title')}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          {t('projectSettings.description')}
        </p>
      </header>
      <ProjectSettingsForm
        title={title}
        project={{
          id: project.id,
          name: project.name,
          description: project.description,
          settingsJson: project.settingsJson,
          gameGenre: project.gameGenre,
          artStyle: project.artStyle,
        }}
      />
    </div>
  );
}
