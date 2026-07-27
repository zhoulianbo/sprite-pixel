import { revalidatePath } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Empty } from '@/shared/blocks/common';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { findFooterLink, updateFooterLink } from '@/shared/models/footer_link';
import {
  getFooterLinkFormFields,
  parseFooterLinkFormData,
} from '@/shared/services/footer_link_form';
import type { Crumb } from '@/shared/types/blocks/common';
import type { Form } from '@/shared/types/blocks/form';

export default async function FooterLinkEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.SETTINGS_WRITE,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.footer-links');
  const successMessage = t('edit.success');
  const footerLink = await findFooterLink(id);
  if (!footerLink) {
    return <Empty message={t('edit.not_found')} />;
  }

  const crumbs: Crumb[] = [
    { title: t('edit.crumbs.admin'), url: '/admin' },
    { title: t('edit.crumbs.links'), url: '/admin/footer-links' },
    { title: t('edit.crumbs.edit'), is_active: true },
  ];

  const form: Form = {
    fields: getFooterLinkFormFields(t),
    data: footerLink,
    passby: { id: footerLink.id },
    submit: {
      button: { title: t('edit.buttons.submit') },
      handler: async (data, passby) => {
        'use server';

        await requirePermission({
          code: PERMISSIONS.SETTINGS_WRITE,
          redirectUrl: '/admin/no-permission',
          locale,
        });

        const linkId = String(passby?.id || '');
        if (!linkId || linkId !== id) throw new Error('invalid footer link');

        const result = await updateFooterLink(
          linkId,
          parseFooterLinkFormData(data)
        );
        if (!result) throw new Error('update footer link failed');

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
        <MainHeader title={t('edit.title')} />
        <FormCard form={form} className="md:max-w-2xl" />
      </Main>
    </>
  );
}
