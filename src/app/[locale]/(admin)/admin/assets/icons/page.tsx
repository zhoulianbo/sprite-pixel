import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { ZoomableImage } from '@/shared/blocks/common/zoomable-image';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import {
  getAdminAssets,
  getAdminAssetsCount,
} from '@/shared/models/admin-asset';
import { Crumb, Search } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

export default async function AdminIconsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    email?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission({
    code: PERMISSIONS.AITASKS_READ,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.assets');
  const {
    page: pageValue,
    pageSize: pageSizeValue,
    email,
  } = await searchParams;
  const page = Math.max(1, Number(pageValue) || 1);
  const limit = Math.max(1, Number(pageSizeValue) || 30);
  const [total, assets] = await Promise.all([
    getAdminAssetsCount({ kind: 'icon', email }),
    getAdminAssets({ kind: 'icon', email, page, limit }),
  ]);

  const crumbs: Crumb[] = [
    { title: t('crumbs.admin'), url: '/admin' },
    { title: t('icons.title'), is_active: true },
  ];
  const search: Search = {
    name: 'email',
    title: t('search.email'),
    placeholder: t('search.emailPlaceholder'),
    value: email,
  };
  const table: Table = {
    columns: [
      {
        name: 'previewUrl',
        title: t('fields.preview'),
        callback: (item: (typeof assets)[number]) => (
          <ZoomableImage
            alt={t('icons.previewLabel', { name: item.name })}
            className="size-20"
            src={item.previewUrl}
            zoomLabel={t('icons.zoomLabel', { name: item.name })}
          />
        ),
      },
      {
        name: 'name',
        title: t('fields.name'),
        className: 'w-48 max-w-48 whitespace-normal align-middle',
        callback: (item: (typeof assets)[number]) => (
          <div className="w-48 max-w-48 text-sm break-words whitespace-pre-wrap">
            {item.name}
          </div>
        ),
      },
      { name: 'user', title: t('fields.user'), type: 'user' },
      { name: 'projectName', title: t('fields.project') },
      {
        name: 'description',
        title: t('fields.description'),
        className: 'w-80 max-w-80 whitespace-normal align-middle',
        placeholder: '-',
        callback: (item: (typeof assets)[number]) =>
          item.description?.trim() ? (
            <div className="w-80 max-w-80 text-sm break-words whitespace-pre-wrap">
              {item.description}
            </div>
          ) : null,
      },
      { name: 'createdAt', title: t('fields.createdAt'), type: 'time' },
    ],
    data: assets.map((asset: (typeof assets)[number]) => ({
      ...asset,
      user: asset.owner,
    })),
    emptyMessage: t('icons.empty'),
    pagination: { total, page, limit },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={t('icons.title')}
          description={t('icons.description')}
          search={search}
        />
        <TableCard table={table} />
      </Main>
    </>
  );
}
