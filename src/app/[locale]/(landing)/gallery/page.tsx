import { getTranslations, setRequestLocale } from 'next-intl/server';

import { locales } from '@/config/locale';
import { getMetadata } from '@/shared/lib/seo';
import { Gallery } from '@/themes/default/blocks/gallery';

export const revalidate = 3600;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const generateMetadata = getMetadata({
  metadataKey: 'pages.gallery.metadata',
  canonicalUrl: '/gallery',
});

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('pages.gallery');

  return (
    <Gallery
      title={t('title')}
      description={t('description')}
      emptyTitle={t('emptyTitle')}
      emptyDescription={t('emptyDescription')}
      items={[]}
    />
  );
}
