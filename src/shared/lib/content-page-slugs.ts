import { notFound } from 'next/navigation';

import contentPageSlugs from '@/generated/content-page-slugs.json';

const slugSet = new Set(contentPageSlugs.slugs);

export function getContentPageSlugs(): readonly string[] {
  return contentPageSlugs.slugs;
}

export function isContentPageSlug(slug: string): boolean {
  return slugSet.has(slug);
}

export function normalizeCatchAllSlug(
  slug: string | string[] | undefined,
): string {
  if (!slug) {
    return '';
  }

  return typeof slug === 'string' ? slug : slug.join('/');
}

export function assertContentPageSlug(slug: string | string[] | undefined): string {
  const normalized = normalizeCatchAllSlug(slug);

  if (
    !normalized ||
    normalized.includes('.') ||
    normalized.startsWith('@') ||
    !isContentPageSlug(normalized)
  ) {
    notFound();
  }

  return normalized;
}
