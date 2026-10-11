import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { AdminAnimationPreview } from '@/shared/blocks/admin/animation-preview';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import {
  getAdminAnimations,
  getAdminAnimationsCount,
} from '@/shared/models/admin-asset';
import { Crumb, Search } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

export default async function AdminAnimationsPage({
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
  const tg = await getTranslations('generation');
  const {
    page: pageValue,
    pageSize: pageSizeValue,
    email,
  } = await searchParams;
  const page = Math.max(1, Number(pageValue) || 1);
  const limit = Math.max(1, Number(pageSizeValue) || 30);
  const [total, animations] = await Promise.all([
    getAdminAnimationsCount({ email }),
    getAdminAnimations({ email, page, limit }),
  ]);

  const crumbs: Crumb[] = [
    { title: t('crumbs.admin'), url: '/admin' },
    { title: t('animations.title'), is_active: true },
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
        name: 'preview',
        title: t('fields.preview'),
        callback: (item: (typeof animations)[number]) => (
          <AdminAnimationPreview
            imageTabLabel={t('animations.imageTab')}
            animationTabLabel={t('animations.animationTab')}
            loadingLabel={t('animations.loading')}
            errorLabel={t('animations.loadError')}
            retryLabel={t('animations.retry')}
            emptyLabel={t('animations.noPreview')}
            clipId={item.id}
            previewUrl={item.previewUrl}
            label={t('animations.previewLabel', { name: item.name })}
            zoomLabel={t('animations.zoomLabel', { name: item.name })}
          />
        ),
      },
      { name: 'characterName', title: t('fields.character') },
      {
        name: 'action',
        title: t('fields.action'),
        callback: (item: (typeof animations)[number]) =>
          tg.has(`options.actionType.${item.action}`)
            ? tg(`options.actionType.${item.action}` as never)
            : item.action,
      },
      {
        name: 'direction',
        title: t('fields.direction'),
        callback: (item: (typeof animations)[number]) =>
          item.direction === 'none'
            ? t('animations.originalDirection')
            : tg.has(`options.animationDirection.${item.direction}`)
              ? tg(`options.animationDirection.${item.direction}` as never)
              : item.direction,
      },
      { name: 'user', title: t('fields.user'), type: 'user' },
      { name: 'projectName', title: t('fields.project') },
      {
        name: 'frameCount',
        title: t('fields.frames'),
        callback: (item: (typeof animations)[number]) =>
          t('animations.frameSummary', {
            count: item.frameCount,
            fps: item.fps,
          }),
      },
      { name: 'createdAt', title: t('fields.createdAt'), type: 'time' },
    ],
    data: animations.map((animation: (typeof animations)[number]) => ({
      ...animation,
      user: animation.owner,
    })),
    emptyMessage: t('animations.empty'),
    pagination: { total, page, limit },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={t('animations.title')}
          description={t('animations.description')}
          search={search}
        />
        <TableCard table={table} />
      </Main>
    </>
  );
}
