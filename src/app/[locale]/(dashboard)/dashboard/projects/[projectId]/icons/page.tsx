import { Boxes, Download, Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { listProjectItemsWithPreview } from '@/shared/models/asset';

export default async function IconsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const t = await getTranslations('workspace.icons');
  const icons = await listProjectItemsWithPreview(projectId, 'icon');
  return (
    <div className="w-full space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <h1 className="font-heading text-3xl font-semibold">
            {t('listTitle')}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {t('listDescription')}
          </p>
        </div>
        <Button asChild>
          <Link href="/ai-game-icon-generator">
            <Sparkles className="size-4" />
            {t('new')}
          </Link>
        </Button>
      </header>
      {icons.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {icons.map((icon) => (
            <article
              key={icon.id}
              className="bg-card overflow-hidden rounded-lg border"
            >
              <div className="bg-muted/40 aspect-square border-b [background-image:linear-gradient(45deg,hsl(var(--border)/.25)_25%,transparent_25%),linear-gradient(-45deg,hsl(var(--border)/.25)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,hsl(var(--border)/.25)_75%),linear-gradient(-45deg,transparent_75%,hsl(var(--border)/.25)_75%)] [background-size:16px_16px] [background-position:0_0,0_8px,8px_-8px,-8px_0] p-3">
                {icon.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={icon.preview.url}
                    alt={icon.name}
                    className="size-full object-contain [image-rendering:pixelated]"
                  />
                ) : (
                  <div className="text-muted-foreground flex size-full items-center justify-center">
                    <Boxes className="size-6" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 p-3">
                <h2 className="min-w-0 flex-1 truncate text-sm font-medium">
                  {icon.name}
                </h2>
                {icon.preview && (
                  <Button
                    asChild
                    size="icon"
                    variant="ghost"
                    className="size-8"
                  >
                    <a
                      href={`${icon.preview.url}?download=1`}
                      aria-label={t('download')}
                    >
                      <Download className="size-4" />
                    </a>
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="bg-card/25 flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
          <Boxes className="text-primary stroke-1.5 size-9" />
          <h2 className="font-heading mt-4 text-xl font-semibold">
            {t('emptyTitle')}
          </h2>
          <p className="text-muted-foreground mt-2 max-w-md text-sm">
            {t('emptyDescription')}
          </p>
        </div>
      )}
    </div>
  );
}
