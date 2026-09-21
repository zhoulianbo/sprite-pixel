import { getTranslations } from 'next-intl/server';

import { ProjectEmptySection } from '@/shared/blocks/projects/project-empty-section';

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const t = await getTranslations('workspace.nav');
  return <ProjectEmptySection projectId={projectId} section={t('scenes')} />;
}
