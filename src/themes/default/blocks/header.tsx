'use client';

import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

import { Link, usePathname } from '@/core/i18n/navigation';
import {
  BrandLogo,
  LocaleSelector,
  SignUser,
  SmartIcon,
  ThemeToggler,
} from '@/shared/blocks/common';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/shared/components/ui/navigation-menu';
import { cn } from '@/shared/lib/utils';
import type { NavItem } from '@/shared/types/blocks/common';
import type { Header as HeaderType } from '@/shared/types/blocks/landing';

const topLevelLinkClass =
  'inline-flex h-8 items-center justify-center rounded-md px-3 py-0 text-sm font-medium leading-none text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary focus-visible:ring-2 focus-visible:ring-ring data-[current=true]:bg-primary/10 data-[current=true]:text-primary';
const triggerClass =
  'h-8 rounded-md bg-transparent px-3 py-0 text-muted-foreground hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary data-[current=true]:bg-primary/10 data-[current=true]:text-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary data-[state=open]:hover:bg-primary/10 data-[state=open]:focus:bg-primary/10';
const dropdownLinkClass =
  'grid w-full grid-cols-[20px_minmax(0,1fr)] items-start gap-3 overflow-hidden rounded-md px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary focus-visible:ring-2 focus-visible:ring-ring data-[current=true]:bg-primary/10 data-[current=true]:text-primary';
const mobileLinkClass =
  'flex min-h-12 w-full flex-row items-center gap-2 rounded-md px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary focus-visible:ring-2 focus-visible:ring-ring data-[current=true]:bg-primary/10 data-[current=true]:text-primary';

export function Header({ header }: { header: HeaderType }) {
  const pathname = usePathname();
  const [hash, setHash] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [desktopMenu, setDesktopMenu] = useState('');

  useEffect(() => {
    const syncLocation = () => setHash(window.location.hash);
    syncLocation();
    window.addEventListener('hashchange', syncLocation);
    window.addEventListener('popstate', syncLocation);
    return () => {
      window.removeEventListener('hashchange', syncLocation);
      window.removeEventListener('popstate', syncLocation);
    };
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 64rem)');
    const closeMobileMenu = () => {
      if (media.matches) setIsMobileMenuOpen(false);
    };
    const escapeMenu = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };
    media.addEventListener('change', closeMobileMenu);
    document.addEventListener('keydown', escapeMenu);
    return () => {
      media.removeEventListener('change', closeMobileMenu);
      document.removeEventListener('keydown', escapeMenu);
    };
  }, []);

  const isActive = (item: NavItem): boolean => {
    if (item.children?.length) return item.children.some(isActive);
    if (!item.url || !item.url.startsWith('/')) return false;
    const [path, anchor = ''] = item.url.split('#');
    return pathname === path && hash === (anchor ? '#' + anchor : '');
  };

  const selectItem = (item: NavItem) => {
    setHash(item.url?.includes('#') ? '#' + item.url.split('#')[1] : '');
    setIsMobileMenuOpen(false);
    setDesktopMenu('');
  };

  return (
    <header className="border-border text-foreground bg-vault-navy fixed inset-x-0 top-0 z-50 border-b">
      <div className="container flex min-h-14 flex-wrap items-center justify-between gap-x-4 lg:min-h-18 lg:flex-nowrap">
        {header.brand && <BrandLogo brand={header.brand} />}
        <NavigationMenu
          value={desktopMenu}
          onValueChange={setDesktopMenu}
          viewport={false}
          className="hidden lg:flex"
        >
          <NavigationMenuList className="gap-1">
            {header.nav?.items?.map((item, index) => (
              <NavigationMenuItem
                key={item.title || index}
                value={String(index)}
              >
                {item.children?.length ? (
                  <>
                    <NavigationMenuTrigger
                      data-current={isActive(item)}
                      className={triggerClass}
                    >
                      {item.title}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent className="border-border w-[calc(100vw-2rem)] rounded-lg p-2 group-data-[viewport=false]/navigation-menu:translate-x-0 md:w-[340px]">
                      <ul className="space-y-1">
                        {item.children.map((child) => (
                          <li key={child.title}>
                            <NavigationMenuLink
                              asChild
                              className={dropdownLinkClass}
                            >
                              <Link
                                href={child.url || '/'}
                                target={child.target}
                                onClick={() => selectItem(child)}
                                data-current={isActive(child)}
                                aria-current={
                                  isActive(child) ? 'location' : undefined
                                }
                              >
                                {child.icon && (
                                  <SmartIcon
                                    name={child.icon as string}
                                    className="text-primary size-5 shrink-0"
                                  />
                                )}
                                <span className="min-w-0">
                                  <span className="block truncate font-medium text-current">
                                    {child.title}
                                  </span>
                                  {child.description && (
                                    <span className="text-muted-foreground mt-1 block truncate text-xs leading-relaxed">
                                      {child.description}
                                    </span>
                                  )}
                                </span>
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </>
                ) : (
                  <NavigationMenuLink asChild className={topLevelLinkClass}>
                    <Link
                      href={item.url || '/'}
                      target={item.target}
                      onClick={() => selectItem(item)}
                      data-current={isActive(item)}
                      aria-current={
                        isActive(item)
                          ? hash
                            ? 'location'
                            : 'page'
                          : undefined
                      }
                    >
                      {item.title}
                    </Link>
                  </NavigationMenuLink>
                )}
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <button
          type="button"
          aria-label={isMobileMenuOpen ? 'Close Menu' : 'Open Menu'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-foreground hover:bg-primary/10 hover:text-primary focus-visible:ring-ring flex size-11 items-center justify-center rounded-md focus-visible:ring-2 lg:hidden"
        >
          {isMobileMenuOpen ? (
            <X className="size-5" />
          ) : (
            <Menu className="size-5" />
          )}
        </button>

        <div
          id="mobile-navigation"
          className={cn(
            'order-last max-h-[calc(100dvh-56px)] w-full overflow-y-auto lg:hidden',
            !isMobileMenuOpen && 'hidden'
          )}
        >
          <nav aria-label="Mobile">
            <Accordion type="single" collapsible>
              {header.nav?.items?.map((item, index) => (
                <AccordionItem
                  key={item.title || index}
                  value={String(index)}
                  className="border-border"
                >
                  {item.children?.length ? (
                    <>
                      <AccordionTrigger
                        data-current={isActive(item)}
                        className={cn(
                          triggerClass,
                          'h-auto min-h-12 w-full justify-between px-3 py-3 hover:no-underline'
                        )}
                      >
                        {item.title}
                      </AccordionTrigger>
                      <AccordionContent className="pb-2">
                        {item.children.map((child) => (
                          <Link
                            key={child.title}
                            href={child.url || '/'}
                            onClick={() => selectItem(child)}
                            data-current={isActive(child)}
                            aria-current={
                              isActive(child) ? 'location' : undefined
                            }
                            className={cn(mobileLinkClass, 'pl-6')}
                          >
                            {child.icon && (
                              <SmartIcon
                                name={child.icon as string}
                                className="text-primary size-4"
                              />
                            )}
                            {child.title}
                          </Link>
                        ))}
                      </AccordionContent>
                    </>
                  ) : (
                    <Link
                      href={item.url || '/'}
                      onClick={() => selectItem(item)}
                      data-current={isActive(item)}
                      aria-current={
                        isActive(item)
                          ? hash
                            ? 'location'
                            : 'page'
                          : undefined
                      }
                      className={mobileLinkClass}
                    >
                      {item.title}
                    </Link>
                  )}
                </AccordionItem>
              ))}
            </Accordion>
          </nav>
        </div>

        <div
          className={cn(
            'items-center gap-3 lg:flex lg:shrink-0',
            isMobileMenuOpen
              ? 'order-last flex w-full flex-wrap py-4 lg:order-none lg:w-auto lg:py-0'
              : 'hidden'
          )}
        >
          {header.buttons?.map((button) => (
            <Link
              key={button.title}
              href={button.url || '/'}
              target={button.target}
              className={cn(
                'focus-visible:ring-ring inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium focus-visible:ring-2',
                button.variant === 'outline'
                  ? 'border-primary/55 text-primary hover:bg-primary/10 border'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              {button.icon && (
                <SmartIcon name={button.icon as string} className="size-4" />
              )}
              {button.title}
            </Link>
          ))}
          {header.show_theme && (
            <ThemeToggler className="text-muted-foreground hover:bg-primary/10 hover:text-primary flex size-8 items-center justify-center rounded-md transition-colors" />
          )}
          {header.show_locale && <LocaleSelector />}
          {header.show_sign && <SignUser userNav={header.user_nav} />}
        </div>
      </div>
    </header>
  );
}
