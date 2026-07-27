import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import {
  getFooterLinks,
  getFooterLinksCount,
  type FooterLink,
} from '@/shared/models/footer_link';
import type { Button, Crumb } from '@/shared/types/blocks/common';
import type { Table } from '@/shared/types/blocks/table';

export default async function FooterLinksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: number; pageSize?: number }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.SETTINGS_READ,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.footer-links');
  const { page: pageNumber, pageSize } = await searchParams;
  const page = Number(pageNumber) || 1;
  const limit = Number(pageSize) || 30;

  const [total, data] = await Promise.all([
    getFooterLinksCount(),
    getFooterLinks({ page, limit }),
  ]);

  const crumbs: Crumb[] = [
    { title: t('list.crumbs.admin'), url: '/admin' },
    { title: t('list.crumbs.links'), is_active: true },
  ];

  const table: Table = {
    columns: [
      { name: 'title', title: t('fields.title') },
      {
        name: 'group',
        title: t('fields.group'),
        callback: (item: FooterLink) => t(`groups.${item.group}`),
      },
      {
        name: 'url',
        title: t('fields.url'),
        type: 'copy',
        className: 'max-w-64 truncate',
        metadata: { message: t('list.copied') },
      },
      {
        name: 'imageUrl',
        title: t('fields.image_url'),
        type: 'image',
        placeholder: '—',
        metadata: { width: 120, height: 32 },
        className: 'max-h-8 max-w-32 rounded-none object-contain',
      },
      {
        name: 'locale',
        title: t('fields.locale'),
        callback: (item: FooterLink) => t(`locales.${item.locale}`),
      },
      {
        name: 'status',
        title: t('fields.status'),
        type: 'label',
        callback: (item: FooterLink) => t(`statuses.${item.status}`),
        metadata: { variant: 'outline' },
      },
      { name: 'sort', title: t('fields.sort') },
      {
        name: 'action',
        title: '',
        type: 'dropdown',
        callback: (item: FooterLink) => [
          {
            id: 'edit',
            title: t('list.buttons.edit'),
            icon: 'RiEditLine',
            url: `/admin/footer-links/${item.id}/edit`,
          },
        ],
      },
    ],
    data,
    emptyMessage: t('list.empty'),
    pagination: { total, page, limit },
  };

  const actions: Button[] = [
    {
      id: 'add',
      title: t('list.buttons.add'),
      icon: 'RiAddLine',
      url: '/admin/footer-links/add',
    },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('list.title')} actions={actions} />
        <TableCard description={t('list.description')} table={table} />
      </Main>
    </>
  );
}
