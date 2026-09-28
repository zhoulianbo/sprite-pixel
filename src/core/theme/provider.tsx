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
    <>
      {/* 生产压缩会让 next-themes 的内联脚本调用 __name / _name，浏览器里没有这个函数 */}
      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html:
            'function __name(fn){return fn}function _name(fn){return fn}',
        }}
      />
      <NextThemesProvider
        attribute="class"
        defaultTheme={resolvedTheme}
        forcedTheme={appearance === 'system' ? undefined : resolvedTheme}
        enableSystem={appearance === 'system'}
        disableTransitionOnChange
      >
        {children}
      </NextThemesProvider>
    </>
  );
}
