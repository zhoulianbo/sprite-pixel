import { getTranslations } from 'next-intl/server';

import { redirect } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';
import { websiteConfig } from '@/config/website';
import { SignUp } from '@/shared/blocks/sign/sign-up';
import { noIndexRobots } from '@/shared/lib/seo';
import { getPublicConfigs } from '@/shared/models/config';
import { getSignUser } from '@/shared/models/user';

function safeInternalPath(raw?: string) {
  if (!raw) return '/';
  if (!raw.startsWith('/')) return '/';
  return raw;
}

function stripLocalePrefix(path: string, locale: string) {
  if (!path?.startsWith('/')) return '/';
  if (locale === defaultLocale) return path;
  if (path === `/${locale}`) return '/';
  if (path.startsWith(`/${locale}/`))
    return path.slice(locale.length + 1) || '/';
  return path;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const t = await getTranslations('common');

  return {
    title: `${t('sign.sign_up_title')} - ${t('metadata.title')}`,
    robots: noIndexRobots,
    alternates: {
      canonical:
        locale !== defaultLocale
          ? `${envConfigs.app_url}/${locale}/sign-up`
          : `${envConfigs.app_url}/sign-up`,
    },
  };
}

export default async function SignUpPage({
  searchParams,
  params,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
  params: Promise<{ locale: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const { locale } = await params;

  if (!websiteConfig.auth.enabled) {
    redirect({ href: '/', locale });
  }

  // If user is already signed in, don't show sign-up form again.
  const sessionUser = await getSignUser();
  if (sessionUser) {
    const target = stripLocalePrefix(safeInternalPath(callbackUrl), locale);
    redirect({ href: target || '/', locale });
  }

  // SECURITY: must use getPublicConfigs() here — `configs` is passed to a
  // client component and would otherwise serialize all DB-stored secrets
  // (provider API keys, client secrets, etc.) into the page HTML/RSC payload.
  const configs = await getPublicConfigs();

  return <SignUp configs={configs} callbackUrl={callbackUrl || '/'} />;
}
