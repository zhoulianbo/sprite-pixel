'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { Frame } from '@/shared/lib/sprite-tools/core';

import { BeforeAfter } from './before-after';

export function BackgroundExample({ gif = false }: { gif?: boolean }) {
  const t = useTranslations('tools.sprites.ui.freeTools');
  const [frames, setFrames] = useState<[Frame[], Frame[]]>();
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const files = gif
        ? [
            'before-01',
            'before-02',
            'before-03',
            'after-01',
            'after-02',
            'after-03',
          ]
        : ['before', 'after'];
      const result = await Promise.all(
        files.map(async (name) => {
          const response = await fetch(
            `/imgs/features/background-removal/${name}.png`,
            { signal: controller.signal }
          );
          if (!response.ok) throw new Error('EXAMPLE_UNAVAILABLE');
          const blob = await response.blob();
          const bitmap = await createImageBitmap(blob);
          const frame = {
            id: name,
            name,
            blob,
            width: bitmap.width,
            height: bitmap.height,
            originalIndex: 0,
            duration: 200,
          };
          bitmap.close();
          return frame;
        })
      );
      if (!controller.signal.aborted)
        setFrames([
          result.slice(0, files.length / 2),
          result.slice(files.length / 2),
        ]);
    }
    void load().catch(() => {});
    return () => controller.abort();
  }, [gif]);
  if (!frames) return null;
  return (
    <section className="bg-card mx-auto mt-10 max-w-3xl rounded-xl border p-5">
      <h2 className="text-2xl font-medium">{t('exampleTitle')}</h2>
      <p className="text-muted-foreground mt-3 mb-5 text-sm leading-6">
        {t('exampleText')}
      </p>
      <BeforeAfter before={frames[0]} after={frames[1]} />
    </section>
  );
}
