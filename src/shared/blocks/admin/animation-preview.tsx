'use client';

import { useEffect, useRef, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { cn } from '@/shared/lib/utils';

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

function AnimationCanvas({
  frames,
  width,
  height,
  fps,
  label,
  className,
}: {
  frames: PreviewFrame[];
  width: number;
  height: number;
  fps: number;
  label: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (frames.length < 2) return;
    const current = frames[index] || frames[0];
    const delay = current.durationMs || 1000 / Math.max(1, fps);
    const timer = window.setTimeout(
      () => setIndex((value) => (value + 1) % frames.length),
      delay
    );
    return () => window.clearTimeout(timer);
  }, [fps, frames, index]);

  useEffect(() => {
    const frame = frames[index] || frames[0];
    const canvas = canvasRef.current;
    if (!frame || !canvas) return;
    let cancelled = false;

    loadImage(frame.url)
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
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [frames, height, index, width]);

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
  frames,
  width,
  height,
  fps,
  label,
  emptyLabel,
  zoomLabel,
}: {
  frames: PreviewFrame[];
  width: number;
  height: number;
  fps: number;
  label: string;
  emptyLabel: string;
  zoomLabel: string;
}) {
  if (!frames.length) {
    return <span className="text-muted-foreground text-sm">{emptyLabel}</span>;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          aria-label={zoomLabel}
          className="border-border bg-background focus-visible:ring-ring grid size-20 cursor-zoom-in place-items-center overflow-hidden rounded-lg border bg-[linear-gradient(45deg,rgba(255,255,255,.05)_25%,transparent_25%),linear-gradient(-45deg,rgba(255,255,255,.05)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(255,255,255,.05)_75%),linear-gradient(-45deg,transparent_75%,rgba(255,255,255,.05)_75%)] bg-[size:12px_12px] focus-visible:ring-2 focus-visible:outline-hidden"
          type="button"
        >
          <AnimationCanvas
            fps={fps}
            frames={frames}
            height={height}
            label={label}
            width={width}
          />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl rounded-xl p-4">
        <DialogTitle className="sr-only">{zoomLabel}</DialogTitle>
        <DialogDescription className="sr-only">{label}</DialogDescription>
        <div className="bg-secondary/45 flex max-h-[80vh] min-h-64 items-center justify-center overflow-hidden rounded-lg border p-4">
          <AnimationCanvas
            className="h-auto max-h-[74vh] w-full object-contain"
            fps={fps}
            frames={frames}
            height={height}
            label={label}
            width={width}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
