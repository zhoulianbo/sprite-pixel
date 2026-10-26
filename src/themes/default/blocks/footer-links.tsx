import { renderFooterLinkHtml } from '@/shared/lib/footer_link_html';
import { getPublishedFooterLinks } from '@/shared/models/footer_link';

import { FooterLinkMarquee } from './footer-link-marquee';

export async function FooterLinks() {
  const footerLinks = renderFooterLinkHtml(
    await getPublishedFooterLinks(),
    'en'
  );

  return (
    <div id="footer-exchange-links" className="min-w-0 space-y-4">
      <div className="group flex min-w-0 gap-[var(--gap)] overflow-x-auto [--gap:1.25rem] focus-within:!overflow-x-auto data-[overflow=true]:overflow-x-hidden motion-reduce:!overflow-x-auto [&:has(>div:empty)]:hidden">
        <div
          id="footer-friend-links"
          aria-label="Friend links"
          className="text-muted-foreground [&>a:hover]:text-primary flex w-max shrink-0 items-center gap-[var(--gap)] text-sm whitespace-nowrap [&>a]:shrink-0 [&>a]:duration-150"
          dangerouslySetInnerHTML={{ __html: footerLinks.friendHtml }}
        />
        <FooterLinkMarquee sourceId="footer-friend-links" />
      </div>
      <div className="group flex min-w-0 gap-[var(--gap)] overflow-x-auto [--gap:1rem] focus-within:!overflow-x-auto data-[overflow=true]:overflow-x-hidden motion-reduce:!overflow-x-auto [&:has(>div:empty)]:hidden">
        <div
          id="footer-badge-links"
          aria-label="Directory badges"
          className="flex w-max shrink-0 items-center gap-[var(--gap)] [&_img]:h-8 [&_img]:w-auto [&_img]:max-w-none [&>a]:shrink-0"
          dangerouslySetInnerHTML={{ __html: footerLinks.badgeHtml }}
        />
        <FooterLinkMarquee sourceId="footer-badge-links" />
      </div>
    </div>
  );
}
