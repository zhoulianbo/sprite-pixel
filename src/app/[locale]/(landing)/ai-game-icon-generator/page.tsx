import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale, locales } from '@/config/locale';
import { getMetadata } from '@/shared/lib/seo';
import { IconGeneratorBoard } from '@/themes/default/blocks/icon-generator-board';
import { IconGeneratorLanding } from '@/themes/default/blocks/icon-generator-landing';

export const revalidate = 3600;
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const PATH = '/ai-game-icon-generator';

function pageUrl(locale: string) {
  const origin = envConfigs.app_url.replace(/\/$/, '');
  return `${origin}${locale === defaultLocale ? '' : `/${locale}`}${PATH}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const base = await getMetadata({
    metadataKey: 'workspace.icons.metadata',
    canonicalUrl: PATH,
  })({ params });
  return {
    ...base,
    alternates: {
      canonical: pageUrl(locale),
      languages: {
        ...Object.fromEntries(
          locales.map((language) => [language, pageUrl(language)])
        ),
        'x-default': pageUrl(defaultLocale),
      },
    },
  };
}

export default async function IconGeneratorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'workspace.icons' });
  const typeItems = t.raw('landing.types.items') as Array<{ title: string }>;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${pageUrl(locale)}#tool`,
        name: t('title'),
        description: t('description'),
        url: pageUrl(locale),
        applicationCategory: 'DesignApplication',
        operatingSystem: 'Web browser',
        inLanguage: locale,
        featureList: typeItems.map((item) => item.title),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: t('home'),
            item: `${envConfigs.app_url.replace(/\/$/, '')}${locale === defaultLocale ? '/' : `/${locale}`}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: t('title'),
            item: pageUrl(locale),
          },
        ],
      },
    ],
  };

  return (
    <main className="bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
        }}
      />
      <section className="border-border bg-vault-navy relative border-b pt-28 pb-16 sm:pt-32 sm:pb-24">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute inset-x-0 top-0 h-[600px] bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] [mask-image:linear-gradient(black,transparent)] bg-[size:48px_48px]" />
        </div>
        <div className="relative mx-auto w-[min(1216px,calc(100%-40px))] max-[760px]:w-[min(calc(100%-28px),620px)]">
          <header className="mx-auto mb-9 max-w-3xl text-center sm:mb-11">
            <p className="text-primary mb-5 font-mono text-[10px] tracking-[0.2em] sm:text-[11px]">
              {t('eyebrow')}
            </p>
            <h1 className="font-heading text-4xl leading-[0.98] font-semibold tracking-[-0.045em] text-pretty sm:text-6xl">
              {t('title')}
            </h1>
            <p className="text-muted-foreground mx-auto mt-5 max-w-[42rem] text-base leading-7 text-pretty sm:text-lg">
              {t('description')}
            </p>
          </header>
          <div id="workspace" className="scroll-mt-24">
            <IconGeneratorBoard />
          </div>
        </div>
      </section>
      <IconGeneratorLanding locale={locale} />
    </main>
  );
}
