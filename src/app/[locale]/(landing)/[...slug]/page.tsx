import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { envConfigs } from '@/config';
import { locales } from '@/config/locale';
import { noIndexRobots } from '@/shared/lib/seo';
import {
  assertContentPageSlug,
  getContentPageSlugs,
} from '@/shared/lib/content-page-slugs';
import { getLocalPage } from '@/shared/models/post';

const INDEXABLE_STATIC_PAGES = new Set([
  'privacy-policy',
  'terms-of-service',
]);

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  const slugs = getContentPageSlugs();

  return locales.flatMap((locale) =>
    slugs.map((slug) => ({
      locale,
      slug: [slug],
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const staticPageSlug = assertContentPageSlug(slug);

  const canonicalUrl =
    locale !== envConfigs.locale
      ? `${envConfigs.app_url}/${locale}/${staticPageSlug}`
      : `${envConfigs.app_url}/${staticPageSlug}`;

  const staticPage = await getLocalPage({ slug: staticPageSlug, locale });

  if (staticPage) {
    return {
      title: staticPage.title || '',
      description: staticPage.description || '',
      robots: INDEXABLE_STATIC_PAGES.has(staticPageSlug)
        ? { index: true, follow: true }
        : noIndexRobots,
      alternates: {
        canonical: canonicalUrl,
      },
    };
  }

  notFound();
}

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const staticPageSlug = assertContentPageSlug(slug);
  const staticPage = await getLocalPage({ slug: staticPageSlug, locale });

  if (!staticPage) {
    return notFound();
  }

  const Page = await getThemePage('static-page');

  return <Page locale={locale} post={staticPage} />;
}
