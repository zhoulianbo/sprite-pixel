import { locales } from '@/config/locale';
import {
  SpriteToolLanding,
  toolMetadata,
} from '@/shared/blocks/sprite-tools/landing';

export const revalidate = 3600;
export const generateMetadata = toolMetadata('splitter');
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <SpriteToolLanding tool="splitter" locale={locale} />;
}
