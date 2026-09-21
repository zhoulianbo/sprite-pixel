'use client';

import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';

import { Link, usePathname } from '@/core/i18n/navigation';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/shared/components/ui/hover-card';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/shared/components/ui/sidebar';
import { cn } from '@/shared/lib/utils';
import { NavItem, type Nav as NavType } from '@/shared/types/blocks/common';

function isNavActive(pathname: string, url?: string) {
  if (!url) return false;
  if (url === '/') return pathname === '/';
  if (url === '/dashboard') {
    return (
      pathname === '/dashboard' || pathname.startsWith('/dashboard/projects/')
    );
  }
  return pathname === url || pathname.startsWith(`${url}/`);
}

function navItemActiveClass(active: boolean) {
  return active
    ? 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90 hover:text-sidebar-accent-foreground active:bg-sidebar-accent/90 active:text-sidebar-accent-foreground min-w-8 duration-200 ease-linear'
    : '';
}

function NavItemWithChildren({
  item,
  pathname,
  mounted,
}: {
  item: NavItem;
  pathname: string;
  mounted: boolean;
}) {
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed' && !isMobile;

  const parentActive =
    item.is_active ||
    (mounted &&
      item.children?.some((child) => isNavActive(pathname, child.url)));

  if (collapsed) {
    return (
      <SidebarMenuItem>
        <HoverCard openDelay={0} closeDelay={80}>
          <HoverCardTrigger asChild>
            <SidebarMenuButton
              className={navItemActiveClass(Boolean(parentActive))}
            >
              {item.icon ? <SmartIcon name={item.icon as string} /> : null}
              <span>{item.title || ''}</span>
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </HoverCardTrigger>
          <HoverCardContent
            side="right"
            align="start"
            sideOffset={8}
            className="w-auto min-w-48 rounded-xl p-1"
          >
            <p className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
              {item.title}
            </p>
            <ul className="flex flex-col gap-0.5">
              {item.children?.map((subItem) => {
                const subActive =
                  subItem.is_active ||
                  (mounted && isNavActive(pathname, subItem.url));

                return (
                  <li key={subItem.title}>
                    <Link
                      href={subItem.url as string}
                      target={subItem.target as string}
                      className={cn(
                        'hover:bg-primary/10 hover:text-primary flex items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden',
                        subActive &&
                          'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      )}
                    >
                      {subItem.icon ? (
                        <SmartIcon name={subItem.icon as string} />
                      ) : null}
                      <span>{subItem.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </HoverCardContent>
        </HoverCard>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible
      asChild
      defaultOpen={item.is_expand || false}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            className={navItemActiveClass(Boolean(parentActive))}
          >
            {item.icon ? <SmartIcon name={item.icon as string} /> : null}
            <span>{item.title || ''}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[collapsible=icon]:hidden group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children?.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  asChild
                  className={navItemActiveClass(
                    Boolean(
                      subItem.is_active ||
                        (mounted && isNavActive(pathname, subItem.url))
                    )
                  )}
                >
                  <Link
                    href={subItem.url as string}
                    target={subItem.target as string}
                  >
                    {subItem.icon ? (
                      <SmartIcon name={subItem.icon as string} />
                    ) : null}
                    <span>{subItem.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function Nav({ nav, className }: { nav: NavType; className?: string }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <SidebarGroup className={className}>
      <SidebarGroupContent className="mt-0 flex flex-col gap-2">
        {nav.title && <SidebarGroupLabel>{nav.title}</SidebarGroupLabel>}
        <SidebarMenu>
          {nav.items.map((item: NavItem | undefined) => {
            if (!item) return null;

            if (item.children?.length) {
              return (
                <NavItemWithChildren
                  key={item.title || ''}
                  item={item}
                  pathname={pathname}
                  mounted={mounted}
                />
              );
            }

            return (
              <SidebarMenuItem key={item.title || ''}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  className={navItemActiveClass(
                    Boolean(
                      item.is_active ||
                        (mounted && isNavActive(pathname, item.url))
                    )
                  )}
                >
                  <Link href={item.url as string} target={item.target as string}>
                    {item.icon ? <SmartIcon name={item.icon as string} /> : null}
                    <span>{item.title || ''}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
