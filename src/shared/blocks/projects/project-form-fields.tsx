'use client';

import { useTranslations } from 'next-intl';

import { gameGenreValues } from '@/config/project';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';

export type ProjectFormValues = {
  name: string;
  description: string;
  gameGenre: string;
  artStyle: string;
};

export function ProjectFormFields({
  values,
  onChange,
  autoFocus = false,
  idPrefix = 'project',
}: {
  values: ProjectFormValues;
  onChange: (next: Partial<ProjectFormValues>) => void;
  autoFocus?: boolean;
  idPrefix?: string;
}) {
  const t = useTranslations('workspace.createProject');
  const tg = useTranslations('generation');
  const nameId = `${idPrefix}-name`;
  const descriptionId = `${idPrefix}-description`;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor={nameId}>{t('name')}</Label>
        <Input
          id={nameId}
          value={values.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder={t('namePlaceholder')}
          maxLength={80}
          autoFocus={autoFocus}
        />
      </div>
      <div className="grid gap-2">
        <Label>{t('gameGenre')}</Label>
        <Select
          value={values.gameGenre || undefined}
          onValueChange={(gameGenre) => onChange({ gameGenre })}
        >
          <SelectTrigger className="w-full" aria-required="true">
            <SelectValue placeholder={t('gameGenrePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {gameGenreValues.map((value) => (
              <SelectItem value={value} key={value}>
                {t(`genres.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>{t('style')}</Label>
        <Select
          value={values.artStyle}
          onValueChange={(artStyle) => onChange({ artStyle })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pixel_art">
              {tg('options.style.pixel-art')}
            </SelectItem>
            <SelectItem value="cartoon">
              {tg('options.style.cartoon')}
            </SelectItem>
            <SelectItem value="illustration">
              {tg('options.style.illustration')}
            </SelectItem>
            <SelectItem value="hand_painted">
              {tg('options.style.hand-painted')}
            </SelectItem>
            <SelectItem value="anime_2d">
              {tg('options.style.anime-2d')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor={descriptionId}>{t('projectDescription')}</Label>
        <Textarea
          id={descriptionId}
          value={values.description}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder={t('descriptionPlaceholder')}
          maxLength={500}
          className="min-h-48 resize-none"
        />
      </div>
    </div>
  );
}
