import { Table2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { VaultLibrary } from '@/shared/blocks/assets/vault-library';
import { parseAssetMetadata } from '@/shared/lib/character-workspace';
import { listOwnedFilesByRole } from '@/shared/models/asset';
import { displayProjectName } from '@/shared/models/project';
import { getUserInfo } from '@/shared/models/user';

export default async function AssetSheetsPage() {
  const t = await getTranslations('workspace');
  const td = await getTranslations('workspace.directions');
  const user = await getUserInfo();
  const files = user ? await listOwnedFilesByRole(user.id, 'spritesheet') : [];
  return (
    <VaultLibrary
      title={t('assets.sheets.title')}
      description={t('assets.sheets.description')}
      emptyTitle={t('assets.sheets.emptyTitle')}
      emptyDescription={t('assets.sheets.emptyDescription')}
      emptyIcon={Table2}
      crumbs={[
        { title: t('assets.title'), url: '/dashboard/assets/sheets' },
        { title: t('assets.sheets.title'), is_active: true },
      ]}
      items={files.map((file) => {
        const meta = parseAssetMetadata(file.metadataJson || '{}');
        const directionKey = String(meta.direction || '');
        const direction = td.has(directionKey as never)
          ? td(directionKey as never)
          : directionKey;
        const label = file.name || t('assets.sheets.title');
        return {
          id: file.id,
          name: direction ? `${label} · ${direction}` : label,
          meta: t('assets.project', {
            name: displayProjectName(
              {
                name: file.projectName,
                settingsJson: file.projectSettingsJson,
              },
              t('projects.default')
            ),
          }),
          href: file.itemId
            ? `/dashboard/projects/${file.projectId}/characters/${file.itemId}`
            : `/dashboard/projects/${file.projectId}/characters`,
          imageUrl: file.url,
        };
      })}
    />
  );
}
