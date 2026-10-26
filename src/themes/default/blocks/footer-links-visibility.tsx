'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { isEnglishHomepage } from '@/shared/lib/footer_link_html';

export function FooterLinksVisibility({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (!pathname || !isEnglishHomepage('en', pathname)) return null;

  return children;
}
