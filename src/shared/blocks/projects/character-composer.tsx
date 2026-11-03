'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/shared/components/ui/button';
import { chooseAnimationBackground } from '@/shared/lib/animation-background';
import {
  clampCharacterComposition,
  DEFAULT_COMPOSITION,
  loadCompositionImage,
} from '@/shared/lib/character-composition';

export type CharacterComposerHandle = {
  exportComposition(): Promise<{
    file: File;
    backgroundColor?: string;
    backgroundKeySafe?: boolean;
  }>;
};

export const CharacterComposer = forwardRef<
  CharacterComposerHandle,
  {
    src: string;
    inputSrc?: string;
    disabled?: boolean;
    hint?: string;
    backgroundColor?: string;
  }
>(function CharacterComposer(
  { src, inputSrc, disabled, hint, backgroundColor },
  ref
) {
  const t = useTranslations('workspace.animationFlow');
  const [value, setValue] = useState(DEFAULT_COMPOSITION);
  const [aspect, setAspect] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [displaySrc, setDisplaySrc] = useState('');
  const character = useRef<HTMLCanvasElement | null>(null);
  const backgroundRef = useRef<
    { backgroundColor: string; backgroundKeySafe: boolean } | undefined
  >(undefined);
  const area = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; value: typeof value } | null>(
    null
  );
  const box = clampCharacterComposition(value, aspect);
  useEffect(() => {
    setValue(DEFAULT_COMPOSITION);
    setLoaded(false);
    setFailed(false);
    setDisplaySrc('');
    character.current = null;
    backgroundRef.current = undefined;
    let cancelled = false;
    let objectUrl = '';
    void loadCompositionImage(inputSrc || src)
      .then(async ({ canvas, background }) => {
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (value) =>
              value ? resolve(value) : reject(new Error('INVALID_IMAGE')),
            'image/png'
          )
        );
        if (cancelled) return;
        character.current = canvas;
        backgroundRef.current = background;
        objectUrl = URL.createObjectURL(blob);
        setDisplaySrc(objectUrl);
        setAspect(canvas.width / canvas.height);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, inputSrc]);
  const update = (next: typeof value) =>
    setValue(clampCharacterComposition(next, aspect));
  useImperativeHandle(
    ref,
    () => ({
      async exportComposition() {
        if (!loaded || failed || !character.current)
          throw new Error('INVALID_IMAGE');
        const image = character.current;
        const background = backgroundColor
          ? {
              ...chooseAnimationBackground(
                image
                  .getContext('2d')!
                  .getImageData(0, 0, image.width, image.height).data,
                backgroundColor
              ),
              // An opaque source still contains its original background: do not assume it is safe to key.
              ...(!backgroundRef.current ? { backgroundKeySafe: false } : {}),
            }
          : backgroundRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 768;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = background?.backgroundColor || '#808080';
        ctx.fillRect(0, 0, 768, 768);
        ctx.imageSmoothingEnabled = false;
        const bounds = clampCharacterComposition(
          value,
          image.width / image.height
        );
        ctx.drawImage(
          image,
          (bounds.x - bounds.width / 2) * 7.68,
          (bounds.y - bounds.height / 2) * 7.68,
          bounds.width * 7.68,
          bounds.height * 7.68
        );
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (result) =>
              result ? resolve(result) : reject(new Error('INVALID_IMAGE')),
            'image/png'
          )
        );
        return {
          file: new File([blob], 'animation-composition.png', {
            type: 'image/png',
          }),
          ...background,
        };
      },
    }),
    [loaded, failed, inputSrc, src, value, backgroundColor]
  );
  return (
    <div className="w-full min-w-0 space-y-2">
      <div
        ref={area}
        style={
          backgroundColor
            ? { backgroundColor, backgroundImage: 'none' }
            : undefined
        }
        className="bg-secondary relative aspect-square w-full touch-none rounded-xl border bg-[conic-gradient(var(--background)_25%,transparent_0_50%,var(--background)_0_75%,transparent_0)] bg-[size:16px_16px]"
        onPointerMove={(event) => {
          if (!drag.current || disabled) return;
          const rect = area.current!.getBoundingClientRect();
          update({
            ...drag.current.value,
            x:
              drag.current.value.x +
              ((event.clientX - drag.current.x) / rect.width) * 100,
            y:
              drag.current.value.y +
              ((event.clientY - drag.current.y) / rect.height) * 100,
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <div className="border-primary pointer-events-none absolute inset-[8%] border border-dashed" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displaySrc || undefined}
          alt={t('character')}
          draggable={false}
          tabIndex={disabled ? -1 : 0}
          role="img"
          aria-label={hint || t('dragHint')}
          onLoad={() => {
            setFailed(false);
          }}
          onError={() => setFailed(true)}
          className="focus-visible:ring-primary absolute cursor-grab touch-none object-contain outline-none select-none [image-rendering:pixelated] focus-visible:ring-2 active:cursor-grabbing"
          style={{
            left: `${box.x - box.width / 2}%`,
            top: `${box.y - box.height / 2}%`,
            width: `${box.width}%`,
            height: `${box.height}%`,
            visibility: loaded ? 'visible' : 'hidden',
          }}
          onPointerDown={(e) => {
            if (disabled || !loaded) return;
            e.preventDefault();
            e.currentTarget.focus();
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, value: box };
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            const shifts: Record<string, [number, number]> = {
              ArrowLeft: [-1, 0],
              ArrowRight: [1, 0],
              ArrowUp: [0, -1],
              ArrowDown: [0, 1],
            };
            const delta = shifts[e.key];
            if (delta) {
              e.preventDefault();
              update({ ...box, x: box.x + delta[0], y: box.y + delta[1] });
            }
          }}
        />
      </div>
      <div className="flex items-center justify-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled || !loaded || box.scale <= 10}
          aria-label={t('zoomOut')}
          onClick={() => update({ ...box, scale: box.scale - 10 })}
        >
          <Minus className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled || !loaded}
          aria-label={t('reset')}
          onClick={() => update(DEFAULT_COMPOSITION)}
        >
          <RotateCcw className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled || !loaded || box.scale >= 100}
          aria-label={t('zoomIn')}
          onClick={() => update({ ...box, scale: box.scale + 10 })}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <p
        className={
          failed
            ? 'text-destructive text-sm'
            : 'text-muted-foreground text-center text-sm'
        }
      >
        {failed ? t('imageError') : hint || t('dragHint')}
      </p>
    </div>
  );
});
