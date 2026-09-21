import { ReactNode } from 'react';

import { SidebarInset, SidebarProvider } from '@/shared/components/ui/sidebar';
import { Sidebar as SidebarType } from '@/shared/types/blocks/dashboard';

import { Sidebar } from './sidebar';

export function DashboardLayout({
  children,
  sidebar,
  sidebarWidth = 'calc(var(--spacing) * 72)',
}: {
  children: ReactNode;
  sidebar: SidebarType;
  sidebarWidth?: string;
}) {
  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': sidebarWidth,
          '--header-height': 'calc(var(--spacing) * 14)',
        } as React.CSSProperties
      }
    >
      {sidebar && (
        <Sidebar variant={sidebar.variant || 'inset'} sidebar={sidebar} />
      )}
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
