import { Images, Search } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/shared/lib/utils';

import { GalleryCard, type PublicGalleryItem } from './gallery-card';

type GalleryFilters = {
  type: 'character' | 'animation';
  query: string;
  category: string;
  size: string;
  sort: 'latest' | 'likes' | 'downloads';
};

function galleryHref(filters: GalleryFilters, next: Partial<GalleryFilters>) {
  const values = { ...filters, ...next };
  const search = new URLSearchParams();
  search.set('type', values.type);
  if (values.query) search.set('q', values.query);
  if (values.category) search.set('category', values.category);
  if (values.size) search.set('size', values.size);
  if (values.sort !== 'latest') search.set('sort', values.sort);
  return `/gallery?${search.toString()}`;
}

export function Gallery({
  locale,
  title,
  description,
  emptyTitle,
  emptyDescription,
  items,
  total,
  page,
  limit,
  filters,
  categories,
  sizes,
  labels,
}: {
  locale: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  items: PublicGalleryItem[];
  total: number;
  page: number;
  limit: number;
  filters: GalleryFilters;
  categories: Array<{ value: string; label: string }>;
  sizes: string[];
  labels: {
    characters: string;
    animations: string;
    search: string;
    searchPlaceholder: string;
    allTypes: string;
    allSizes: string;
    sortLatest: string;
    sortLikes: string;
    sortDownloads: string;
    apply: string;
    results: string;
    previous: string;
    next: string;
    animation: string;
    character: string;
    like: string;
    download: string;
    noPreview: string;
  };
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageHref = (nextPage: number) => {
    const href = galleryHref(filters, {});
    return `${href}${href.includes('?') ? '&' : '?'}page=${nextPage}`;
  };

  return (
    <main className="bg-background text-foreground min-h-screen">
      <section className="border-border bg-vault-navy relative border-b pt-28 pb-16 sm:pt-32 sm:pb-24">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute inset-x-0 top-0 h-[600px] bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] [mask-image:linear-gradient(black,transparent)] bg-[size:48px_48px]" />
        </div>
        <div className="relative mx-auto w-[min(1216px,calc(100%-40px))] max-[760px]:w-[min(calc(100%-28px),620px)]">
          <header className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
            <h1 className="font-heading text-4xl leading-[0.98] font-semibold tracking-[-0.045em] text-pretty sm:text-6xl">
              {title}
            </h1>
            <p className="text-muted-foreground mx-auto mt-5 max-w-[42rem] text-base leading-7 text-pretty sm:text-lg">
              {description}
            </p>
          </header>

          <div className="mb-6 flex border-b border-white/10" role="tablist">
            {(
              [
                ['character', labels.characters],
                ['animation', labels.animations],
              ] as const
            ).map(([value, label]) => (
              <Link
                aria-selected={filters.type === value}
                className={cn(
                  'relative px-5 py-3 text-sm font-semibold transition-colors',
                  filters.type === value
                    ? 'text-primary after:bg-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                href={galleryHref(filters, {
                  type: value,
                  category: '',
                  size: '',
                })}
                key={value}
                role="tab"
              >
                {label}
              </Link>
            ))}
          </div>

          <form
            className="border-border bg-card/45 mb-7 grid gap-3 rounded-xl border p-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_180px_150px_170px_auto]"
            method="get"
          >
            <input name="type" type="hidden" value={filters.type} />
            <label className="relative min-w-0">
              <span className="sr-only">{labels.search}</span>
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                className="border-border bg-background focus:border-primary/60 h-10 w-full rounded-lg border pr-3 pl-9 text-sm outline-none"
                defaultValue={filters.query}
                name="q"
                placeholder={labels.searchPlaceholder}
              />
            </label>
            <select
              aria-label={labels.allTypes}
              className="border-border bg-background h-10 rounded-lg border px-3 text-sm"
              defaultValue={filters.category}
              name="category"
            >
              <option value="">{labels.allTypes}</option>
              {categories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              aria-label={labels.allSizes}
              className="border-border bg-background h-10 rounded-lg border px-3 text-sm"
              defaultValue={filters.size}
              name="size"
            >
              <option value="">{labels.allSizes}</option>
              {sizes.map((size) => (
                <option key={size} value={size}>
                  {size.replace('x', '×')}
                </option>
              ))}
            </select>
            <select
              className="border-border bg-background h-10 rounded-lg border px-3 text-sm"
              defaultValue={filters.sort}
              name="sort"
            >
              <option value="latest">{labels.sortLatest}</option>
              <option value="likes">{labels.sortLikes}</option>
              <option value="downloads">{labels.sortDownloads}</option>
            </select>
            <button
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-lg px-5 text-sm font-semibold"
              type="submit"
            >
              {labels.apply}
            </button>
          </form>

          <p className="text-muted-foreground mb-4 text-sm">
            {labels.results.replace('{count}', String(total))}
          </p>
          {items.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <GalleryCard
                  item={item}
                  key={item.id}
                  labels={labels}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <div className="bg-card/25 flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
              <Images className="text-primary size-9 stroke-1" />
              <h2 className="font-heading mt-4 text-xl font-semibold">
                {emptyTitle}
              </h2>
              <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
                {emptyDescription}
              </p>
            </div>
          )}

          {totalPages > 1 ? (
            <nav
              aria-label="Pagination"
              className="mt-8 flex items-center justify-center gap-4"
            >
              {page > 1 ? (
                <Link
                  className="border-border hover:border-primary rounded-lg border px-4 py-2 text-sm"
                  href={pageHref(page - 1)}
                >
                  {labels.previous}
                </Link>
              ) : null}
              <span className="text-muted-foreground text-sm">
                {page} / {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  className="border-border hover:border-primary rounded-lg border px-4 py-2 text-sm"
                  href={pageHref(page + 1)}
                >
                  {labels.next}
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </section>
    </main>
  );
}
