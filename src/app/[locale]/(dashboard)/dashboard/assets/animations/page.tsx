import { Film } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { VaultLibrary } from '@/shared/blocks/assets/vault-library';
import { listOwnedAnimationClips } from '@/shared/models/animation';
import { displayProjectName } from '@/shared/models/project';
import { getUserInfo } from '@/shared/models/user';

export default async function AssetAnimationsPage() {
  const t = await getTranslations('workspace');
  const td = await getTranslations('workspace.directions');
  const user = await getUserInfo();
  const clips = user ? await listOwnedAnimationClips(user.id) : [];
  return (
    <VaultLibrary
      title={t('assets.animations.title')}
      description={t('assets.animations.description')}
      emptyTitle={t('assets.animations.emptyTitle')}
      emptyDescription={t('assets.animations.emptyDescription')}
      emptyIcon={Film}
      crumbs={[
        { title: t('assets.title'), url: '/dashboard/assets/animations' },
        { title: t('assets.animations.title'), is_active: true },
      ]}
      items={clips.map((clip) => {
        const direction = td.has(clip.direction as never)
          ? td(clip.direction as never)
          : clip.direction;
        return {
          id: clip.clipId,
          name: `${clip.name} · ${direction}`,
          meta: t('assets.project', {
            name: displayProjectName(
              {
                name: clip.projectName,
                settingsJson: clip.projectSettingsJson,
              },
              t('projects.default')
            ),
          }),
          href: clip.versionId
            ? `/editor/animations/${clip.versionId}`
            : `/dashboard/projects/${clip.projectId}/characters/${clip.itemId}`,
          imageUrl: clip.previewUrl,
        };
      })}
    />
  );
}
