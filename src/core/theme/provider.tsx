'use client';

import { ReactNode, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

import { envConfigs } from '@/config';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();

  useEffect(() => {
    if (typeof document !== 'undefined' && locale) {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const appearance = envConfigs.appearance || 'dark';
  const resolvedTheme = appearance === 'light' ? 'light' : 'dark';

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={resolvedTheme}
      forcedTheme={appearance === 'system' ? undefined : resolvedTheme}
      enableSystem={appearance === 'system'}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
