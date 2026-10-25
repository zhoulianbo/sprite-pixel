'use server';

import { getTranslations } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { getUuid } from '@/shared/lib/hash';
import {
  addFooterLink,
  deleteFooterLink,
  updateFooterLink,
} from '@/shared/models/footer_link';
import { parseFooterLinkFormData } from '@/shared/services/footer_link_form';

export async function addFooterLinkAction(data: FormData) {
  await requirePermission({ code: PERMISSIONS.SETTINGS_WRITE });
  const t = await getTranslations('admin.footer-links');
  const result = await addFooterLink({
    id: getUuid(),
    ...parseFooterLinkFormData(data),
  });
  if (!result) throw new Error(t('add.failed'));

  return {
    status: 'success' as const,
    message: t('add.success'),
    warning: result.cacheSynced ? undefined : t('cache_warning'),
  };
}

export async function deleteFooterLinkAction(id: string) {
  await requirePermission({ code: PERMISSIONS.SETTINGS_WRITE });
  if (!id || typeof id !== 'string') throw new Error('invalid footer link');
  return deleteFooterLink(id);
}

export async function updateFooterLinkAction(id: string, data: FormData) {
  await requirePermission({ code: PERMISSIONS.SETTINGS_WRITE });
  if (!id || typeof id !== 'string') throw new Error('invalid footer link');
  const t = await getTranslations('admin.footer-links');
  const result = await updateFooterLink(id, parseFooterLinkFormData(data));
  if (!result)
    return { status: 'error' as const, message: t('edit.not_found') };

  return {
    status: 'success' as const,
    message: t('edit.success'),
    warning: result.cacheSynced ? undefined : t('cache_warning'),
  };
}
