import { Grid2X2, Layers, Scissors, WandSparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';

const TOOLS = [
  { id: 'sprites', href: '/', Icon: WandSparkles },
  { id: 'icons', href: '/ai-game-icon-generator', Icon: Layers },
  { id: 'maker', href: '/sprite-sheet-maker', Icon: Grid2X2 },
  { id: 'cutter', href: '/sprite-sheet-cutter', Icon: Scissors },
] as const;

const shell =
  'mx-auto w-[min(1216px,calc(100%-40px))] max-[760px]:w-[min(calc(100%-28px),620px)]';

export async function MoreTools({
  locale,
  exclude,
  index,
  tag,
  className,
}: {
  locale: string;
  exclude: Exclude<(typeof TOOLS)[number]['id'], 'sprites'>;
  index: string;
  tag: string;
  className?: string;
}) {
  const t = await getTranslations({ locale, namespace: 'common.moreTools' });
  const items = TOOLS.filter((item) => item.id !== exclude);

  return (
    <section className={className}>
      <div className={shell}>
        <div className="mb-[50px] flex max-w-[940px] flex-col items-start max-[760px]:mb-[36px]">
          <div className="text-primary border-border bg-vault-navy mb-[22px] inline-flex min-h-7 items-center border px-2.5 py-1.5 font-mono text-[11px] font-bold tracking-[0.12em] uppercase max-[760px]:mb-[18px]">
            {index} / {tag}
          </div>
          <h2 className="max-w-[900px] [font-family:var(--font-heading),var(--font-sans)] text-[clamp(38px,4.8vw,66px)] leading-none font-medium tracking-[-0.055em]">
            {t('title')}
          </h2>
          <p className="text-muted-foreground mt-5 max-w-[720px] text-sm leading-[1.75]">
            {t('description')}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {items.map((item) => {
            const Icon = item.Icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="bg-card hover:border-primary/50 focus-visible:ring-ring flex items-start gap-4 rounded-xl border p-5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <Icon
                  className="text-primary mt-0.5 size-6 shrink-0 stroke-[1.5]"
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <h3 className="text-[17px] font-medium">
                    {t(`items.${item.id}.title`)}
                  </h3>
                  <p className="text-muted-foreground mt-1.5 text-sm leading-[1.7]">
                    {t(`items.${item.id}.text`)}
                  </p>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
