'use client';

import { useId, useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import type { FormLinkHtmlImporter } from '@/shared/types/blocks/form';

const ALLOWED_REL_TOKENS = new Set([
  'nofollow',
  'noopener',
  'noreferrer',
  'sponsored',
  'ugc',
]);

type ImportStatus = 'idle' | 'success' | 'error';

function getHttpUrl(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function getLinkTitle({
  anchor,
  imageAlt,
  url,
}: {
  anchor: HTMLAnchorElement;
  imageAlt: string;
  url: string;
}) {
  const explicitTitle =
    anchor.getAttribute('aria-label')?.trim() ||
    anchor.getAttribute('title')?.trim();
  if (explicitTitle) return explicitTitle;

  if (imageAlt) {
    const conciseImageAlt = imageAlt
      .replace(/^(?:listed|featured|available|found)\s+(?:on|at)\s+/i, '')
      .trim();
    return conciseImageAlt || imageAlt;
  }

  const linkText = anchor.textContent?.replace(/\s+/g, ' ').trim();
  if (linkText) return linkText;

  return new URL(url).hostname.replace(/^www\./, '');
}

function getRel(value: string | null) {
  if (!value) return '';

  return [
    ...new Set(
      value
        .toLowerCase()
        .split(/\s+/)
        .filter((token) => ALLOWED_REL_TOKENS.has(token))
    ),
  ].join(' ');
}

export function LinkHtmlImporter({
  config,
  form,
}: {
  config: FormLinkHtmlImporter;
  form: UseFormReturn<FieldValues>;
}) {
  const inputId = useId();
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<ImportStatus>('idle');

  const fieldNames = {
    group: 'group',
    title: 'title',
    url: 'url',
    imageUrl: 'imageUrl',
    altText: 'altText',
    rel: 'rel',
    ...config.fieldNames,
  };
  const groupValues = {
    badge: 'badge',
    text: 'friend',
    ...config.groupValues,
  };

  function updateFormField(name: string | undefined, fieldValue: string) {
    if (!name) return;

    form.setValue(name, fieldValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  function importLinkHtml(html: string) {
    if (!html.trim()) {
      setStatus('idle');
      return;
    }

    const document = new DOMParser().parseFromString(html, 'text/html');
    const anchor = document.querySelector<HTMLAnchorElement>('a[href]');
    const url = getHttpUrl(anchor?.getAttribute('href') ?? null);

    if (!anchor || !url) {
      setStatus('error');
      return;
    }

    const image = anchor.querySelector<HTMLImageElement>('img');
    const imageUrl = image ? getHttpUrl(image.getAttribute('src')) : null;
    if (image && !imageUrl) {
      setStatus('error');
      return;
    }

    const imageAlt = image?.getAttribute('alt')?.trim() ?? '';
    updateFormField(
      fieldNames.group,
      image ? groupValues.badge : groupValues.text
    );
    updateFormField(fieldNames.title, getLinkTitle({ anchor, imageAlt, url }));
    updateFormField(fieldNames.url, url);
    updateFormField(fieldNames.imageUrl, imageUrl ?? '');
    updateFormField(fieldNames.altText, imageAlt);
    updateFormField(fieldNames.rel, getRel(anchor.getAttribute('rel')));
    setStatus('success');
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{config.title}</Label>
      <Textarea
        id={inputId}
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          setValue(nextValue);
          importLinkHtml(nextValue);
        }}
        placeholder={config.placeholder}
        rows={4}
        className="bg-background font-mono text-sm"
        spellCheck={false}
      />
      {status === 'success' && config.successMessage ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {config.successMessage}
        </p>
      ) : status === 'error' && config.errorMessage ? (
        <p className="text-destructive text-sm">{config.errorMessage}</p>
      ) : config.tip ? (
        <p className="text-muted-foreground text-sm">{config.tip}</p>
      ) : null}
    </div>
  );
}
