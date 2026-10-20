import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getMetadata } from '@/shared/lib/seo';
import {
  listGalleryItems,
  type GalleryAssetType,
  type GallerySort,
} from '@/shared/models/gallery';
import { getUserInfo } from '@/shared/models/user';
import { Gallery } from '@/themes/default/blocks/gallery';

export const dynamic = 'force-dynamic';

export const generateMetadata = getMetadata({
  metadataKey: 'pages.gallery.metadata',
  canonicalUrl: '/gallery',
});

export default async function GalleryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    type?: string;
    q?: string;
    category?: string;
    size?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('pages.gallery');
  const tg = await getTranslations('generation');
  const values = await searchParams;
  const type: GalleryAssetType =
    values.type === 'animation' ? 'animation' : 'character';
  const sort: GallerySort = ['likes', 'downloads'].includes(values.sort || '')
    ? (values.sort as GallerySort)
    : 'latest';
  const filters = {
    type,
    query: String(values.q || '')
      .trim()
      .slice(0, 80),
    category: String(values.category || '')
      .trim()
      .slice(0, 40),
    size: /^\d+x\d+$/.test(values.size || '') ? values.size || '' : '',
    sort,
  };
  const user = await getUserInfo();
  const result = await listGalleryItems({
    ...filters,
    page: Math.max(1, Number(values.page) || 1),
    userId: user?.id,
  });
  const categoryLabel = (value: string) => {
    const path =
      type === 'animation'
        ? `options.actionType.${value}`
        : `options.characterType.${value}`;
    return tg.has(path as never) ? tg(path as never) : value;
  };

  return (
    <Gallery
      locale={locale}
      title={t('title')}
      description={t('description')}
      emptyTitle={t('emptyTitle')}
      emptyDescription={t('emptyDescription')}
      items={result.items.map((item) => ({
        ...item,
        categoryLabel: categoryLabel(item.category),
      }))}
      total={result.total}
      page={result.page}
      limit={result.limit}
      filters={filters}
      categories={result.categories.map((value) => ({
        value,
        label: categoryLabel(value),
      }))}
      sizes={result.sizes}
      labels={{
        characters: t('tabs.characters'),
        animations: t('tabs.animations'),
        search: t('filters.search'),
        searchPlaceholder: t('filters.searchPlaceholder'),
        allTypes: t('filters.allTypes'),
        allSizes: t('filters.allSizes'),
        sortLatest: t('sort.latest'),
        sortLikes: t('sort.likes'),
        sortDownloads: t('sort.downloads'),
        apply: t('filters.apply'),
        results: t('results', { count: result.total }),
        previous: t('pagination.previous'),
        next: t('pagination.next'),
        like: t('item.like'),
        download: t('item.download'),
        noPreview: t('item.noPreview'),
        copyPrompt: t('item.copyPrompt'),
        copiedPrompt: t('item.copiedPrompt'),
      }}
    />
  );
}
