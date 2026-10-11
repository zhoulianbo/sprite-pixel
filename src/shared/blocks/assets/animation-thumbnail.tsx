'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Film, LoaderCircle, Pause, Play, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import type { CharacterAnimationFrame } from '@/shared/lib/character-workspace';
import { cn } from '@/shared/lib/utils';

type AnimationPreview = {
  version: { fps: number; frameWidth: number; frameHeight: number };
  frames: CharacterAnimationFrame[];
};

function AnimationCanvas({
  preview,
  label,
  onError,
}: {
  preview: AnimationPreview;
  label: string;
  onError: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const images = useRef(new Map<string, Promise<HTMLImageElement>>());
  const [index, setIndex] = useState(0);
  const { frames, version } = preview;

  useEffect(() => {
    if (frames.length < 2) return;
    const delay = frames[index]?.durationMs || 1000 / Math.max(1, version.fps);
    const timer = window.setTimeout(
      () => setIndex((value) => (value + 1) % frames.length),
      delay
    );
    return () => window.clearTimeout(timer);
  }, [frames, index, version.fps]);

  useEffect(() => {
    const frame = frames[index] || frames[0];
    const canvas = canvasRef.current;
    if (!frame || !canvas) return;
    let cancelled = false;
    let image = images.current.get(frame.file.url);
    if (!image) {
      image = new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = reject;
        element.src = frame.file.url;
      });
      images.current.set(frame.file.url, image);
    }
    image
      .then((element) => {
        if (cancelled) return;
        const context = canvas.getContext('2d');
        if (!context) return;
        canvas.width = Math.max(1, version.frameWidth);
        canvas.height = Math.max(1, version.frameHeight);
        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, canvas.width, canvas.height);
        const crop = frame.metadata.crop || {
          x: 0,
          y: 0,
          width: element.width,
          height: element.height,
        };
        context.drawImage(
          element,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          frame.offsetX,
          frame.offsetY,
          crop.width,
          crop.height
        );
      })
      .catch(() => {
        if (!cancelled) onError();
      });
    return () => {
      cancelled = true;
    };
  }, [frames, index, onError, version.frameHeight, version.frameWidth]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      className="size-full object-contain [image-rendering:pixelated]"
    />
  );
}

export function AnimationThumbnail({
  versionId,
  imageUrl,
  label,
  href,
  onOpen,
}: {
  versionId?: string | null;
  imageUrl?: string | null;
  label: string;
  href?: string;
  onOpen?: () => void;
}) {
  const t = useTranslations('workspace.animationPreview');
  const container = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [preview, setPreview] = useState<AnimationPreview | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [visible, setVisible] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);
  const onFrameError = useCallback(() => setFailed(true), []);

  useEffect(() => {
    let intersecting = true;
    const update = () => setVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      update();
    });
    if (container.current) observer.observe(container.current);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  useEffect(() => {
    if (!playing || !versionId || preview) return;
    const controller = new AbortController();
    setFailed(false);
    async function load() {
      try {
        const response = await fetch(
          `/api/animations/versions/${encodeURIComponent(versionId!)}/preview`,
          { signal: controller.signal, cache: 'no-store' }
        );
        if (!response.ok) throw new Error('Animation preview failed');
        const result = await response.json();
        if (
          result.code !== 0 ||
          !result.data?.version ||
          !Array.isArray(result.data.frames)
        ) {
          throw new Error('Invalid animation preview');
        }
        if (!controller.signal.aborted) setPreview(result.data);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt, playing, preview, versionId]);

  const image =
    playing && visible && preview?.frames.length && !failed ? (
      <AnimationCanvas preview={preview} label={label} onError={onFrameError} />
    ) : imageUrl && !imageFailed ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={label}
        loading="lazy"
        onError={() => setImageFailed(true)}
        className="size-full object-contain [image-rendering:pixelated]"
      />
    ) : (
      <div className="text-muted-foreground flex size-full items-center justify-center">
        <Film className="size-6" />
      </div>
    );
  const status = failed
    ? t('error')
    : playing && !preview
      ? t('loading')
      : playing && !preview?.frames.length
        ? t('empty')
        : null;
  const actionLabel = failed ? t('retry') : playing ? t('pause') : t('play');
  const Icon = failed
    ? RotateCcw
    : playing && !preview
      ? LoaderCircle
      : playing
        ? Pause
        : Play;

  return (
    <div ref={container} className="group relative size-full">
      {href ? (
        <Link
          href={href}
          prefetch={false}
          aria-label={label}
          className="focus-visible:ring-ring block size-full p-4 focus-visible:ring-2 focus-visible:outline-none"
        >
          {image}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          aria-label={label}
          disabled={!onOpen}
          className="focus-visible:ring-ring block size-full p-4 focus-visible:ring-2 focus-visible:outline-none"
        >
          {image}
        </button>
      )}
      {versionId ? (
        <Button
          type="button"
          size="icon-sm"
          variant="secondary"
          aria-label={actionLabel}
          title={actionLabel}
          aria-pressed={playing}
          className={cn(
            'bg-background/85 absolute top-2 right-2 z-10 opacity-0 backdrop-blur-sm transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100 [@media(hover:none)]:opacity-100',
            playing && 'opacity-100'
          )}
          onClick={() => {
            if (failed) {
              setFailed(false);
              setPreview(null);
              setAttempt((value) => value + 1);
              setPlaying(true);
            } else setPlaying((value) => !value);
          }}
        >
          <Icon
            className={cn(
              'size-3.5',
              playing && !preview && !failed && 'animate-spin'
            )}
          />
        </Button>
      ) : null}
      {status ? (
        <p
          role={failed ? 'alert' : 'status'}
          className="bg-background/90 pointer-events-none absolute inset-x-2 bottom-2 rounded-md p-2 text-center text-sm"
        >
          {status}
        </p>
      ) : null}
    </div>
  );
}
