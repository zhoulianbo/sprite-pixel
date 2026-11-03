'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import { cn } from '@/shared/lib/utils';
import type { AdminAnimationPreviewData } from '@/shared/models/admin-asset';

type PreviewFrame = {
  url: string;
  durationMs: number | null;
  offsetX: number;
  offsetY: number;
  crop?: { x: number; y: number; width: number; height: number };
};

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function SourceVideo({
  url,
  label,
  loadingLabel,
  errorLabel,
  retryLabel,
  openLabel,
}: {
  url: string;
  label: string;
  loadingLabel: string;
  errorLabel: string;
  retryLabel: string;
  openLabel: string;
}) {
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  return (
    <div className="w-full space-y-3 text-center">
      {failed ? (
        <div className="space-y-3">
          <p role="alert" className="text-muted-foreground text-sm">
            {errorLabel}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setFailed(false);
              setLoading(true);
              setAttempt((value) => value + 1);
            }}
          >
            {retryLabel}
          </Button>
        </div>
      ) : (
        <>
          {loading && (
            <p role="status" className="text-muted-foreground text-sm">
              {loadingLabel}
            </p>
          )}
          <video
            key={attempt}
            aria-label={label}
            className="max-h-[55dvh] w-full rounded-md"
            controls
            loop
            muted
            playsInline
            preload="metadata"
            src={url}
            onLoadedMetadata={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
          />
        </>
      )}
      <Button asChild variant="outline" size="sm">
        <a href={url} target="_blank" rel="noopener noreferrer">
          {openLabel}
        </a>
      </Button>
    </div>
  );
}

function AnimationCanvas({
  frames,
  width,
  height,
  fps,
  label,
  className,
  onError,
}: {
  frames: PreviewFrame[];
  width: number;
  height: number;
  fps: number;
  label: string;
  className?: string;
  onError: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const images = useRef(new Map<string, Promise<HTMLImageElement>>());

  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useEffect(() => {
    if (!visible || frames.length < 2) return;
    const current = frames[index] || frames[0];
    const delay = current.durationMs || 1000 / Math.max(1, fps);
    const timer = window.setTimeout(
      () => setIndex((value) => (value + 1) % frames.length),
      delay
    );
    return () => window.clearTimeout(timer);
  }, [fps, frames, index, visible]);

  useEffect(() => {
    const frame = frames[index] || frames[0];
    const canvas = canvasRef.current;
    if (!frame || !canvas) return;
    let cancelled = false;

    let imagePromise = images.current.get(frame.url);
    if (!imagePromise) {
      imagePromise = loadImage(frame.url);
      images.current.set(frame.url, imagePromise);
    }
    imagePromise
      .then((image) => {
        if (cancelled) return;
        const context = canvas.getContext('2d');
        if (!context) return;
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, canvas.width, canvas.height);
        const crop = frame.crop || {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        };
        context.drawImage(
          image,
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
  }, [frames, height, index, onError, width]);

  return (
    <canvas
      ref={canvasRef}
      aria-label={label}
      className={cn(
        'max-h-full max-w-full [image-rendering:pixelated]',
        className
      )}
      role="img"
      style={{
        aspectRatio: `${Math.max(1, width)} / ${Math.max(1, height)}`,
      }}
    />
  );
}

export function AdminAnimationPreview({
  clipId,
  previewUrl,
  label,
  emptyLabel,
  zoomLabel,
  imageTabLabel,
  animationTabLabel,
  compareTabLabel,
  sourceVideoLabel,
  sourceVideoEmptyLabel,
  sourceVideoErrorLabel,
  sourceVideoLoadingLabel,
  openVideoLabel,
  zoomVideoLabel,
  loadingLabel,
  errorLabel,
  retryLabel,
}: {
  clipId: string;
  previewUrl: string | null;
  label: string;
  emptyLabel: string;
  zoomLabel: string;
  imageTabLabel: string;
  animationTabLabel: string;
  compareTabLabel: string;
  sourceVideoLabel: string;
  sourceVideoEmptyLabel: string;
  sourceVideoErrorLabel: string;
  sourceVideoLoadingLabel: string;
  openVideoLabel: string;
  zoomVideoLabel: string;
  loadingLabel: string;
  errorLabel: string;
  retryLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('image');
  const [preview, setPreview] = useState<AdminAnimationPreviewData | null>(
    null
  );
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const onFrameError = useCallback(() => setFailed(true), []);

  useEffect(() => {
    if (!open || !['animation', 'compare', 'video'].includes(tab) || preview)
      return;
    const controller = new AbortController();
    setFailed(false);
    async function loadPreview() {
      try {
        const response = await fetch(
          `/api/admin/animations/${encodeURIComponent(clipId)}/preview`,
          { signal: controller.signal, cache: 'no-store' }
        );
        if (!response.ok) throw new Error('Animation preview request failed');
        const result = await response.json();
        if (result.code !== 0 || !Array.isArray(result.data?.frames)) {
          throw new Error('Invalid animation preview');
        }
        if (!controller.signal.aborted) setPreview(result.data);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    }
    void loadPreview();
    return () => controller.abort();
  }, [attempt, clipId, open, preview, tab]);

  function changeOpen(value: boolean) {
    setOpen(value);
    if (!value) {
      setTab('image');
      setPreview(null);
      setFailed(false);
    }
  }

  const animationContent = failed ? (
    <div className="space-y-3 text-center">
      <p role="alert" className="text-muted-foreground text-sm">
        {errorLabel}
      </p>
      <Button
        variant="outline"
        onClick={() => {
          setFailed(false);
          setPreview(null);
          setAttempt((value) => value + 1);
        }}
      >
        {retryLabel}
      </Button>
    </div>
  ) : !preview ? (
    <p role="status" className="text-muted-foreground text-sm">
      {loadingLabel}
    </p>
  ) : !preview.frames.length ? (
    <p className="text-muted-foreground text-sm">{emptyLabel}</p>
  ) : open && ['animation', 'compare'].includes(tab) ? (
    <AnimationCanvas
      className="h-auto max-h-[65dvh] w-full object-contain"
      fps={preview.fps}
      frames={preview.frames}
      height={preview.frameHeight}
      label={label}
      onError={onFrameError}
      width={preview.frameWidth}
    />
  ) : null;

  const videoContent =
    preview?.sourceVideoUrl && open && ['compare', 'video'].includes(tab) ? (
      <SourceVideo
        key={preview.sourceVideoUrl}
        url={preview.sourceVideoUrl}
        label={sourceVideoLabel}
        loadingLabel={sourceVideoLoadingLabel}
        errorLabel={sourceVideoErrorLabel}
        retryLabel={retryLabel}
        openLabel={openVideoLabel}
      />
    ) : (
      <div className="space-y-3 text-center">
        <p className="text-muted-foreground text-sm">
          {failed && !preview
            ? errorLabel
            : !preview
              ? loadingLabel
              : sourceVideoEmptyLabel}
        </p>
        {failed && !preview && (
          <Button
            variant="outline"
            onClick={() => {
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          >
            {retryLabel}
          </Button>
        )}
      </div>
    );

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <div className="flex flex-col items-start gap-2">
        <DialogTrigger asChild>
          <button
            aria-label={zoomLabel}
            className="border-border bg-background focus-visible:ring-ring grid size-20 cursor-zoom-in place-items-center overflow-hidden rounded-lg border bg-[linear-gradient(45deg,rgba(255,255,255,.05)_25%,transparent_25%),linear-gradient(-45deg,rgba(255,255,255,.05)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(255,255,255,.05)_75%),linear-gradient(-45deg,transparent_75%,rgba(255,255,255,.05)_75%)] bg-[size:12px_12px] focus-visible:ring-2 focus-visible:outline-hidden"
            type="button"
          >
            {previewUrl && !imageFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={label}
                className="size-full object-contain [image-rendering:pixelated]"
                loading="lazy"
                onError={() => setImageFailed(true)}
                src={previewUrl}
              />
            ) : (
              <span className="text-muted-foreground text-sm">
                {emptyLabel}
              </span>
            )}
          </button>
        </DialogTrigger>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setTab('video');
            setOpen(true);
          }}
        >
          {sourceVideoLabel}
        </Button>
      </div>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-xl p-4 sm:max-w-4xl">
        <DialogTitle className="sr-only">{zoomLabel}</DialogTitle>
        <DialogDescription className="sr-only">{label}</DialogDescription>
        <Tabs value={tab} onValueChange={setTab} activationMode="manual">
          <TabsList
            aria-label={zoomLabel}
            className="mr-8 h-auto flex-wrap justify-start"
          >
            <TabsTrigger value="image">{imageTabLabel}</TabsTrigger>
            <TabsTrigger value="animation">{animationTabLabel}</TabsTrigger>
            <TabsTrigger value="compare">{compareTabLabel}</TabsTrigger>
            <TabsTrigger value="video">{sourceVideoLabel}</TabsTrigger>
          </TabsList>
          <TabsContent value="image">
            <div className="bg-secondary/45 flex min-h-64 items-center justify-center overflow-auto rounded-lg border p-4">
              {previewUrl && !imageFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={label}
                  className="max-h-[65dvh] w-full object-contain [image-rendering:pixelated]"
                  onError={() => setImageFailed(true)}
                  src={previewUrl}
                />
              ) : (
                <p className="text-muted-foreground text-sm">{emptyLabel}</p>
              )}
            </div>
          </TabsContent>
          <TabsContent value="animation">
            <div className="bg-secondary/45 flex min-h-64 items-center justify-center overflow-hidden rounded-lg border p-4">
              {animationContent}
            </div>
          </TabsContent>
          <TabsContent value="video">
            <div className="bg-secondary/45 flex min-h-64 items-center justify-center rounded-lg border p-4">
              {videoContent}
            </div>
          </TabsContent>
          <TabsContent value="compare">
            <div className="grid gap-4 md:grid-cols-2">
              <section className="min-w-0 space-y-2">
                <h3 className="text-sm font-medium">{sourceVideoLabel}</h3>
                <div className="bg-secondary/45 flex min-h-64 items-center justify-center rounded-lg border p-4">
                  {videoContent}
                </div>
                {preview?.sourceVideoUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTab('video')}
                  >
                    {zoomVideoLabel}
                  </Button>
                )}
              </section>
              <section className="min-w-0 space-y-2">
                <h3 className="text-sm font-medium">{animationTabLabel}</h3>
                <div className="bg-secondary/45 flex min-h-64 items-center justify-center overflow-hidden rounded-lg border p-4">
                  {animationContent}
                </div>
              </section>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
