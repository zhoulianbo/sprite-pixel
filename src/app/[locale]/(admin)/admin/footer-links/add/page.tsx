import { revalidatePath } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { getUuid } from '@/shared/lib/hash';
import { addFooterLink } from '@/shared/models/footer_link';
import {
  getFooterLinkFormFields,
  parseFooterLinkFormData,
} from '@/shared/services/footer_link_form';
import type { Crumb } from '@/shared/types/blocks/common';
import type { Form } from '@/shared/types/blocks/form';

export default async function FooterLinkAddPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.SETTINGS_WRITE,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.footer-links');
  const successMessage = t('add.success');
  const crumbs: Crumb[] = [
    { title: t('add.crumbs.admin'), url: '/admin' },
    { title: t('add.crumbs.links'), url: '/admin/footer-links' },
    { title: t('add.crumbs.add'), is_active: true },
  ];

  const form: Form = {
    fields: getFooterLinkFormFields(t),
    linkHtmlImporter: {
      title: t('add.importer.title'),
      placeholder: t('add.importer.placeholder'),
      tip: t('add.importer.tip'),
      successMessage: t('add.importer.success'),
      errorMessage: t('add.importer.error'),
    },
    data: {
      group: 'badge',
      locale: 'all',
      rel: '',
      status: 'published',
      sort: 10,
    },
    submit: {
      button: { title: t('add.buttons.submit') },
      handler: async (data) => {
        'use server';

        await requirePermission({
          code: PERMISSIONS.SETTINGS_WRITE,
          redirectUrl: '/admin/no-permission',
          locale,
        });

        const result = await addFooterLink({
          id: getUuid(),
          ...parseFooterLinkFormData(data),
        });
        if (!result) throw new Error('add footer link failed');

        revalidatePath('/', 'layout');
        revalidatePath('/admin/footer-links');
        return {
          status: 'success',
          message: successMessage,
          redirect_url: '/admin/footer-links',
        };
      },
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('add.title')} />
        <FormCard form={form} className="md:max-w-2xl" />
      </Main>
    </>
  );
}
