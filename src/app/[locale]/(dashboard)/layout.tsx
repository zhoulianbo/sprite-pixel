import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { applySidebarWebsiteConfig } from '@/config/website';
import { LocaleDetector } from '@/shared/blocks/common';
import { DashboardLayout } from '@/shared/blocks/dashboard';
import { noIndexRobots } from '@/shared/lib/seo';
import { getAllConfigs } from '@/shared/models/config';
import { Sidebar as SidebarType } from '@/shared/types/blocks/dashboard';

export const metadata: Metadata = {
  robots: noIndexRobots,
};

export default async function UserDashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('settings.sidebar');
  const sidebar: SidebarType = applySidebarWebsiteConfig(
    t.raw('sidebar') as SidebarType,
    'dashboard'
  );

  const configs = await getAllConfigs();
  if (configs.app_name) {
    sidebar.header!.brand!.title = configs.app_name;
    sidebar.header!.brand!.logo!.alt = configs.app_name;
  }
  if (configs.app_description) {
    sidebar.header!.brand!.description = configs.app_description;
  }
  if (configs.app_logo) {
    sidebar.header!.brand!.logo!.src = configs.app_logo;
  }

  return (
    <DashboardLayout sidebar={sidebar} sidebarWidth="230px">
      <LocaleDetector />
      {children}
    </DashboardLayout>
  );
}
