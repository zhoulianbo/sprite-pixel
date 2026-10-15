'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/shared/components/ui/button';
import type { Frame } from '@/shared/lib/sprite-tools/core';

import { useBlobUrl } from './previews';

export function BeforeAfter({
  before,
  after,
}: {
  before: Frame[];
  after: (Frame | undefined)[];
}) {
  const t = useTranslations('tools.sprites.ui.freeTools');
  const [split, setSplit] = useState(50);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const safeIndex = Math.min(index, Math.max(0, before.length - 1));
  const original = before[safeIndex];
  const result = after[safeIndex];
  const originalUrl = useBlobUrl(original?.blob);
  const resultUrl = useBlobUrl(result?.blob);
  useEffect(() => {
    if (!playing || before.length < 2) return;
    let frame: number;
    let started = 0;
    const tick = (now: number) => {
      if (!started || document.hidden) started = now;
      if (now - started >= (original?.duration || 100)) {
        setIndex((n) => (n + 1) % before.length);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, safeIndex, original?.duration, before.length]);
  if (!original) return null;
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span>{t('before')}</span>
        <span>{result ? t('after') : t('notProcessed')}</span>
      </div>
      <div className="relative mx-auto flex h-[320px] max-w-full items-center justify-center overflow-hidden rounded-xl border bg-[conic-gradient(var(--color-secondary)_25%,transparent_0_50%,var(--color-secondary)_0_75%,transparent_0)] bg-[length:20px_20px] sm:h-[420px]">
        {originalUrl && (
          <img
            src={originalUrl}
            alt={t('before')}
            className="absolute inset-0 h-full w-full object-contain [image-rendering:pixelated]"
          />
        )}
        {resultUrl && (
          <div
            className="bg-background absolute inset-0 bg-[conic-gradient(var(--color-secondary)_25%,transparent_0_50%,var(--color-secondary)_0_75%,transparent_0)] bg-[length:20px_20px]"
            style={{ clipPath: `inset(0 0 0 ${split}%)` }}
          >
            <img
              src={resultUrl}
              alt={t('after')}
              className="h-full w-full object-contain [image-rendering:pixelated]"
            />
          </div>
        )}
        {resultUrl && (
          <div
            className="bg-primary pointer-events-none absolute inset-y-0 w-0.5"
            style={{ left: `${split}%` }}
          />
        )}
      </div>
      <label className="flex items-center gap-3 text-sm">
        <span>{t('compare')}</span>
        <input
          aria-label={t('compare')}
          type="range"
          min={0}
          max={100}
          value={split}
          disabled={!result}
          onChange={(e) => setSplit(Number(e.target.value))}
          className="accent-primary flex-1"
        />
      </label>
      {before.length > 1 && (
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setPlaying(!playing)}>
            {t(playing ? 'pause' : 'play')}
          </Button>
          <input
            aria-label={t('frame')}
            type="range"
            min={0}
            max={before.length - 1}
            value={safeIndex}
            onChange={(e) => {
              setPlaying(false);
              setIndex(Number(e.target.value));
            }}
            className="accent-primary min-w-0 flex-1"
          />
          <span className="text-sm">
            {safeIndex + 1} / {before.length}
          </span>
        </div>
      )}
    </div>
  );
}
