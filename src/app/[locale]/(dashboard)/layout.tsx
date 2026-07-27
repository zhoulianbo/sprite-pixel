import { ReactNode } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { applySidebarWebsiteConfig } from '@/config/website';
import { LocaleDetector } from '@/shared/blocks/common';
import { DashboardLayout, Header, Main } from '@/shared/blocks/dashboard';
import { getAllConfigs } from '@/shared/models/config';
import { Sidebar as SidebarType } from '@/shared/types/blocks/dashboard';

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
  if (configs.version) {
    sidebar.header!.version = configs.version;
  }

  return (
    <DashboardLayout sidebar={sidebar}>
      <LocaleDetector />
      <Header />
      <Main>{children}</Main>
    </DashboardLayout>
  );
}
