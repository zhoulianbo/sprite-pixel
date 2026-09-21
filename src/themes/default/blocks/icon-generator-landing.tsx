import Image from 'next/image';
import {
  FileJson,
  Grid2X2,
  ImageIcon,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { getIconStylePreviewImage } from '@/config/generation';
import { MoreTools } from '@/shared/blocks/common/more-tools';
import { ToolCta } from '@/shared/blocks/common/tool-cta';

type CopyItem = { id?: string; title: string; text: string };
type FaqItem = { q: string; a: string };

const shell =
  'mx-auto w-[min(1216px,calc(100%-40px))] max-[760px]:w-[min(calc(100%-28px),620px)]';
const sectionPad = 'border-border border-b py-20 sm:py-28';
const TYPE_PREVIEW_IMAGES = [
  '/imgs/features/icon/type-inventory.webp',
  '/imgs/features/icon/type-weapons.webp',
  '/imgs/features/icon/type-potions-items.webp',
  '/imgs/features/icon/type-skills-abilities.webp',
  '/imgs/features/icon/type-props-objects.webp',
  '/imgs/features/icon/type-collectibles.webp',
] as const;
const BATCH_PREVIEW_IMAGE = '/imgs/features/icon/batch-icon-collection.webp';
const REGENERATE_PREVIEW_IMAGE =
  '/imgs/features/icon/single-icon-regenerate.webp';
const EXPORT_ICONS = {
  batch: Layers,
  transparent: ImageIcon,
  consistency: Sparkles,
  download: Package,
  project: FileJson,
  grid: Grid2X2,
} as const;

function SectionHeader({
  index,
  tag,
  title,
  description,
}: {
  index: string;
  tag: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-10 flex max-w-[940px] flex-col items-start sm:mb-12">
      <div className="text-primary border-border bg-vault-navy mb-5 inline-flex min-h-7 items-center border px-2.5 py-1.5 font-mono text-[11px] font-bold tracking-[0.12em] uppercase">
        {index} / {tag}
      </div>
      <h2 className="font-heading max-w-[900px] text-3xl leading-none font-semibold tracking-[-0.045em] sm:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="text-muted-foreground mt-5 max-w-[720px] text-sm leading-7">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function StyleTrio({ id }: { id: string }) {
  return (
    // The title below already names the style, so this preview is decorative.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getIconStylePreviewImage(id)}
      alt=""
      aria-hidden="true"
      className="h-14 w-full object-contain"
      loading="lazy"
    />
  );
}

function RegenerateBoard({ cta }: { cta: string }) {
  return (
    <div className="bg-card rounded-xl border p-5 sm:p-6">
      {/* Large local pixel-art preview; avoid next/image optimization on 1k+ assets */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={REGENERATE_PREVIEW_IMAGE}
        alt=""
        width={1254}
        height={1254}
        aria-hidden="true"
        decoding="async"
        loading="lazy"
        className="bg-muted/25 w-full rounded-lg object-contain [image-rendering:pixelated]"
      />
      <p className="text-primary mt-4 flex items-center justify-center gap-2 text-center font-mono text-[11px] font-bold tracking-[0.08em] uppercase">
        <RefreshCw className="size-3.5" />
        {cta}
      </p>
    </div>
  );
}

export async function IconGeneratorLanding({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'workspace.icons' });
  const types = t.raw('landing.types.items') as CopyItem[];
  const styles = t.raw('landing.styles.items') as CopyItem[];
  const exports = t.raw('landing.export.items') as CopyItem[];
  const workflow = t.raw('landing.workflow') as CopyItem[];
  const faq = t.raw('faq') as FaqItem[];

  return (
    <>
      <section className={sectionPad}>
        <div className={shell}>
          <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <SectionHeader
              index="01"
              tag={t('landing.badges.set')}
              title={t('landing.set.title')}
              description={t('landing.set.description')}
            />
            <div className="bg-vault-navy overflow-hidden rounded-xl border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={BATCH_PREVIEW_IMAGE}
                alt=""
                width={1672}
                height={941}
                aria-hidden="true"
                decoding="async"
                loading="lazy"
                className="aspect-[16/9] w-full object-cover [image-rendering:pixelated]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className={`bg-card/20 ${sectionPad}`}>
        <div className={shell}>
          <SectionHeader
            index="02"
            tag={t('landing.badges.types')}
            title={t('landing.types.title')}
            description={t('landing.types.description')}
          />
          <div className="border-border overflow-hidden rounded-xl border">
            <div className="-mr-px -mb-px grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {types.map((item, index) => {
                const previewImage =
                  TYPE_PREVIEW_IMAGES[index] || TYPE_PREVIEW_IMAGES[0];
                return (
                  <article
                    key={item.title}
                    className="border-border bg-card border-r border-b p-6"
                  >
                    <Image
                      src={previewImage}
                      alt=""
                      width={64}
                      height={64}
                      aria-hidden="true"
                      className="size-14 object-contain [image-rendering:pixelated]"
                    />
                    <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                    <p className="text-muted-foreground mt-2 text-sm leading-6">
                      {item.text}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className={sectionPad}>
        <div className={shell}>
          <SectionHeader
            index="03"
            tag={t('landing.badges.styles')}
            title={t('landing.styles.title')}
            description={t('landing.styles.description')}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {styles.map((item) => (
              <article
                key={item.id || item.title}
                className="bg-card overflow-hidden rounded-xl border p-4"
              >
                <div className="bg-vault-navy rounded-lg px-2 py-2">
                  <StyleTrio id={item.id || 'pixel-art'} />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="text-muted-foreground mt-1.5 text-sm leading-6">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`bg-card/20 ${sectionPad}`}>
        <div className={shell}>
          <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <SectionHeader
              index="04"
              tag={t('landing.badges.regenerate')}
              title={t('landing.regenerate.title')}
              description={t('landing.regenerate.description')}
            />
            <div>
              <p className="text-muted-foreground mb-3 font-mono text-[11px] tracking-[0.12em] uppercase">
                {t('landing.regenerate.gridLabel')}
              </p>
              <RegenerateBoard cta={t('landing.regenerate.cta')} />
            </div>
          </div>
        </div>
      </section>

      <section className={sectionPad}>
        <div className={shell}>
          <SectionHeader
            index="05"
            tag={t('landing.badges.export')}
            title={t('landing.export.title')}
            description={t('landing.export.description')}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {exports.map((item) => {
              const Icon =
                EXPORT_ICONS[(item.id as keyof typeof EXPORT_ICONS) || 'batch'] ||
                ImageIcon;
              const body = (
                <>
                  <Icon className="text-primary size-5 stroke-[1.5]" />
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">
                    {item.text}
                  </p>
                </>
              );
              return (
                <article
                  key={item.title}
                  className="bg-card rounded-xl border p-5"
                >
                  {body}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className={`bg-card/20 ${sectionPad}`}>
        <div className={shell}>
          <SectionHeader
            index="06"
            tag={t('landing.badges.workflow')}
            title={t('landing.workflowTitle')}
          />
          <div className="border-border overflow-hidden rounded-xl border">
            <div className="-mr-px -mb-px grid grid-cols-1 md:grid-cols-3">
              {workflow.map((item, index) => (
                <article
                  key={item.title}
                  className="border-border bg-card border-r border-b p-6"
                >
                  <span className="text-primary font-mono text-xs font-bold">
                    0{index + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">
                    {item.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <MoreTools
        locale={locale}
        exclude="icons"
        index="07"
        tag={t('landing.badges.tools')}
        className={sectionPad}
      />

      <section className="px-0 py-20 sm:py-28">
        <div className={shell}>
          <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr]">
            <SectionHeader
              index="08"
              tag={t('landing.badges.faq')}
              title={t('faqTitle')}
            />
            <div className="border-border border-t">
              {faq.map((item) => (
                <details key={item.q} className="border-border group border-b">
                  <summary className="flex min-h-[72px] cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-sm font-semibold [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <Plus
                      className="text-primary size-4 shrink-0 transition-transform duration-160 group-open:rotate-45"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="text-muted-foreground pr-10 pb-5 text-sm leading-6">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
      <ToolCta
        title={t('ctaTitle')}
        text={t('ctaText')}
        label={t('ctaLabel')}
        href="#workspace"
      />
    </>
  );
}
