import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import {
  getFooterLinks,
  getFooterLinksCount,
  type FooterLink,
} from '@/shared/models/footer_link';
import { getFooterLinkFormFields } from '@/shared/services/footer_link_form';
import type { Crumb } from '@/shared/types/blocks/common';
import type { Form } from '@/shared/types/blocks/form';
import type { Table } from '@/shared/types/blocks/table';

import { FooterLinkAddDialog } from './footer-link-add-dialog';
import { FooterLinkRowActions } from './footer-link-row-actions';

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
  const fields = getFooterLinkFormFields(t);

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
      { name: 'sort', title: t('fields.sort') },
      {
        name: 'action',
        title: '',
        callback: (item: FooterLink) => (
          <FooterLinkRowActions
            footerLinkId={item.id}
            editForm={{
              fields,
              data: item,
              submit: { button: { title: t('edit.buttons.submit') } },
            }}
            labels={{
              menu: t('list.buttons.actions'),
              edit: t('list.buttons.edit'),
              editTitle: t('edit.title'),
              editDescription: t('list.description'),
              editFailed: t('edit.failed'),
              deleteAction: t('list.buttons.delete'),
              deleteTitle: t('delete.title'),
              deleteDescription: t('delete.description', { title: item.title }),
              cancel: t('delete.cancel'),
              confirm: t('delete.confirm'),
              confirming: t('delete.confirming'),
              success: t('delete.success'),
              failed: t('delete.failed'),
              cacheWarning: t('cache_warning'),
            }}
          />
        ),
      },
    ],
    data,
    emptyMessage: t('list.empty'),
    pagination: { total, page, limit },
  };

  const form: Form = {
    fields,
    linkHtmlImporter: {
      title: t('add.importer.title'),
      placeholder: t('add.importer.placeholder'),
      tip: t('add.importer.tip'),
      successMessage: t('add.importer.success'),
      errorMessage: t('add.importer.error'),
    },
    data: { group: 'badge', rel: '', sort: 10 },
    submit: { button: { title: t('add.buttons.submit') } },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <MainHeader title={t('list.title')} />
          <FooterLinkAddDialog
            form={form}
            title={t('add.title')}
            description={t('list.description')}
            failedMessage={t('add.failed')}
          />
        </div>
        <TableCard description={t('list.description')} table={table} />
      </Main>
    </>
  );
}
