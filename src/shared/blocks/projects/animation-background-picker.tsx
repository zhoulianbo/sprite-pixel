'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ANIMATION_BACKGROUND_PRESETS } from '@/config/generation/animation-background';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

export function AnimationBackgroundPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange(value: string): void;
  disabled?: boolean;
}) {
  const t = useTranslations('workspace.heroAnimation');
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={t('backgroundColor')}
          className="bg-secondary/55 hover:bg-secondary/70 data-[state=open]:bg-secondary/70 inline-flex h-9 items-center gap-1 rounded-lg px-3 text-xs disabled:opacity-50"
        >
          <span className="text-muted-foreground shrink-0 pr-1 font-normal">
            {t('backgroundColor')}
          </span>
          <span
            className="border-border size-4 shrink-0 rounded-sm border"
            style={value ? { backgroundColor: value } : undefined}
            aria-hidden="true"
          >
            {!value && (
              <span className="block h-full w-full bg-[linear-gradient(135deg,transparent_46%,var(--muted-foreground)_48%,var(--muted-foreground)_52%,transparent_54%)]" />
            )}
          </span>
          <span className="sr-only">{value || t('backgroundUnset')}</span>
          <ChevronDown className="size-3.5 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="border-primary/30 w-52">
        <DropdownMenuLabel>{t('backgroundColor')}</DropdownMenuLabel>
        <div className="grid grid-cols-5 gap-2 p-2">
          {ANIMATION_BACKGROUND_PRESETS.map((color) => (
            <DropdownMenuItem
              key={color}
              aria-label={t('backgroundPreset', { color })}
              title={color}
              onSelect={() => onChange(color)}
              className="border-border relative size-7 justify-center rounded-md border p-0"
              style={{ backgroundColor: color }}
            >
              {value.toLowerCase() === color && (
                <Check className="size-4 rounded-sm bg-black/70 text-white" />
              )}
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <label className="flex cursor-pointer items-center justify-between gap-3 px-2 py-1.5 text-sm">
          {t('backgroundCustom')}
          <input
            type="color"
            value={value || '#808080'}
            disabled={disabled}
            aria-label={t('backgroundCustom')}
            className="border-border h-8 w-10 cursor-pointer rounded-md border bg-transparent p-0.5"
            onInput={(event) => onChange(event.currentTarget.value)}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onChange('')}>
          {t('backgroundClear')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
