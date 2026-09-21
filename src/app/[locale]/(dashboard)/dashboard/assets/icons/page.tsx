import { Boxes } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { VaultLibrary } from '@/shared/blocks/assets/vault-library';
import { listOwnedItemsWithPreview } from '@/shared/models/asset';
import { displayProjectName } from '@/shared/models/project';
import { getUserInfo } from '@/shared/models/user';

export default async function AssetIconsPage() {
  const t = await getTranslations('workspace');
  const user = await getUserInfo();
  const items = user ? await listOwnedItemsWithPreview(user.id, 'icon') : [];
  return (
    <VaultLibrary
      title={t('assets.icons.title')}
      description={t('assets.icons.description')}
      emptyTitle={t('assets.icons.emptyTitle')}
      emptyDescription={t('assets.icons.emptyDescription')}
      emptyIcon={Boxes}
      crumbs={[
        { title: t('assets.title'), url: '/dashboard/assets/icons' },
        { title: t('assets.icons.title'), is_active: true },
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
        href: `/dashboard/projects/${item.projectId}/icons`,
        imageUrl: item.preview?.url,
      }))}
    />
  );
}
