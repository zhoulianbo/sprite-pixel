import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { GalleryPublishButton } from '@/shared/blocks/admin/gallery-publish-button';
import { ZoomableImage } from '@/shared/blocks/common/zoomable-image';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import {
  getAdminAssets,
  getAdminAssetsCount,
} from '@/shared/models/admin-asset';
import { Crumb, Search } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

export default async function AdminCharactersPage({
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
    getAdminAssetsCount({ kind: 'character', email }),
    getAdminAssets({ kind: 'character', email, page, limit }),
  ]);

  const crumbs: Crumb[] = [
    { title: t('crumbs.admin'), url: '/admin' },
    { title: t('characters.title'), is_active: true },
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
            alt={t('characters.previewLabel', { name: item.name })}
            className="size-16"
            src={item.previewUrl}
            zoomLabel={t('characters.zoomLabel', { name: item.name })}
          />
        ),
      },
      { name: 'name', title: t('fields.name') },
      { name: 'user', title: t('fields.user'), type: 'user' },
      { name: 'projectName', title: t('fields.project') },
      {
        name: 'sourceType',
        title: t('fields.source'),
        callback: (item: (typeof assets)[number]) =>
          item.sourceType === 'uploaded'
            ? t('source.uploaded')
            : t('source.generated'),
      },
      { name: 'description', title: t('fields.description'), placeholder: '-' },
      {
        name: 'gallery',
        title: t('fields.gallery'),
        callback: (item: (typeof assets)[number]) => (
          <GalleryPublishButton
            kind="character"
            sourceId={item.id}
            eligible={item.galleryEligible}
            published={item.galleryPublished}
            publishLabel={t('gallery.publish')}
            unpublishLabel={t('gallery.unpublish')}
            privateLabel={t('gallery.private')}
            errorLabel={t('gallery.error')}
          />
        ),
      },
      { name: 'createdAt', title: t('fields.createdAt'), type: 'time' },
    ],
    data: assets.map((asset: (typeof assets)[number]) => ({
      ...asset,
      user: asset.owner,
    })),
    emptyMessage: t('characters.empty'),
    pagination: { total, page, limit },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={t('characters.title')}
          description={t('characters.description')}
          search={search}
        />
        <TableCard table={table} />
      </Main>
    </>
  );
}
