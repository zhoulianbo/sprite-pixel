'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { usePathname, useRouter } from '@/core/i18n/navigation';
import { localeFlags, localeNames } from '@/config/locale';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cacheSet } from '@/shared/lib/cache';

function LocaleLabel({ locale }: { locale: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span aria-hidden className="shrink-0 text-base leading-none">
        {localeFlags[locale] || '🌐'}
      </span>
      <span className="truncate">{localeNames[locale] || locale}</span>
    </span>
  );
}

export function LocaleSelector({
  type = 'icon',
}: {
  type?: 'icon' | 'button';
}) {
  const currentLocale = useLocale();
  const t = useTranslations('common.locale_detector');
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSwitchLanguage = (value: string) => {
    if (value !== currentLocale) {
      // Update localStorage to sync with locale detector
      cacheSet('locale', value);
      const query = typeof window !== 'undefined' ? window.location.search : '';
      const href = query ? `${pathname}${query}` : pathname;
      router.push(href, {
        locale: value,
      });
    }
  };

  // Return a placeholder during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <Button
        variant={type === 'icon' ? 'ghost' : 'outline'}
        size="sm"
        className={
          type === 'icon'
            ? 'text-foreground hover:bg-primary/10 hover:text-primary h-8 gap-2 px-2.5'
            : 'border-border text-foreground hover:bg-primary/10 hover:text-primary h-8 gap-2 bg-transparent px-2.5'
        }
        disabled
      >
        <LocaleLabel locale={currentLocale} />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={type === 'icon' ? 'ghost' : 'outline'}
          size="sm"
          className={
            type === 'icon'
              ? 'text-foreground hover:bg-primary/10 hover:text-primary h-8 gap-2 px-2.5'
              : 'border-border text-foreground hover:bg-primary/10 hover:text-primary h-8 gap-2 bg-transparent px-2.5'
          }
          aria-label={t('selector_label', {
            locale: localeNames[currentLocale] || currentLocale,
          })}
        >
          <LocaleLabel locale={currentLocale} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-40">
        {Object.keys(localeNames).map((locale) => (
          <DropdownMenuItem
            key={locale}
            className="justify-between gap-4"
            onClick={() => handleSwitchLanguage(locale)}
          >
            <LocaleLabel locale={locale} />
            {locale === currentLocale && (
              <Check size={16} className="text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
