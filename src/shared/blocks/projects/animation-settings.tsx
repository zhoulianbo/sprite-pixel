'use client';

import {
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import NextImage from 'next/image';
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconSword,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

import {
  animationDirectionValues,
  generationOptionValues,
  getActionTypeImage,
  mapGenerationOptions,
} from '@/config/generation';
import { AnimationBackgroundPicker } from '@/shared/blocks/projects/animation-background-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { cn } from '@/shared/lib/utils';

type HeroSelectOption = { value: string; label: string };
export type MotionActionConfig = {
  jumpType: string;
  dashType: string;
  weapon: string;
  attackStyle: string;
  shootType: string;
  castType: string;
  severity: string;
  deathType: string;
};

export function HeroOptionSelect({
  label,
  value,
  onValueChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: HeroSelectOption[];
  className?: string;
}) {
  return (
    <Select key={label} onValueChange={onValueChange} value={value}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          'hover:bg-secondary/70 bg-secondary/55 data-[state=open]:bg-secondary/70 h-8 w-auto min-w-0 shrink-0 gap-1 rounded-lg border-0 px-3 text-[12px] shadow-none hover:border-transparent focus-visible:ring-0 data-[state=open]:border-transparent [&_svg]:size-3.5',
          className
        )}
        size="sm"
      >
        <span className="text-muted-foreground shrink-0 pr-1 font-normal">
          {label}
        </span>
        <SelectValue>
          <span className="text-foreground font-medium">
            {options.find((option) => option.value === value)?.label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="min-w-[9.5rem]">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function HeroOptionButtons({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: HeroSelectOption[];
}) {
  return (
    <div className="contents">
      <span className="text-muted-foreground pt-1.5 text-sm font-medium whitespace-nowrap">
        {label}
      </span>
      <div
        className="flex min-w-0 flex-wrap gap-2"
        role="group"
        aria-label={label}
      >
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              aria-pressed={selected}
              className={cn(
                'inline-flex min-h-8 items-center rounded-md border px-3 text-sm font-medium transition-colors',
                selected
                  ? 'border-primary bg-primary/10 text-primary shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_40%,transparent)]'
                  : 'text-foreground/80 hover:border-primary/55 bg-secondary/55 border-white/12'
              )}
              key={option.value}
              onClick={() => onValueChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AnimationSettings({
  motionType,
  setMotionType,
  motionPrompt,
  setMotionPrompt,
  motionActionConfig,
  setMotionActionConfig,
  motionDirection,
  setMotionDirection,
  motionBackgroundColor,
  setMotionBackgroundColor,
  disabled,
  promptId,
  footer,
}: {
  motionType: string;
  setMotionType(value: string): void;
  motionPrompt: string;
  setMotionPrompt(value: string): void;
  motionActionConfig: MotionActionConfig;
  setMotionActionConfig: Dispatch<SetStateAction<MotionActionConfig>>;
  motionDirection: string;
  setMotionDirection(value: string): void;
  motionBackgroundColor: string;
  setMotionBackgroundColor(value: string): void;
  disabled?: boolean;
  promptId: string;
  footer: ReactNode;
}) {
  const t = useTranslations('pages.index.messages');
  const tGeneration = useTranslations('generation');
  const [showMoreActions, setShowMoreActions] = useState(false);
  const motionActions = mapGenerationOptions('actionType', (path) =>
    tGeneration(path as never)
  );
  const visibleMotionActions = showMoreActions
    ? motionActions
    : motionActions.slice(0, 10);
  const motionDetailTypes: readonly string[] =
    generationOptionValues.actionType;
  const motionSettingsType = motionDetailTypes.includes(motionType);
  const setActionConfig = (key: keyof MotionActionConfig, value: string) =>
    setMotionActionConfig((current) => ({ ...current, [key]: value }));
  const translatedOptions = (group: string, values: string[]) =>
    values.map((value) => ({
      value,
      label: t(`motionOptions.${group}.${value}` as never),
    }));
  const motionDirectionOptions = animationDirectionValues.map((value) => ({
    value,
    label: tGeneration(`options.animationDirection.${value}` as never),
  }));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">
            {tGeneration('fields.actionType')}
          </span>
          <button
            aria-expanded={showMoreActions}
            className="text-muted-foreground hover:border-primary/60 hover:bg-primary/10 hover:text-primary inline-flex h-8 items-center gap-1 rounded-md border border-white/12 px-3 text-xs font-medium"
            onClick={() => setShowMoreActions((current) => !current)}
            type="button"
          >
            {showMoreActions ? (
              <IconChevronUp aria-hidden="true" className="size-3.5" />
            ) : (
              <IconChevronDown aria-hidden="true" className="size-3.5" />
            )}
            {showMoreActions ? t('collapseActions') : t('moreActions')}
          </button>
        </div>
        <div className="grid grid-cols-5 gap-2 max-[860px]:grid-cols-3 max-[560px]:grid-cols-2">
          {visibleMotionActions.map((action) => {
            const selected = motionType === action.value;
            const image = getActionTypeImage(action.value);
            return (
              <button
                aria-pressed={selected}
                className={cn(
                  'bg-secondary/55 hover:border-primary/55 relative flex h-16 w-full items-center justify-center gap-2 overflow-hidden rounded-lg border px-2 text-sm font-semibold transition-colors',
                  selected
                    ? 'border-primary bg-primary/10 text-primary shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_40%,transparent)]'
                    : 'text-foreground/80 border-white/12'
                )}
                key={action.value}
                onClick={() => {
                  setMotionType(action.value);
                  setMotionPrompt('');
                }}
                type="button"
              >
                {image ? (
                  <NextImage
                    alt=""
                    aria-hidden="true"
                    className="size-9 shrink-0 object-contain [image-rendering:pixelated]"
                    height={36}
                    sizes="36px"
                    src={image}
                    unoptimized
                    width={36}
                  />
                ) : (
                  <IconSword aria-hidden="true" className="size-6 shrink-0" />
                )}
                <span className="truncate">{action.label}</span>
                {selected ? (
                  <span className="bg-primary text-primary-foreground absolute top-1 right-1 grid size-4 place-items-center rounded-full">
                    <IconCheck aria-hidden="true" className="size-3" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {motionSettingsType ? (
        <div className="border-border bg-background/40 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-3 rounded-lg border p-3">
          {motionType === 'jump' ? (
            <HeroOptionButtons
              label={t('motionFields.jumpType')}
              onValueChange={(value) => setActionConfig('jumpType', value)}
              options={translatedOptions('jumpType', ['in-place', 'forward'])}
              value={motionActionConfig.jumpType}
            />
          ) : null}
          {motionType === 'dash' ? (
            <HeroOptionButtons
              label={t('motionFields.dashType')}
              onValueChange={(value) => setActionConfig('dashType', value)}
              options={translatedOptions('dashType', [
                'forward',
                'backward',
                'side',
              ])}
              value={motionActionConfig.dashType}
            />
          ) : null}
          {motionType === 'attack' ? (
            <>
              <HeroOptionButtons
                label={t('motionFields.weapon')}
                onValueChange={(value) => setActionConfig('weapon', value)}
                options={translatedOptions('weapon', [
                  'keep-current',
                  'unarmed',
                  'sword',
                  'axe',
                  'staff',
                  'bow',
                  'dagger',
                  'spear',
                ])}
                value={motionActionConfig.weapon}
              />
              <HeroOptionButtons
                label={t('motionFields.attackStyle')}
                onValueChange={(value) => setActionConfig('attackStyle', value)}
                options={translatedOptions('attackStyle', [
                  'auto',
                  'slash',
                  'thrust',
                  'heavy',
                  'spin',
                ])}
                value={motionActionConfig.attackStyle}
              />
            </>
          ) : null}
          {motionType === 'shoot' ? (
            <HeroOptionButtons
              label={t('motionFields.shootType')}
              onValueChange={(value) => setActionConfig('shootType', value)}
              options={translatedOptions('shootType', [
                'bow',
                'gun',
                'magic-bolt',
              ])}
              value={motionActionConfig.shootType}
            />
          ) : null}
          {motionType === 'cast' ? (
            <HeroOptionButtons
              label={t('motionFields.castType')}
              onValueChange={(value) => setActionConfig('castType', value)}
              options={translatedOptions('castType', [
                'quick',
                'charge',
                'staff',
                'hand',
              ])}
              value={motionActionConfig.castType}
            />
          ) : null}
          {motionType === 'hurt' ? (
            <HeroOptionButtons
              label={t('motionFields.severity')}
              onValueChange={(value) => setActionConfig('severity', value)}
              options={translatedOptions('severity', ['light', 'heavy'])}
              value={motionActionConfig.severity}
            />
          ) : null}
          {motionType === 'death' ? (
            <HeroOptionButtons
              label={t('motionFields.deathType')}
              onValueChange={(value) => setActionConfig('deathType', value)}
              options={translatedOptions('deathType', [
                'collapse',
                'fall-back',
                'fall-forward',
              ])}
              value={motionActionConfig.deathType}
            />
          ) : null}
          {motionDetailTypes.includes(motionType) ? (
            <div className="contents">
              <span className="text-muted-foreground pt-2 text-sm font-medium whitespace-nowrap">
                {motionType === 'custom'
                  ? t('customAction')
                  : t('motionDetail')}
              </span>
              <textarea
                aria-label={
                  motionType === 'custom'
                    ? t('customAction')
                    : t('motionDetail')
                }
                className="border-border bg-secondary/35 focus:border-primary/60 min-h-[72px] min-w-0 resize-y rounded-md border px-3 py-2 text-sm outline-none"
                id={promptId}
                onChange={(event) => setMotionPrompt(event.target.value)}
                placeholder={
                  motionType === 'custom'
                    ? t('customActionPlaceholder')
                    : t('motionPromptPlaceholder')
                }
                value={motionPrompt}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-4">
        <div className="flex flex-wrap gap-2">
          {motionType === 'custom' ? null : (
            <HeroOptionSelect
              label={tGeneration('fields.direction')}
              onValueChange={setMotionDirection}
              options={motionDirectionOptions}
              value={motionDirection}
            />
          )}
          <AnimationBackgroundPicker
            value={motionBackgroundColor}
            onChange={setMotionBackgroundColor}
            disabled={disabled}
          />
        </div>
        {footer}
      </div>
    </div>
  );
}
