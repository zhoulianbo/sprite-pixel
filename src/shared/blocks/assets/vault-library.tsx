import { ImageIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { ZoomableImage } from '@/shared/blocks/common/zoomable-image';
import { Header, Main } from '@/shared/blocks/dashboard';
import { cn } from '@/shared/lib/utils';
import type { Crumb } from '@/shared/types/blocks/common';

export type VaultLibraryItem = {
  id: string;
  name: string;
  meta?: string;
  href?: string;
  imageUrl?: string | null;
};

export function VaultLibrary({
  title,
  description,
  emptyTitle,
  emptyDescription,
  emptyIcon: EmptyIcon,
  crumbs,
  items,
  zoomLabel,
}: {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyIcon: LucideIcon;
  crumbs: Crumb[];
  items: VaultLibraryItem[];
  zoomLabel?: string;
}) {
  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <div className="w-full space-y-7">
          <header className="max-w-2xl">
            <h1 className="font-heading text-3xl font-semibold">{title}</h1>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              {description}
            </p>
          </header>
          {items.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => (
                <VaultCard key={item.id} item={item} zoomLabel={zoomLabel} />
              ))}
            </div>
          ) : (
            <div className="bg-card/25 flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
              <EmptyIcon className="text-primary size-9 stroke-1" />
              <h2 className="font-heading mt-4 text-xl font-semibold">
                {emptyTitle}
              </h2>
              <p className="text-muted-foreground mt-2 max-w-md text-sm">
                {emptyDescription}
              </p>
            </div>
          )}
        </div>
      </Main>
    </>
  );
}

function VaultCard({
  item,
  zoomLabel,
}: {
  item: VaultLibraryItem;
  zoomLabel?: string;
}) {
  const image = item.imageUrl ? (
    zoomLabel ? (
      <ZoomableImage
        alt={item.name}
        src={item.imageUrl}
        zoomLabel={zoomLabel}
      />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={item.name}
        className="size-full object-contain [image-rendering:pixelated]"
        src={item.imageUrl}
      />
    )
  ) : (
    <div className="text-muted-foreground flex size-full items-center justify-center">
      <ImageIcon className="size-8 stroke-1" />
    </div>
  );

  const details = (
    <div className="p-4">
      <h2 className="truncate font-semibold">{item.name}</h2>
      {item.meta ? (
        <p className="text-muted-foreground mt-1 truncate text-xs">
          {item.meta}
        </p>
      ) : null}
    </div>
  );

  if (item.href && !zoomLabel) {
    return (
      <Link
        className={cn(
          'group bg-card hover:border-primary/50 overflow-hidden rounded-xl border transition-colors'
        )}
        href={item.href}
      >
        <div className="bg-muted/35 aspect-square border-b p-4">{image}</div>
        {details}
      </Link>
    );
  }

  return (
    <article className="bg-card overflow-hidden rounded-xl border">
      <div className="bg-muted/35 aspect-square border-b p-4">{image}</div>
      {item.href ? (
        <Link
          className="hover:bg-primary/10 hover:text-primary block transition-colors"
          href={item.href}
        >
          {details}
        </Link>
      ) : (
        details
      )}
    </article>
  );
}
