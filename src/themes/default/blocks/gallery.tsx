import { Images } from 'lucide-react';

export type GalleryItem = {
  id: string;
  title: string;
  imageUrl?: string | null;
};

export function Gallery({
  title,
  description,
  emptyTitle,
  emptyDescription,
  items,
}: {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  items: GalleryItem[];
}) {
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
          {items.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="border-border bg-card overflow-hidden rounded-xl border"
                >
                  <div className="bg-muted/35 aspect-[4/3] p-4">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="size-full object-contain [image-rendering:pixelated]"
                      />
                    ) : (
                      <div className="text-muted-foreground flex size-full items-center justify-center">
                        <Images className="size-8 stroke-1" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h2 className="font-heading text-lg font-semibold">
                      {item.title}
                    </h2>
                  </div>
                </article>
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
        </div>
      </section>
    </main>
  );
}
