import { getLocale } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import {
  BrandLogo,
  Copyright,
  LocaleSelector,
  ThemeToggler,
} from '@/shared/blocks/common';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { renderFooterLinkHtml } from '@/shared/lib/footer_link_html';
import { getPublishedFooterLinks } from '@/shared/models/footer_link';
import { NavItem } from '@/shared/types/blocks/common';
import { Footer as FooterType } from '@/shared/types/blocks/landing';

import { FooterLinkMarquee } from './footer-link-marquee';

async function getFooterLinkHtml() {
  try {
    const locale = await getLocale();
    if (locale !== 'en') return null;

    return renderFooterLinkHtml(await getPublishedFooterLinks(), locale);
  } catch (error) {
    console.warn('load footer links failed:', error);
    return null;
  }
}

export async function Footer({ footer }: { footer: FooterType }) {
  const footerLinks = await getFooterLinkHtml();

  return (
    <footer
      id={footer.id}
      className={`text-foreground py-8 sm:py-8 ${footer.className || ''} overflow-x-hidden`}
      // overflow-x-hidden防止-footer-撑出水平滚动条
    >
      <div className="container space-y-8 overflow-x-hidden">
        <div className="grid min-w-0 gap-12 md:grid-cols-5">
          <div className="min-w-0 space-y-4 break-words md:col-span-2 md:space-y-6">
            {footer.brand ? <BrandLogo brand={footer.brand} /> : null}

            {footer.brand?.description ? (
              <p
                className="text-muted-foreground text-sm text-balance break-words"
                dangerouslySetInnerHTML={{ __html: footer.brand.description }}
              />
            ) : null}
          </div>

          <div className="col-span-3 grid min-w-0 gap-6 sm:grid-cols-3">
            {footer.nav?.items.map((item, idx) => (
              <div key={idx} className="min-w-0 space-y-4 text-sm break-words">
                <span className="text-foreground block font-medium break-words">
                  {item.title}
                </span>

                <div className="flex min-w-0 flex-wrap gap-4 sm:flex-col">
                  {item.children?.map((subItem, iidx) => (
                    <Link
                      prefetch={false}
                      key={iidx}
                      href={subItem.url || ''}
                      target={subItem.target || ''}
                      className="text-muted-foreground hover:text-primary block break-words duration-150"
                    >
                      <span className="break-words">{subItem.title || ''}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-4 sm:gap-8">
          <div id="footer-exchange-links" className="min-w-0 flex-1 space-y-4">
            <div className="group flex min-w-0 gap-[var(--gap)] overflow-x-auto [--gap:1.25rem] focus-within:!overflow-x-auto data-[overflow=true]:overflow-x-hidden motion-reduce:!overflow-x-auto [&:has(>div:empty)]:hidden">
              <div
                id="footer-friend-links"
                aria-label="Friend links"
                className="text-muted-foreground [&>a:hover]:text-primary flex w-max shrink-0 items-center gap-[var(--gap)] text-sm whitespace-nowrap [&>a]:shrink-0 [&>a]:duration-150"
                dangerouslySetInnerHTML={{
                  __html: footerLinks?.friendHtml ?? '',
                }}
              />
              <FooterLinkMarquee sourceId="footer-friend-links" />
            </div>
            <div className="group flex min-w-0 gap-[var(--gap)] overflow-x-auto [--gap:1rem] focus-within:!overflow-x-auto data-[overflow=true]:overflow-x-hidden motion-reduce:!overflow-x-auto [&:has(>div:empty)]:hidden">
              <div
                id="footer-badge-links"
                aria-label="Directory badges"
                className="flex w-max shrink-0 items-center gap-[var(--gap)] [&_img]:h-8 [&_img]:w-auto [&_img]:max-w-none [&>a]:shrink-0"
                dangerouslySetInnerHTML={{
                  __html: footerLinks?.badgeHtml ?? '',
                }}
              />
              <FooterLinkMarquee sourceId="footer-badge-links" />
            </div>
          </div>
          {footer.show_theme !== false ? <ThemeToggler type="toggle" /> : null}
        </div>

        <div
          aria-hidden
          className="h-px min-w-0 [background-image:linear-gradient(90deg,var(--color-foreground)_1px,transparent_1px)] bg-[length:6px_1px] bg-repeat-x opacity-25"
        />
        <div className="flex min-w-0 flex-wrap justify-between gap-8">
          {footer.copyright ? (
            <p
              className="text-muted-foreground text-sm text-balance break-words"
              dangerouslySetInnerHTML={{ __html: footer.copyright }}
            />
          ) : footer.brand ? (
            <Copyright brand={footer.brand} />
          ) : null}

          <div className="min-w-0 flex-1"></div>

          {footer.agreement ? (
            <div className="flex min-w-0 flex-wrap items-center gap-4">
              {footer.agreement?.items.map((item: NavItem, index: number) => (
                <Link
                  prefetch={false}
                  key={index}
                  href={item.url || ''}
                  target={item.target || ''}
                  className="text-muted-foreground hover:text-primary block text-xs break-words underline duration-150"
                >
                  {item.title || ''}
                </Link>
              ))}
            </div>
          ) : null}

          {footer.social || footer.show_locale !== false ? (
            <div className="flex shrink-0 items-center gap-2">
              {footer.social?.items.map((item: NavItem, index) => (
                <Link
                  prefetch={false}
                  key={index}
                  href={item.url || ''}
                  target={item.target || ''}
                  className="text-muted-foreground hover:bg-primary/10 hover:text-primary bg-background block cursor-pointer rounded-md p-2 duration-150"
                  aria-label={item.title || 'Social media link'}
                >
                  {item.icon && (
                    <SmartIcon name={item.icon as string} size={20} />
                  )}
                </Link>
              ))}
              {footer.show_locale !== false ? (
                <LocaleSelector type="button" />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
