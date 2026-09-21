import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { ArrowUpRight, Plus } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { defaultLocale, locales } from '@/config/locale';
import { MoreTools } from '@/shared/blocks/common/more-tools';
import { ToolCta } from '@/shared/blocks/common/tool-cta';
import { getMetadata } from '@/shared/lib/seo';
import { toolPath, type Tool } from '@/shared/lib/sprite-tools/core';

import { SpriteWorkbench } from './workbench';

type Item = { title: string; text: string };
type Copy = {
  design: {
    tag: string;
    baseline: string;
    hero: string;
    proof: string;
    workflow: string;
    source: string;
    result: string;
    alignment: string;
    motion: string;
    selected: string;
    detail: string;
    next: string;
  };
  title: string;
  intro: string;
  eyebrow: string;
  stepsTitle: string;
  steps: Item[];
  featuresTitle: string;
  features: Item[];
  useCasesTitle: string;
  useCases: Item[];
  guideTitle: string;
  guide: Item[];
  faqTitle: string;
  faqEyebrow: string;
  faqText: string;
  faq: Item[];
  relatedTitle: string;
  relatedText: string;
  relatedLabel: string;
  ctaTitle: string;
  ctaText: string;
  ctaLabel: string;
  badges: {
    steps: string;
    features: string;
    useCases: string;
    guide: string;
    tools: string;
    faq: string;
  };
};
const shell =
  'mx-auto w-[min(1216px,calc(100%-40px))] max-[760px]:w-[min(calc(100%-28px),620px)]';
const sectionPad = 'border-border border-b py-[136px] max-[760px]:py-[88px]';
const MAKER_FEATURE_IMAGES = [
  '/imgs/features/sprite-sheet-maker/gif-complete-frames-v2.webp',
  '/imgs/features/sprite-sheet-maker/preserve-original-scale-v2.webp',
  '/imgs/features/sprite-sheet-maker/animation-preview-controls-v2.webp',
] as const;
const MAKER_USE_CASE_IMAGES = [
  {
    src: '/imgs/features/sprite-sheet-maker/character-action-loop-v2.webp',
    width: 2087,
    height: 753,
  },
  {
    src: '/imgs/features/sprite-sheet-maker/effects-icons-animation-v2.webp',
    width: 1808,
    height: 870,
  },
] as const;
const SPLITTER_FEATURE_IMAGES = [
  '/imgs/features/sprite-sheet-cutter/slice-counts-or-dimensions.webp',
  '/imgs/features/sprite-sheet-cutter/select-needed-frames.webp',
  '/imgs/features/sprite-sheet-cutter/preview-selected-motion.webp',
] as const;
const SPLITTER_USE_CASE_IMAGES = [
  {
    src: '/imgs/features/sprite-sheet-cutter/separate-character-action.webp',
    width: 1942,
    height: 809,
  },
  {
    src: '/imgs/features/sprite-sheet-cutter/recover-png-assets.webp',
    width: 1942,
    height: 810,
  },
] as const;
function SectionHeader({
  index,
  tag,
  eyebrow,
  title,
  description,
}: {
  index: string;
  tag: string;
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  const badge =
    'text-primary border-border bg-vault-navy inline-flex min-h-7 items-center border px-2.5 py-1.5 font-mono text-[11px] font-bold tracking-[0.12em] uppercase';
  return (
    <div className="mb-[50px] flex max-w-[940px] flex-col items-start max-[760px]:mb-[36px]">
      <div className="mb-[22px] flex flex-wrap items-center gap-2.5 max-[760px]:mb-[18px]">
        <div className={badge}>
          {index} / {tag}
        </div>
        {eyebrow ? <div className={badge}>{eyebrow}</div> : null}
      </div>
      <h2 className="max-w-[900px] [font-family:var(--font-heading),var(--font-sans)] text-[clamp(38px,4.8vw,66px)] leading-none font-medium tracking-[-0.055em]">
        {title}
      </h2>
      {description ? (
        <p className="text-muted-foreground mt-5 max-w-[720px] text-sm leading-[1.75]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
function BoardCard({ children }: { children: ReactNode }) {
  return (
    <article className="border-border bg-card border-r border-b p-7">
      {children}
    </article>
  );
}
function CardGrid({
  columns,
  children,
}: {
  columns: '2' | '3';
  children: ReactNode;
}) {
  return (
    <div className="border-border overflow-hidden rounded-xl border">
      <div
        className={`-mr-px -mb-px grid ${columns === '3' ? 'grid-cols-3 max-[760px]:grid-cols-1' : 'grid-cols-2 max-[760px]:grid-cols-1'}`}
      >
        {children}
      </div>
    </div>
  );
}
function pageUrl(tool: Tool, locale: string) {
  return `${envConfigs.app_url.replace(/\/$/, '')}${locale === defaultLocale ? '' : `/${locale}`}${toolPath(tool)}`;
}
export function toolMetadata(tool: Tool) {
  return async (props: {
    params: Promise<{ locale: string }>;
  }): Promise<Metadata> => {
    const { locale } = await props.params;
    const base = await getMetadata({
      metadataKey: `tools.sprites.${tool}.metadata`,
      canonicalUrl: toolPath(tool),
    })(props);
    return {
      ...base,
      alternates: {
        canonical: pageUrl(tool, locale),
        languages: {
          ...Object.fromEntries(
            locales.map((language) => [language, pageUrl(tool, language)])
          ),
          'x-default': pageUrl(tool, defaultLocale),
        },
      },
    };
  };
}
export async function SpriteToolLanding({
  tool,
  locale,
}: {
  tool: Tool;
  locale: string;
}) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'tools.sprites' });
  const copy = t.raw(tool) as Copy;
  const relatedTool = tool === 'maker' ? 'splitter' : 'maker';
  const featureImages =
    tool === 'maker' ? MAKER_FEATURE_IMAGES : SPLITTER_FEATURE_IMAGES;
  const useCaseImages =
    tool === 'maker' ? MAKER_USE_CASE_IMAGES : SPLITTER_USE_CASE_IMAGES;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${pageUrl(tool, locale)}#tool`,
        name: copy.title,
        description: copy.intro,
        url: pageUrl(tool, locale),
        applicationCategory: 'DesignApplication',
        operatingSystem: 'Web browser',
        browserRequirements: 'JavaScript, Canvas, Web Workers',
        inLanguage: locale,
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        featureList: copy.features.map((item) => item.title),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: t('ui.home'),
            item: `${envConfigs.app_url.replace(/\/$/, '')}${locale === defaultLocale ? '/' : `/${locale}`}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: copy.title,
            item: pageUrl(tool, locale),
          },
        ],
      },
    ],
  };
  return (
    <main className="bg-background text-foreground [&_h1]:[font-family:var(--font-heading),var(--font-sans)] [&_h2]:[font-family:var(--font-heading),var(--font-sans)] [&_h3]:[font-family:var(--font-heading),var(--font-sans)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
        }}
      />
      <section className="border-border bg-vault-navy relative border-b pt-28 pb-16 sm:pt-32 sm:pb-24">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute inset-x-0 top-0 h-[600px] bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] [mask-image:linear-gradient(black,transparent)] bg-[size:48px_48px]" />
        </div>
        <div className={`relative ${shell}`}>
          <div className="mx-auto mb-9 max-w-3xl text-center sm:mb-11">
            <p className="text-primary mb-5 font-mono text-[10px] tracking-[0.2em] sm:text-[11px]">
              {copy.eyebrow}
            </p>
            <h1 className="text-4xl leading-[0.98] font-semibold tracking-[-0.045em] text-pretty sm:text-6xl lg:text-7xl">
              {copy.title}
            </h1>
            <p className="text-muted-foreground mx-auto mt-5 max-w-[42rem] text-base leading-7 text-pretty sm:text-lg">
              {copy.design.hero}
            </p>
          </div>
          <SpriteWorkbench tool={tool} />
        </div>
      </section>
      <section className={sectionPad}>
        <div className={shell}>
          <SectionHeader
            index="01"
            tag={copy.badges.steps}
            title={copy.stepsTitle}
            description={copy.design.workflow}
          />
          <CardGrid columns="3">
            {copy.steps.map((item, index) => (
              <BoardCard key={item.title}>
                <span className="text-primary font-mono text-[10px] font-bold">
                  0{index + 1}
                </span>
                <h3 className="mt-[22px] text-[21px] font-medium">
                  {item.title.replace(/^\d+\.\s*/, '')}
                </h3>
                <p className="text-muted-foreground mt-2.5 text-sm leading-[1.7]">
                  {item.text}
                </p>
              </BoardCard>
            ))}
          </CardGrid>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
            <a
              href="#workbench"
              className="text-primary inline-flex min-h-11 items-center gap-2 font-mono text-[11px] font-bold tracking-[0.08em] uppercase hover:underline"
            >
              {copy.design.proof}
              <ArrowUpRight size={16} />
            </a>
            <Link
              href={toolPath(relatedTool)}
              className="text-primary inline-flex min-h-11 items-center gap-2 font-mono text-[11px] font-bold tracking-[0.08em] uppercase hover:underline"
            >
              {copy.relatedLabel}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section className={sectionPad}>
        <div className={shell}>
          <SectionHeader
            index="02"
            tag={copy.badges.features}
            title={copy.featuresTitle}
            description={copy.intro}
          />
          <div className="grid gap-[18px]">
            {copy.features.map((item, index) => (
              <article
                key={item.title}
                className="border-border bg-card overflow-hidden rounded-xl border md:grid md:grid-cols-2 md:items-stretch"
              >
                <div
                  className={
                    index % 2 ? 'md:order-2' : 'border-border md:border-r'
                  }
                >
                  <div className="bg-vault-navy relative h-full min-h-[320px] sm:min-h-[380px]">
                    <Image
                      src={featureImages[index]}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      aria-hidden="true"
                      className="object-contain [image-rendering:pixelated]"
                    />
                  </div>
                </div>
                <div
                  className={`flex flex-col justify-center p-7 sm:p-10 ${index % 2 ? 'border-border md:order-1 md:border-r' : ''}`}
                >
                  <p className="text-primary font-mono text-[11px] font-bold tracking-[0.12em] uppercase">
                    0{index + 1}
                  </p>
                  <h3 className="mt-[22px] max-w-md text-[26px] leading-tight font-medium">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground mt-2.5 text-sm leading-[1.7]">
                    {item.text}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className={sectionPad}>
        <div className={shell}>
          <SectionHeader
            index="03"
            tag={copy.badges.useCases}
            title={copy.useCasesTitle}
          />
          <CardGrid columns="2">
            {copy.useCases.map((item, index) => (
              <BoardCard key={item.title}>
                <div className="bg-vault-navy relative mb-6 aspect-[2.2/1] w-full overflow-hidden rounded-lg">
                  <Image
                    src={useCaseImages[index].src}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    aria-hidden="true"
                    className="object-contain [image-rendering:pixelated]"
                  />
                </div>
                <h3 className="text-[21px] font-medium">{item.title}</h3>
                <p className="text-muted-foreground mt-2.5 text-sm leading-[1.7]">
                  {item.text}
                </p>
              </BoardCard>
            ))}
          </CardGrid>
        </div>
      </section>
      <section className={sectionPad}>
        <div className={shell}>
          <SectionHeader
            index="04"
            tag={copy.badges.guide}
            title={copy.guideTitle}
          />
          <CardGrid columns={tool === 'maker' ? '3' : '2'}>
            {copy.guide.map((item) => (
              <BoardCard key={item.title}>
                <h3 className="text-[21px] font-medium">{item.title}</h3>
                <p className="text-muted-foreground mt-2.5 text-sm leading-[1.7]">
                  {item.text}
                </p>
              </BoardCard>
            ))}
          </CardGrid>
        </div>
      </section>
      <MoreTools
        locale={locale}
        exclude={tool === 'maker' ? 'maker' : 'cutter'}
        index="05"
        tag={copy.badges.tools}
        className={sectionPad}
      />
      <section className={sectionPad}>
        <div className={shell}>
          <div className="grid grid-cols-[0.75fr_1.25fr] gap-20 max-[760px]:block">
            <SectionHeader
              index="06"
              tag={copy.badges.faq}
              title={copy.faqTitle}
              description={copy.faqText}
            />
            <div className="border-border overflow-hidden rounded-xl border max-[760px]:mt-9">
              {copy.faq.map((item) => (
                <details
                  key={item.title}
                  className="border-border group border-b last:border-b-0"
                >
                  <summary className="flex min-h-[74px] cursor-pointer list-none items-center justify-between gap-[18px] px-5 text-left text-[13px] [&::-webkit-details-marker]:hidden">
                    {item.title}
                    <Plus
                      className="text-primary size-4 shrink-0 transition-transform duration-160 group-open:rotate-45"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="text-muted-foreground px-5 pr-11 pb-6 text-sm leading-[1.75]">
                    {item.text}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
      <ToolCta
        title={copy.ctaTitle}
        text={copy.ctaText}
        label={copy.ctaLabel}
        href="#workbench"
      />
    </main>
  );
}
