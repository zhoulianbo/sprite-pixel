import { ReactNode } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemeLayout } from '@/core/theme';
import { applyLandingWebsiteConfig } from '@/config/website';
import { LocaleDetector, TopBanner } from '@/shared/blocks/common';
import {
  Footer as FooterType,
  Header as HeaderType,
} from '@/shared/types/blocks/landing';

export function generateStaticParams() {
  return [];
}

export default async function LandingLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // load page data
  const t = await getTranslations({ locale, namespace: 'landing' });

  // load layout component
  const Layout = await getThemeLayout('landing');

  // header and footer to display
  const { header, footer } = applyLandingWebsiteConfig(
    t.raw('header') as HeaderType,
    t.raw('footer') as FooterType
  );

  return (
    <Layout header={header} footer={footer}>
      <LocaleDetector />
      {header.topbanner && header.topbanner.text && (
        <TopBanner
          id="topbanner"
          text={header.topbanner?.text}
          buttonText={header.topbanner?.buttonText}
          href={header.topbanner?.href}
          target={header.topbanner?.target}
          closable
          rememberDismiss
          dismissedExpiryDays={header.topbanner?.dismissedExpiryDays ?? 1}
        />
      )}
      {children}
    </Layout>
  );
}
