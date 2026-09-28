import { getTranslations, setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';
import { getThemePage } from '@/core/theme';
import { hreflangCode } from '@/shared/lib/seo';
import { DynamicPage } from '@/shared/types/blocks/landing';

export const revalidate = 3600;

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('pages.index');
  const messages = await getTranslations('pages.index.messages');
  const meta = await getTranslations('common.metadata');

  // get page data
  const page: DynamicPage = t.raw('page');

  // load page component
  const Page = await getThemePage('dynamic-page');
  const origin = envConfigs.app_url.replace(/\/$/, '');
  const pageUrl =
    locale === defaultLocale ? `${origin}/` : `${origin}/${locale}`;
  const organizationId = `${origin}/#organization`;
  const websiteId = `${pageUrl}#website`;
  const logoUrl = `${origin}${envConfigs.app_logo.startsWith('/') ? envConfigs.app_logo : `/${envConfigs.app_logo}`}`;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: envConfigs.app_name,
        url: `${origin}/`,
        logo: {
          '@type': 'ImageObject',
          url: logoUrl,
        },
        email: 'support@spritepixel.com',
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        name: envConfigs.app_name,
        url: pageUrl,
        inLanguage: hreflangCode(locale),
        publisher: { '@id': organizationId },
      },
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: meta('title'),
        description: meta('description'),
        inLanguage: hreflangCode(locale),
        dateModified: '2026-09-27',
        isPartOf: { '@id': websiteId },
        about: { '@id': `${pageUrl}#software` },
        author: { '@id': organizationId },
        publisher: { '@id': organizationId },
        citation: messages('citation.sourceUrl'),
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${pageUrl}#software`,
        name: meta('title'),
        description: meta('description'),
        url: pageUrl,
        applicationCategory: 'DesignApplication',
        operatingSystem: 'Web',
        inLanguage: hreflangCode(locale),
        offers: {
          '@type': 'Offer',
          url: `${origin}${locale === defaultLocale ? '' : `/${locale}`}/pricing`,
        },
        provider: { '@id': organizationId },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
        }}
      />
      <Page locale={locale} page={page} />
    </>
  );
}
