import { FooterLinks } from '@/themes/default/blocks/footer-links';

export default async function HomepageFooterLinks({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'en') return null;

  return <FooterLinks />;
}
