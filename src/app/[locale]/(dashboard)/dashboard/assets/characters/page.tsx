import { UserRound } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { VaultLibrary } from '@/shared/blocks/assets/vault-library';
import { listOwnedItemsWithPreview } from '@/shared/models/asset';
import { displayProjectName } from '@/shared/models/project';
import { getUserInfo } from '@/shared/models/user';

export default async function AssetCharactersPage() {
  const t = await getTranslations('workspace');
  const user = await getUserInfo();
  const items = user
    ? await listOwnedItemsWithPreview(user.id, 'character')
    : [];
  return (
    <VaultLibrary
      title={t('assets.characters.title')}
      description={t('assets.characters.description')}
      emptyTitle={t('assets.characters.emptyTitle')}
      emptyDescription={t('assets.characters.emptyDescription')}
      emptyIcon={UserRound}
      crumbs={[
        { title: t('assets.title'), url: '/dashboard/assets/characters' },
        { title: t('assets.characters.title'), is_active: true },
      ]}
      items={items.map((item) => ({
        id: item.id,
        name: item.name,
        meta: t('assets.project', {
          name: displayProjectName(
            { name: item.projectName, settingsJson: item.projectSettingsJson },
            t('projects.default')
          ),
        }),
        href: `/dashboard/projects/${item.projectId}/characters/${item.id}`,
        imageUrl: item.preview?.url,
      }))}
    />
  );
}
