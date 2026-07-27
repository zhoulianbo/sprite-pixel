import { locales } from '@/config/locale';
import { normalizeFooterLinkUrl } from '@/shared/lib/footer_link_html';
import {
  FooterLinkGroup,
  FooterLinkStatus,
  type NewFooterLink,
  type UpdateFooterLink,
} from '@/shared/models/footer_link';
import type { FormField } from '@/shared/types/blocks/form';

const ALLOWED_LOCALES = new Set(['all', ...locales]);
const ALLOWED_REL_TOKENS = new Set([
  'nofollow',
  'noopener',
  'noreferrer',
  'sponsored',
  'ugc',
]);

type Translator = (key: string) => string;

export function getFooterLinkFormFields(t: Translator): FormField[] {
  return [
    {
      name: 'group',
      type: 'select',
      title: t('fields.group'),
      options: [
        { title: t('groups.friend'), value: FooterLinkGroup.FRIEND },
        { title: t('groups.badge'), value: FooterLinkGroup.BADGE },
      ],
      validation: { required: true },
    },
    {
      name: 'title',
      type: 'text',
      title: t('fields.title'),
      validation: { required: true, max: 200 },
    },
    {
      name: 'url',
      type: 'url',
      title: t('fields.url'),
      validation: { required: true, max: 2048 },
    },
    {
      name: 'imageUrl',
      type: 'url',
      title: t('fields.image_url'),
      tip: t('tips.image_url'),
      validation: { max: 2048 },
    },
    {
      name: 'altText',
      type: 'text',
      title: t('fields.alt_text'),
      validation: { max: 300 },
    },
    {
      name: 'locale',
      type: 'select',
      title: t('fields.locale'),
      options: ['all', ...locales].map((locale) => ({
        title: t(`locales.${locale}`),
        value: locale,
      })),
      validation: { required: true },
    },
    {
      name: 'rel',
      type: 'text',
      title: t('fields.rel'),
      tip: t('tips.rel'),
      validation: { max: 100 },
    },
    {
      name: 'status',
      type: 'select',
      title: t('fields.status'),
      options: [
        {
          title: t('statuses.published'),
          value: FooterLinkStatus.PUBLISHED,
        },
        { title: t('statuses.draft'), value: FooterLinkStatus.DRAFT },
        { title: t('statuses.archived'), value: FooterLinkStatus.ARCHIVED },
      ],
      validation: { required: true },
    },
    {
      name: 'sort',
      type: 'number',
      title: t('fields.sort'),
      tip: t('tips.sort'),
      validation: { required: true, min: 0, max: 9999 },
    },
  ];
}

export function parseFooterLinkFormData(
  data: FormData
): Omit<NewFooterLink, 'id' | 'createdAt' | 'updatedAt'> & UpdateFooterLink {
  const group = String(data.get('group') || '').trim();
  const title = String(data.get('title') || '').trim();
  const rawUrl = String(data.get('url') || '').trim();
  const rawImageUrl = String(data.get('imageUrl') || '').trim();
  const altText = String(data.get('altText') || '').trim();
  const locale = String(data.get('locale') || '').trim();
  const rel = String(data.get('rel') || '')
    .toLowerCase()
    .trim();
  const status = String(data.get('status') || '').trim();
  const sort = Number(data.get('sort'));

  if (!Object.values(FooterLinkGroup).includes(group as FooterLinkGroup)) {
    throw new Error('invalid footer link display type');
  }
  if (!title) {
    throw new Error('footer link title is required');
  }

  const url = normalizeFooterLinkUrl(rawUrl);
  if (!url) {
    throw new Error('footer link URL must use HTTP or HTTPS');
  }

  const imageUrl = rawImageUrl ? normalizeFooterLinkUrl(rawImageUrl) : null;
  if (rawImageUrl && !imageUrl) {
    throw new Error('badge image URL must use HTTP or HTTPS');
  }
  if (group === FooterLinkGroup.BADGE && !imageUrl) {
    throw new Error('badge image URL is required for badge links');
  }

  if (!ALLOWED_LOCALES.has(locale)) {
    throw new Error('invalid footer link locale');
  }
  if (!Object.values(FooterLinkStatus).includes(status as FooterLinkStatus)) {
    throw new Error('invalid footer link status');
  }
  if (!Number.isInteger(sort) || sort < 0 || sort > 9999) {
    throw new Error('sort order must be an integer between 0 and 9999');
  }

  const relTokens = rel.split(/\s+/).filter(Boolean);
  if (relTokens.some((token) => !ALLOWED_REL_TOKENS.has(token))) {
    throw new Error('link rel contains an unsupported value');
  }

  return {
    group,
    title,
    url,
    imageUrl: group === FooterLinkGroup.BADGE ? imageUrl : null,
    altText: altText || null,
    locale,
    rel: [...new Set(relTokens)].join(' '),
    status,
    sort,
  };
}
