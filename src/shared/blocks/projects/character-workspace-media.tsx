'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Check,
  Film,
  ImagePlus,
  LoaderCircle,
  Sparkles,
  Star,
} from 'lucide-react';

import { DIRECTION_PAD_ORDER } from '@/config/generation/sprite';
import { AssetPreviewActions } from '@/shared/blocks/common/asset-preview-actions';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { DropdownMenuItem } from '@/shared/components/ui/dropdown-menu';
import {
  isMirroredAsset,
  type CharacterAnimationFrame,
  type CharacterWorkspaceAnimation,
  type CharacterWorkspaceFile,
} from '@/shared/lib/character-workspace';
import { cn } from '@/shared/lib/utils';

export function CharacterAssetCard({
  file,
  alt,
  label,
  selected,
  active,
  labels,
  onSelect,
  onSetActive,
  onAnimate,
  onDirections,
  onRename,
  onDelete,
  className,
}: {
  file: CharacterWorkspaceFile;
  alt: string;
  label: string;
  selected: boolean;
  active?: boolean;
  labels: {
    zoom: string;
    download: string;
    more: string;
    selected: string;
    active: string;
    setActive: string;
    animate: string;
    directions: string;
    rename?: string;
    delete?: string;
  };
  onSelect: () => void;
  onSetActive?: () => void;
  onAnimate?: () => void;
  onDirections?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'group bg-card relative overflow-hidden rounded-lg border transition-colors',
        selected
          ? 'border-primary ring-primary/20 ring-2'
          : 'hover:border-primary/40',
        className
      )}
    >
      <button
        type="button"
        className="block w-full text-left"
        onClick={onSelect}
        aria-pressed={selected}
      >
        <div className="bg-secondary/45 relative aspect-square overflow-hidden p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={file.url}
            alt={alt}
            className="size-full object-contain [image-rendering:pixelated]"
          />
          {selected ? (
            <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-emerald-500 px-1.5 py-1 text-[10px] font-medium text-white">
              <Check className="size-3" />
              {labels.selected}
            </span>
          ) : null}
          {active ? (
            <span className="bg-primary text-primary-foreground absolute top-2 left-2 flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium">
              <Star className="size-3" />
              {labels.active}
            </span>
          ) : null}
        </div>
      </button>
      <div className="space-y-1.5 border-t px-3 py-2">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left"
          onClick={onSelect}
        >
          <p className="truncate text-sm font-medium">{label}</p>
          {file.createdAt ? (
            <time className="text-muted-foreground shrink-0 font-mono text-[10px]">
              {new Date(file.createdAt).toLocaleDateString()}
            </time>
          ) : null}
        </button>
        {onDirections || onAnimate ? (
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-stretch">
            {onDirections ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 min-w-0 flex-1 px-2 text-[11px]"
                onClick={onDirections}
              >
                <Sparkles className="size-3.5 shrink-0" />
                <span className="truncate">{labels.directions}</span>
              </Button>
            ) : null}
            {onAnimate ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 min-w-0 flex-1 px-2 text-[11px]"
                onClick={onAnimate}
              >
                <Film className="size-3.5 shrink-0" />
                <span className="truncate">{labels.animate}</span>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <AssetPreviewActions
        url={file.url}
        fileId={file.id}
        alt={alt}
        zoomLabel={labels.zoom}
        downloadLabel={labels.download}
        menuLabel={labels.more}
        renameLabel={labels.rename}
        onRename={onRename}
        deleteLabel={labels.delete}
        onDelete={onDelete}
        setActiveLabel={labels.setActive}
        onSetActive={active ? undefined : onSetActive}
      />
    </article>
  );
}

const directionPosition: Record<string, string> = {
  north_west: 'col-start-1 row-start-1',
  north: 'col-start-2 row-start-1',
  north_east: 'col-start-3 row-start-1',
  west: 'col-start-1 row-start-2',
  east: 'col-start-3 row-start-2',
  south_west: 'col-start-1 row-start-3',
  south: 'col-start-2 row-start-3',
  south_east: 'col-start-3 row-start-3',
};

export function DirectionGrid({
  entries,
  centerFile,
  selectedId,
  labels,
  directionLabel,
  onSelect,
  onAnimate,
}: {
  entries: Array<{ direction: string; file?: CharacterWorkspaceFile }>;
  centerFile?: CharacterWorkspaceFile;
  selectedId: string;
  labels: {
    zoom: string;
    download: string;
    more: string;
    selected: string;
    animate: string;
    missing: string;
    source: string;
  };
  directionLabel: (direction: string) => string;
  onSelect: (file: CharacterWorkspaceFile) => void;
  onAnimate: (file: CharacterWorkspaceFile, direction: string) => void;
}) {
  return (
    <div className="grid aspect-square w-full grid-cols-3 grid-rows-3 gap-2">
      {entries.map(({ direction, file }) => (
        <div
          key={direction}
          className={cn(
            directionPosition[direction],
            'group bg-secondary/35 relative min-h-0 overflow-hidden rounded-lg border'
          )}
        >
          {file ? (
            <>
              <button
                type="button"
                className="size-full p-2"
                onClick={() => onSelect(file)}
                aria-pressed={selectedId === file.id}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file.url}
                  alt={directionLabel(direction)}
                  className={cn(
                    'size-full object-contain [image-rendering:pixelated]',
                    isMirroredAsset(file.metadataJson) && 'scale-x-[-1]'
                  )}
                />
                {selectedId === file.id ? (
                  <span className="absolute bottom-1 left-1 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check className="size-3" />
                    <span className="sr-only">{labels.selected}</span>
                  </span>
                ) : null}
              </button>
              <AssetPreviewActions
                url={file.url}
                fileId={file.id}
                alt={directionLabel(direction)}
                zoomLabel={labels.zoom}
                downloadLabel={labels.download}
                menuLabel={labels.more}
                className="top-1 right-1 origin-top-right scale-90"
              >
                <DropdownMenuItem onSelect={() => onAnimate(file, direction)}>
                  <Film className="size-4" />
                  {labels.animate}
                </DropdownMenuItem>
              </AssetPreviewActions>
              <span className="bg-background/75 pointer-events-none absolute right-1 bottom-1 rounded px-1.5 py-0.5 text-[9px]">
                {directionLabel(direction)}
              </span>
            </>
          ) : (
            <div className="text-muted-foreground flex size-full items-center justify-center p-2 text-center text-[10px]">
              {labels.missing}
            </div>
          )}
        </div>
      ))}
      <div className="bg-secondary/35 relative col-start-2 row-start-2 flex min-h-0 items-center justify-center overflow-hidden rounded-lg border">
        {centerFile ? (
          <button
            type="button"
            className="size-full p-2"
            onClick={() => onSelect(centerFile)}
            aria-pressed={selectedId === centerFile.id}
            aria-label={labels.source}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={centerFile.url}
              alt={labels.source}
              className="size-full object-contain [image-rendering:pixelated]"
            />
            {selectedId === centerFile.id ? (
              <span className="absolute bottom-1 left-1 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="size-3" />
                <span className="sr-only">{labels.selected}</span>
              </span>
            ) : null}
            <span className="bg-background/75 pointer-events-none absolute right-1 bottom-1 rounded px-1.5 py-0.5 text-[9px]">
              {labels.source}
            </span>
          </button>
        ) : (
          <span className="text-muted-foreground px-2 text-center text-[10px]">
            {labels.source}
          </span>
        )}
      </div>
    </div>
  );
}

const directionArrows = {
  north_west: ArrowUpLeft,
  north: ArrowUp,
  north_east: ArrowUpRight,
  west: ArrowLeft,
  east: ArrowRight,
  south_west: ArrowDownLeft,
  south: ArrowDown,
  south_east: ArrowDownRight,
} as const;

export function DirectionPreviewGrid({
  entries,
  centerSrc,
  centerAlt,
  processing,
  processingLabel,
}: {
  entries: Array<{
    direction: string;
    url?: string;
    mirrored?: boolean;
  }>;
  centerSrc?: string;
  centerAlt?: string;
  processing?: boolean;
  processingLabel?: string;
}) {
  const byDirection = new Map(entries.map((entry) => [entry.direction, entry]));
  return (
    <div className="relative grid aspect-square w-full grid-cols-3 grid-rows-3 gap-1.5">
      {DIRECTION_PAD_ORDER.map((direction) => {
        if (!direction) {
          return (
            <div
              key="center"
              className="bg-background/55 relative flex items-center justify-center overflow-hidden rounded-lg border"
            >
              {centerSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={centerSrc}
                  alt={centerAlt || ''}
                  className="size-full object-contain p-1 [image-rendering:pixelated]"
                />
              ) : null}
            </div>
          );
        }
        const entry = byDirection.get(direction);
        const Icon = directionArrows[direction];
        return (
          <div
            key={direction}
            className={cn(
              'bg-secondary/40 relative min-h-0 overflow-hidden rounded-lg border',
              entry?.url && 'border-primary/35 bg-secondary/70'
            )}
          >
            {entry?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entry.url}
                alt=""
                className={cn(
                  'size-full object-contain p-1 [image-rendering:pixelated]',
                  entry.mirrored && 'scale-x-[-1]'
                )}
              />
            ) : (
              <div className="text-muted-foreground flex size-full items-center justify-center">
                <Icon className="size-4" aria-hidden="true" />
              </div>
            )}
          </div>
        );
      })}
      {processing ? (
        <div className="bg-background/75 absolute inset-0 flex flex-col items-center justify-center gap-2">
          <LoaderCircle className="text-primary size-7 animate-spin" />
          <span className="text-muted-foreground text-xs">
            {processingLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function DirectionSelectPad({
  selected,
  centerSrc,
  centerAlt,
  chooseLabel,
  directionLabel,
  onToggle,
  onCenterClick,
  className,
}: {
  selected: string[];
  centerSrc?: string;
  centerAlt: string;
  chooseLabel: string;
  directionLabel: (direction: string) => string;
  onToggle: (direction: string) => void;
  onCenterClick: () => void;
  className?: string;
}) {
  const cellClass = 'size-12 shrink-0';

  return (
    <div
      className={cn(
        'mx-auto grid w-fit grid-cols-3 grid-rows-3 gap-1',
        className
      )}
    >
      {DIRECTION_PAD_ORDER.map((direction) => {
        if (!direction) {
          return (
            <button
              key="center"
              type="button"
              onClick={onCenterClick}
              className={cn(
                cellClass,
                'col-start-2 row-start-2 flex items-center justify-center overflow-hidden rounded-md border',
                centerSrc
                  ? 'border-primary/45 bg-background/80'
                  : 'border-primary/40 bg-background/70 ring-primary/20 ring-2'
              )}
              aria-label={chooseLabel}
            >
              {centerSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={centerSrc}
                  alt={centerAlt}
                  className="size-full object-contain p-0.5 [image-rendering:pixelated]"
                />
              ) : (
                <ImagePlus className="text-muted-foreground size-5" />
              )}
            </button>
          );
        }
        const Icon = directionArrows[direction];
        const active = selected.includes(direction);
        return (
          <button
            key={direction}
            type="button"
            onClick={() => onToggle(direction)}
            aria-pressed={active}
            aria-label={directionLabel(direction)}
            className={cn(
              cellClass,
              'flex items-center justify-center rounded-md border transition-colors',
              directionPosition[direction],
              active
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-primary'
            )}
          >
            <Icon className="size-4" strokeWidth={2.25} />
          </button>
        );
      })}
    </div>
  );
}

async function loadImage(url: string) {
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
  playing,
}: {
  frames: CharacterAnimationFrame[];
  width: number;
  height: number;
  fps: number;
  playing: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!playing || frames.length < 2) {
      setIndex(0);
      return;
    }
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % frames.length),
      1000 / Math.max(1, fps)
    );
    return () => window.clearInterval(timer);
  }, [fps, frames.length, playing]);

  useEffect(() => {
    const frame = frames[index] || frames[0];
    const canvas = canvasRef.current;
    if (!frame || !canvas) return;
    let cancelled = false;
    loadImage(frame.file.url).then((image) => {
      if (cancelled) return;
      const context = canvas.getContext('2d');
      if (!context) return;
      canvas.width = width;
      canvas.height = height;
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, width, height);
      const crop = frame.metadata.crop || {
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
    });
    return () => {
      cancelled = true;
    };
  }, [frames, height, index, width]);

  return (
    <canvas
      ref={canvasRef}
      className="size-full object-contain [image-rendering:pixelated]"
    />
  );
}

export function AnimationCard({
  animation,
  directionLabel,
  labels,
  onOpen,
  className,
}: {
  animation: CharacterWorkspaceAnimation;
  directionLabel: (direction: string) => string;
  labels: {
    frames: string;
    open: string;
    zoom: string;
    download: string;
    more: string;
  };
  onOpen: () => void;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const { version, frames } = animation;
  const sheetUrl = frames[0]?.file.url;
  return (
    <article
      onMouseEnter={() => setPlaying(true)}
      onMouseLeave={() => setPlaying(false)}
      className={cn(
        'group bg-card hover:border-primary/45 relative overflow-hidden rounded-lg border text-left transition-colors',
        className
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        onFocus={() => setPlaying(true)}
        onBlur={() => setPlaying(false)}
        disabled={!version}
        className="focus-visible:ring-ring block w-full text-left focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
        aria-label={labels.open}
      >
        <div className="bg-secondary/45 aspect-square p-4">
          {version && frames.length ? (
            <AnimationCanvas
              frames={frames}
              width={version.frameWidth}
              height={version.frameHeight}
              fps={version.fps}
              playing={playing}
            />
          ) : (
            <div className="text-muted-foreground flex size-full items-center justify-center">
              <Film className="size-6" />
            </div>
          )}
        </div>
        <div className="border-t px-3 py-2">
          <p className="truncate text-sm font-medium">
            {animation.set.name} · {directionLabel(animation.clip.direction)}
          </p>
          <p className="text-muted-foreground mt-0.5 font-mono text-[10px]">
            {version?.frameCount || 0} {labels.frames} · {version?.fps || 0} FPS
          </p>
        </div>
      </button>
      {sheetUrl ? (
        <AssetPreviewActions
          url={sheetUrl}
          fileId={frames[0]?.file.id}
          alt={`${animation.set.name} · ${directionLabel(animation.clip.direction)}`}
          zoomLabel={labels.zoom}
          downloadLabel={labels.download}
          menuLabel={labels.more}
        />
      ) : null}
    </article>
  );
}

export function ReferenceImagePicker({
  open,
  onOpenChange,
  files,
  selectedId,
  title,
  description,
  selectLabel,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: CharacterWorkspaceFile[];
  selectedId: string;
  title: string;
  description: string;
  selectLabel: string;
  onSelect: (file: CharacterWorkspaceFile) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
          {files.map((file) => (
            <button
              type="button"
              key={file.id}
              onClick={() => {
                onSelect(file);
                onOpenChange(false);
              }}
              className={cn(
                'bg-secondary/45 relative aspect-square overflow-hidden rounded-lg border p-2',
                selectedId === file.id &&
                  'border-primary ring-primary/20 ring-2'
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={file.url}
                alt={selectLabel}
                className="size-full object-contain [image-rendering:pixelated]"
              />
              {selectedId === file.id ? (
                <Check className="text-primary absolute bottom-2 left-2 size-4" />
              ) : null}
            </button>
          ))}
          {!files.length ? (
            <div className="text-muted-foreground col-span-full flex min-h-48 flex-col items-center justify-center gap-3 text-sm">
              <ImagePlus className="size-7" />
              {description}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
