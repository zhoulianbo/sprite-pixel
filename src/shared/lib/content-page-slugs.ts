import { notFound } from 'next/navigation';
import contentPageSlugs from '@/generated/content-page-slugs.json';

const slugs = [...new Set(contentPageSlugs.params.map(({ slug }) => slug))];
const slugSet = new Set(slugs);

export function getContentPageSlugs(): readonly string[] {
  return slugs;
}

export function getContentPageStaticParams() {
  return contentPageSlugs.params.map(({ locale, slug }) => ({
    locale,
    slug: [slug],
  }));
}

export function isContentPageSlug(slug: string): boolean {
  return slugSet.has(slug);
}

export function normalizeCatchAllSlug(
  slug: string | string[] | undefined
): string {
  if (!slug) {
    return '';
  }

  return typeof slug === 'string' ? slug : slug.join('/');
}

export function assertContentPageSlug(
  slug: string | string[] | undefined
): string {
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
