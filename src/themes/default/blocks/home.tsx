'use client';

import { FormEvent, useEffect, useRef, useState, type ReactNode } from 'react';
import NextImage from 'next/image';
import {
  IconAlertCircle,
  IconArrowRight,
  IconArrowsMaximize,
  IconBox,
  IconBrandGithub,
  IconCheck,
  IconDeviceGamepad2,
  IconDownload,
  IconFlask,
  IconFolder,
  IconLoader2,
  IconMovie,
  IconPhotoAi,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconSparkles,
  IconSword,
  IconUpload,
  IconWand,
  IconX,
} from '@tabler/icons-react';
import { useLocale, useTranslations } from 'next-intl';

import { generationDefaults, mapGenerationOptions } from '@/config/generation';
import { getGenerationCredits } from '@/config/generation/model-routes';
import { defaultLocale } from '@/config/locale';
import { CreditCostMark } from '@/shared/blocks/common/credit-cost';
import { ProjectAssetPicker } from '@/shared/blocks/common/project-asset-picker';
import type { ProjectSummary } from '@/shared/blocks/projects/project-create-dialog';
import {
  prefetchProjectList,
  ProjectSelector,
} from '@/shared/blocks/projects/project-selector';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useAppContext } from '@/shared/contexts/app';
import {
  readApiPayload,
  useProductApiFeedback,
} from '@/shared/lib/product-api-error';
import {
  isEffectivelyTransparent,
  resolveSpriteSheetSlice,
} from '@/shared/lib/sprite-tools/core';
import { uploadProjectReferenceFile } from '@/shared/lib/upload-project-file';
import { cn } from '@/shared/lib/utils';
import type { Section } from '@/shared/types/blocks/landing';
import type { Pricing as PricingType } from '@/shared/types/blocks/pricing';

import { Pricing } from './pricing';

const shellClass =
  'mx-auto w-[min(1216px,calc(100%-40px))] max-[760px]:w-[min(calc(100%-28px),620px)]';
const sectionClass =
  'border-border scroll-mt-24 border-b py-[136px] max-[760px]:py-[88px]';
const headingFont =
  '[font-family:var(--font-heading),var(--font-sans)] tracking-[-0.055em] font-medium';
const monoLabel = 'font-mono text-[11px] font-bold tracking-[0.12em] uppercase';
const ctaClass =
  'bg-primary text-primary-foreground hover:bg-primary/90 inline-flex min-h-[42px] items-center justify-center gap-2.5 rounded-lg px-4 font-mono text-sm font-extrabold tracking-[0.04em] uppercase [&_svg]:size-4';

const TYPING_MS = 36;
const heroFieldLabelClass =
  'text-foreground/85 mb-2 block text-xs font-semibold tracking-[0.02em]';

function pickInspirationIndex(current: number, length: number) {
  if (length <= 1) return 0;
  let next = current;
  while (next === current) {
    next = Math.floor(Math.random() * length);
  }
  return next;
}

type HeroSelectOption = {
  value: string;
  label: string;
};

type CapabilityItem = {
  title: string;
  description: string;
};

type FeatureItem = {
  title: string;
  description: string;
  bullets: string[];
  image: string;
  alt: string;
};

type ToolItem = {
  title: string;
  description: string;
  badge: string;
  cta: string;
  href: string;
};

function HeroOptionSelect({
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

type MotionCharacterRef =
  | { origin: 'vault'; itemId: string; fileId: string; previewUrl: string }
  | { origin: 'upload'; file: File };

function vaultRefFromCharacterGeneration(
  generation: any
): Extract<MotionCharacterRef, { origin: 'vault' }> | null {
  const itemId = generation?.itemId;
  const file = generation?.items?.find(
    (item: any) => item.status === 'success' && item.file?.id && item.file?.url
  )?.file;
  if (!itemId || !file?.id || !file?.url) return null;
  return {
    origin: 'vault',
    itemId,
    fileId: file.id,
    previewUrl: file.url,
  };
}

function HeroUpload({
  id,
  label,
  file,
  previewSrc,
  onFileChange,
  removeLabel,
  required = false,
  onPickExisting,
  uploadActionLabel,
  existingActionLabel,
}: {
  id: string;
  label: string;
  file: File | null;
  previewSrc?: string;
  onFileChange: (file: File | null) => void;
  removeLabel: string;
  required?: boolean;
  onPickExisting?: () => void;
  uploadActionLabel?: string;
  existingActionLabel?: string;
}) {
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const displayUrl = previewSrc || previewUrl;
  const missingRequiredFile = required && !file && !previewSrc;

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const emptyButtonClass = cn(
    'text-muted-foreground hover:border-primary/70 hover:bg-primary/5 hover:text-primary focus-within:border-primary/50 flex size-[72px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-black/20 px-1 text-center transition-colors [&_svg]:size-5 [&_svg]:stroke-[1.5]',
    missingRequiredFile
      ? 'border-destructive/80 text-destructive bg-destructive/5 hover:border-destructive hover:bg-destructive/10 hover:text-destructive'
      : 'border-border'
  );

  return (
    <span className="relative size-[72px] shrink-0">
      {displayUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={file?.name || label}
            className="size-[72px] rounded-lg border border-white/16 object-cover"
            src={displayUrl}
          />
          <button
            aria-label={removeLabel}
            className="bg-background/90 text-foreground hover:bg-destructive hover:text-destructive-foreground absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border border-white/20 shadow-sm"
            onClick={() => onFileChange(null)}
            type="button"
          >
            <IconX aria-hidden="true" className="size-3.5" />
          </button>
        </>
      ) : onPickExisting ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-invalid={missingRequiredFile || undefined}
                aria-required={required}
                className={emptyButtonClass}
                title={label}
                type="button"
              >
                <IconPlus aria-hidden="true" />
                <span className="max-w-full truncate text-[10px] leading-tight font-medium">
                  {label}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" className="min-w-36">
              <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                <IconUpload className="size-4" />
                {uploadActionLabel}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onPickExisting()}>
                <IconFolder className="size-4" />
                {existingActionLabel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            accept="image/*"
            className="sr-only"
            id={id}
            ref={fileInputRef}
            onChange={(event) => {
              onFileChange(event.target.files?.[0] || null);
              event.target.value = '';
            }}
            aria-required={required}
            type="file"
          />
        </>
      ) : (
        <>
          <label
            aria-invalid={missingRequiredFile || undefined}
            className={emptyButtonClass}
            htmlFor={id}
            title={label}
          >
            <IconPlus aria-hidden="true" />
            <span className="max-w-full truncate text-[10px] leading-tight font-medium">
              {label}
            </span>
          </label>
          <input
            accept="image/*"
            className="sr-only"
            id={id}
            onChange={(event) => {
              onFileChange(event.target.files?.[0] || null);
              event.target.value = '';
            }}
            aria-required={required}
            type="file"
          />
        </>
      )}
    </span>
  );
}

function SpriteSheetPlayback({
  url,
  alt,
  columns,
  rows,
  frameCount,
  frameSize,
  fps = 12,
}: {
  url: string;
  alt: string;
  columns: number;
  rows: number;
  frameCount: number;
  frameSize: number;
  fps?: number;
}) {
  const t = useTranslations('pages.index.messages');
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [playbackFps, setPlaybackFps] = useState(
    Math.min(24, Math.max(1, Math.round(fps)))
  );
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });
  const [playbackFrames, setPlaybackFrames] = useState<number[]>(() =>
    Array.from({ length: frameCount }, (_, index) => index)
  );
  const [visible, setVisible] = useState(true);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const targetSize =
    Number.isFinite(frameSize) && frameSize > 0 ? frameSize : 64;

  useEffect(() => {
    setPlaybackFps(Math.min(24, Math.max(1, Math.round(fps))));
  }, [fps]);

  useEffect(() => {
    setFrame(0);
    setPlaybackFrames(Array.from({ length: frameCount }, (_, index) => index));
    imageRef.current = null;
    setSourceSize({ width: 0, height: 0 });
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      imageRef.current = image;
      setSourceSize({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      imageRef.current = null;
      setPlaying(false);
      setSourceSize({ width: 0, height: 0 });
    };
    image.src = url;
    return () => {
      image.onload = null;
      image.onerror = null;
      if (imageRef.current === image) imageRef.current = null;
    };
  }, [frameCount, url]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image || !sourceSize.width || !sourceSize.height) return;
    const slice = resolveSpriteSheetSlice(sourceSize, {
      columns,
      rows,
      frameCount,
      preferredFrameSize: targetSize,
    });
    const canvas = document.createElement('canvas');
    canvas.width = sourceSize.width;
    canvas.height = sourceSize.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    try {
      context.drawImage(image, 0, 0);
      const nonEmptyFrames = slice.rects.flatMap((rect, index) =>
        isEffectivelyTransparent(
          context.getImageData(rect.x, rect.y, rect.width, rect.height).data
        )
          ? []
          : [index]
      );
      if (nonEmptyFrames.length) {
        setPlaybackFrames(nonEmptyFrames);
        setFrame(0);
      }
    } catch {
      // Cross-origin images without readable pixels keep metadata frame order.
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  }, [columns, frameCount, rows, sourceSize, targetSize]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    let intersecting = true;
    const update = () => setVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      update();
    });
    observer.observe(node);
    document.addEventListener('visibilitychange', update);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPlaying(false);
    }
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  useEffect(() => {
    if (!playing || !visible || playbackFrames.length < 2) return;
    const timer = window.setInterval(
      () => {
        setFrame((current) => (current + 1) % playbackFrames.length);
      },
      Math.max(40, Math.round(1000 / playbackFps))
    );
    return () => window.clearInterval(timer);
  }, [playbackFps, playbackFrames.length, playing, visible]);

  useEffect(() => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas || !sourceSize.width || !sourceSize.height) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const slice = resolveSpriteSheetSlice(sourceSize, {
      columns,
      rows,
      frameCount,
      preferredFrameSize: targetSize,
    });
    const sourceFrame = playbackFrames[frame % playbackFrames.length] ?? 0;
    const rect = slice.rects[sourceFrame];
    if (!rect) return;
    context.clearRect(0, 0, targetSize, targetSize);
    context.imageSmoothingEnabled = false;
    context.drawImage(
      image,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      0,
      0,
      targetSize,
      targetSize
    );
  }, [
    columns,
    frame,
    frameCount,
    playbackFrames,
    rows,
    sourceSize,
    targetSize,
  ]);

  return (
    <div ref={rootRef} className="flex min-h-0 w-full flex-1 flex-col gap-2">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          aria-label={alt}
          height={targetSize}
          width={targetSize}
          className="size-full object-contain [image-rendering:pixelated]"
        />
      </div>
      <div className="border-border bg-background/85 flex items-center gap-2 rounded-lg border p-1.5 text-left">
        <button
          type="button"
          aria-label={t(playing ? 'pauseAnimation' : 'playAnimation')}
          className="hover:bg-primary/10 hover:text-primary flex size-8 shrink-0 items-center justify-center rounded-md"
          onClick={() => setPlaying((current) => !current)}
        >
          {playing ? (
            <IconPlayerPause aria-hidden="true" className="size-4" />
          ) : (
            <IconPlayerPlay aria-hidden="true" className="size-4" />
          )}
        </button>
        <span className="text-foreground shrink-0 text-xs font-medium">
          {t('playbackSpeed')}
        </span>
        <input
          aria-label={t('playbackSpeed')}
          className="accent-primary h-4 min-w-10 flex-1 cursor-pointer"
          type="range"
          min={1}
          max={24}
          step={1}
          value={playbackFps}
          onChange={(event) => setPlaybackFps(Number(event.target.value))}
        />
        <span className="bg-secondary text-foreground shrink-0 rounded-md px-2 py-1 font-mono text-[10px] tabular-nums">
          {t('framesPerSecond', { count: playbackFps })}
        </span>
        <span className="bg-secondary text-foreground shrink-0 rounded-md px-2 py-1 font-mono text-[10px] tabular-nums">
          {t('frameTotal', { count: playbackFrames.length })}
        </span>
      </div>
    </div>
  );
}

function HeroPreview({
  label,
  emptyLabel,
  motion = false,
  result,
  statusLabel,
  failed = false,
  downloadLabel,
  zoomLabel,
  continueLabel,
  continueHref,
  onContinue,
}: {
  label: string;
  emptyLabel: string;
  motion?: boolean;
  result?: {
    fileUrl?: string;
    alt?: string;
    columns?: number;
    rows?: number;
    frameCount?: number;
    frameSize?: number;
    fps?: number;
  } | null;
  statusLabel?: string;
  failed?: boolean;
  downloadLabel?: string;
  zoomLabel?: string;
  continueLabel?: string;
  continueHref?: string;
  onContinue?: () => void;
}) {
  const PreviewIcon = motion ? IconMovie : IconPhotoAi;

  return (
    <div className="flex min-h-0 min-w-0 flex-col max-[760px]:min-h-[220px]">
      <span className={heroFieldLabelClass}>{label}</span>
      <div className="border-border bg-secondary/35 text-muted-foreground flex min-h-[188px] flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border p-3 text-center">
        {result?.fileUrl ? (
          <>
            <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-lg bg-[linear-gradient(45deg,rgba(255,255,255,.04)_25%,transparent_25%),linear-gradient(-45deg,rgba(255,255,255,.04)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(255,255,255,.04)_75%),linear-gradient(-45deg,transparent_75%,rgba(255,255,255,.04)_75%)] bg-[size:16px_16px]">
              {motion &&
              result.columns &&
              result.rows &&
              result.frameCount &&
              result.frameSize &&
              result.frameCount > 1 ? (
                <SpriteSheetPlayback
                  alt={result.alt || label}
                  columns={result.columns}
                  frameCount={result.frameCount}
                  frameSize={result.frameSize}
                  fps={result.fps}
                  rows={result.rows}
                  url={result.fileUrl}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={result.fileUrl}
                  alt={result.alt || label}
                  className="size-full object-contain [image-rendering:pixelated]"
                />
              )}
            </div>
            <div className="flex w-full flex-wrap items-center justify-center gap-1.5">
              {!motion && (
                <>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="hover:bg-primary/10 hover:text-primary inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs"
                      >
                        <IconArrowsMaximize className="size-4" />
                        {zoomLabel}
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl rounded-xl p-3">
                      <DialogTitle className="sr-only">{zoomLabel}</DialogTitle>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={result.fileUrl}
                        alt={result.alt || label}
                        className="max-h-[78vh] w-full object-contain [image-rendering:pixelated]"
                      />
                    </DialogContent>
                  </Dialog>
                  <a
                    href={`${result.fileUrl}?download=1`}
                    className="hover:bg-primary/10 hover:text-primary inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs"
                  >
                    <IconDownload className="size-4" />
                    {downloadLabel}
                  </a>
                </>
              )}
              {onContinue ? (
                <button
                  type="button"
                  onClick={onContinue}
                  className="bg-primary text-primary-foreground inline-flex h-8 items-center rounded-md px-2.5 text-xs font-semibold"
                >
                  {continueLabel}
                </button>
              ) : continueHref ? (
                <a
                  href={continueHref}
                  className="bg-primary text-primary-foreground inline-flex h-8 items-center rounded-md px-2.5 text-xs font-semibold"
                >
                  {continueLabel}
                </a>
              ) : null}
            </div>
          </>
        ) : failed ? (
          <>
            <IconAlertCircle
              aria-hidden="true"
              className="text-destructive size-12 stroke-[1.2]"
            />
            <span
              className="text-destructive font-mono text-[9px] font-bold tracking-[0.08em] uppercase"
              role="alert"
            >
              {statusLabel || emptyLabel}
            </span>
          </>
        ) : (
          <>
            {statusLabel ? (
              <IconLoader2
                aria-hidden="true"
                className="text-primary size-12 animate-spin"
              />
            ) : (
              <PreviewIcon
                aria-hidden="true"
                className="text-primary/75 size-12 stroke-[1.2]"
              />
            )}
            <span className="font-mono text-[9px] font-bold tracking-[0.08em] uppercase">
              {statusLabel || emptyLabel}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function HeroComposer({
  promptId,
  promptLabel,
  prompt,
  onPromptChange,
  placeholder,
  children,
  uploadId,
  uploadLabel,
  file,
  previewSrc,
  onFileChange,
  removeLabel,
  previewLabel,
  previewEmpty,
  previewMotion = false,
  selectedProject,
  onProjectChange,
  result,
  statusLabel,
  failed = false,
  downloadLabel,
  zoomLabel,
  continueLabel,
  continueHref,
  onContinue,
  disabled = false,
  validationMessage,
  uploadRequired = false,
  submitLabel,
  busyLabel,
  SubmitIcon,
  credits,
  onPickExisting,
  uploadActionLabel,
  existingActionLabel,
}: {
  promptId: string;
  promptLabel: string;
  prompt: string;
  onPromptChange: (value: string) => void;
  placeholder: string;
  children: ReactNode;
  uploadId: string;
  uploadLabel: string;
  file: File | null;
  previewSrc?: string;
  onFileChange: (file: File | null) => void;
  removeLabel: string;
  previewLabel: string;
  previewEmpty: string;
  previewMotion?: boolean;
  selectedProject: ProjectSummary | null;
  onProjectChange: (project: ProjectSummary) => void;
  result?: {
    fileUrl?: string;
    alt?: string;
    columns?: number;
    rows?: number;
    frameCount?: number;
    frameSize?: number;
    fps?: number;
  } | null;
  statusLabel?: string;
  failed?: boolean;
  downloadLabel?: string;
  zoomLabel?: string;
  continueLabel?: string;
  continueHref?: string;
  onContinue?: () => void;
  disabled?: boolean;
  validationMessage?: string;
  uploadRequired?: boolean;
  submitLabel: string;
  busyLabel: string;
  SubmitIcon: typeof IconSparkles;
  credits: number;
  onPickExisting?: () => void;
  uploadActionLabel?: string;
  existingActionLabel?: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(196px,220px)] items-stretch gap-4 max-[760px]:grid-cols-1">
      <div className="flex min-w-0 flex-col">
        <label className={heroFieldLabelClass} htmlFor={promptId}>
          {promptLabel}
        </label>
        <div className="bg-background focus-within:border-primary/40 focus-within:ring-primary/20 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/12 transition-[border-color,box-shadow] focus-within:ring-2 focus-within:ring-inset">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center justify-start gap-2 px-3 pt-2">
              {children}
            </div>
            <div className="flex min-h-0 flex-1 items-start gap-2 px-3 pt-1 pb-3">
              <textarea
                className="text-foreground caret-primary placeholder:text-muted-foreground min-h-[104px] w-full flex-1 resize-none border-0 bg-transparent py-2 pr-1 text-sm leading-[1.6] outline-none"
                id={promptId}
                onChange={(event) => onPromptChange(event.target.value)}
                placeholder={placeholder}
                rows={4}
                value={prompt}
              />
              <HeroUpload
                file={file}
                id={uploadId}
                label={uploadLabel}
                onFileChange={onFileChange}
                previewSrc={previewSrc}
                removeLabel={removeLabel}
                required={uploadRequired}
                onPickExisting={onPickExisting}
                uploadActionLabel={uploadActionLabel}
                existingActionLabel={existingActionLabel}
              />
            </div>
          </div>
          <div className="bg-secondary/55 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 px-2.5 py-2">
            <ProjectSelector
              value={selectedProject?.id}
              onChange={onProjectChange}
              className="max-[560px]:w-full [&_[data-slot=dropdown-menu-trigger]]:h-9 [&_[data-slot=dropdown-menu-trigger]]:border-0 [&_[data-slot=dropdown-menu-trigger]]:bg-transparent"
            />
            <div className="ml-auto flex min-w-0 items-center justify-end gap-3 max-[560px]:ml-0 max-[560px]:w-full">
              {validationMessage && (
                <p
                  className="text-destructive min-w-0 flex-1 text-right text-sm font-medium"
                  role="alert"
                >
                  {validationMessage}
                </p>
              )}
              <button
                className={cn(
                  ctaClass,
                  'min-h-10 shrink-0 rounded-lg px-4 normal-case disabled:cursor-not-allowed disabled:opacity-55'
                )}
                disabled={disabled}
                type="submit"
              >
                {disabled ? (
                  <IconLoader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <SubmitIcon aria-hidden="true" />
                )}
                {disabled ? busyLabel : submitLabel}
                {disabled ? null : <CreditCostMark credits={credits} />}
              </button>
            </div>
          </div>
        </div>
      </div>
      <HeroPreview
        emptyLabel={previewEmpty}
        failed={failed}
        label={previewLabel}
        motion={previewMotion}
        result={result}
        statusLabel={statusLabel}
        downloadLabel={downloadLabel}
        zoomLabel={zoomLabel}
        continueLabel={continueLabel}
        continueHref={continueHref}
        onContinue={onContinue}
      />
    </div>
  );
}

function SectionHeader({
  index,
  eyebrow,
  title,
  description,
}: {
  index: string;
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  const t = useTranslations('pages.index.messages');

  return (
    <div className="mb-[50px] flex max-w-[940px] flex-col items-start max-[760px]:mb-9">
      <div className="mb-[22px] flex flex-wrap items-center gap-2.5 max-[760px]:mb-[18px]">
        <div
          className={cn(
            monoLabel,
            'border-border bg-vault-navy text-primary inline-flex min-h-7 items-center border px-2.5 py-1.5'
          )}
        >
          {index} / {t('assetSystem')}
        </div>
        {eyebrow ? (
          <div
            className={cn(
              monoLabel,
              'border-border bg-vault-navy text-primary m-0 inline-flex min-h-7 items-center border px-2.5 py-1.5'
            )}
          >
            {eyebrow}
          </div>
        ) : null}
      </div>
      <h2
        className={cn(
          headingFont,
          'max-w-[900px] text-[clamp(38px,4.8vw,66px)] leading-none'
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className="text-muted-foreground mt-5 max-w-[720px] text-sm leading-[1.75] max-[760px]:mt-[18px]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function FeatureShowcase({
  item,
  index,
}: {
  item: FeatureItem;
  index: number;
}) {
  const visualFirst = index % 2 === 1;

  return (
    <article
      className={cn(
        'grid items-center gap-12 py-16 first:pt-0 last:pb-0 max-[1024px]:gap-8 max-[760px]:grid-cols-1 max-[760px]:py-11',
        'grid-cols-[0.86fr_1.14fr]'
      )}
    >
      <div className={cn(visualFirst && 'min-[761px]:order-2')}>
        <span className="text-primary font-mono text-xs font-bold tracking-[0.12em] uppercase">
          {String(index + 1).padStart(2, '0')}
        </span>
        <h3
          className={cn(
            headingFont,
            'mt-5 text-[clamp(30px,3.4vw,48px)] leading-[1.05]'
          )}
        >
          {item.title}
        </h3>
        <p className="text-muted-foreground mt-5 text-sm leading-[1.8]">
          {item.description}
        </p>
        <ul className="mt-7 space-y-3">
          {item.bullets.map((bullet) => (
            <li
              className="flex items-start gap-3 text-sm leading-6"
              key={bullet}
            >
              <span className="bg-primary/15 text-primary mt-0.5 grid size-5 shrink-0 place-items-center rounded-md">
                <IconCheck aria-hidden="true" className="size-3.5" />
              </span>
              {bullet}
            </li>
          ))}
        </ul>
      </div>
      <div
        className={cn(
          'border-border bg-vault-navy overflow-hidden rounded-xl border',
          visualFirst && 'min-[761px]:order-1'
        )}
      >
        <NextImage
          alt={item.alt}
          className="h-auto w-full"
          height={992}
          sizes="(max-width: 760px) calc(100vw - 28px), (max-width: 1024px) 54vw, 640px"
          src={item.image}
          width={1586}
        />
      </div>
    </article>
  );
}

export function Home({ section: _section }: { section: Section }) {
  const locale = useLocale();
  const t = useTranslations('pages.index.messages');
  const tPricing = useTranslations('pages.pricing');
  const tGeneration = useTranslations('generation');
  const tProduct = useTranslations('workspace');
  const notifyApiError = useProductApiFeedback();
  const { user, isCheckSign } = useAppContext();
  const translateGeneration = (key: string) => tGeneration(key as never);
  const inspirations = t.raw('inspirations') as string[];
  const valueBarItems = t.raw('valueBar') as string[];
  const capabilityItems = t.raw('capabilities.items') as CapabilityItem[];
  const featureItems = t.raw('features.items') as FeatureItem[];
  const toolItems = t.raw('tools.items') as ToolItem[];
  const workflowSteps = t.raw('workflowSteps') as {
    title: string;
    description: string;
  }[];
  const useCaseItems = t.raw('useCases') as {
    title: string;
    description: string;
  }[];
  const faqItems = t.raw('faq') as { question: string; answer: string }[];
  const pricingSection = tPricing.raw('page.sections.pricing') as PricingType;
  const [heroMode, setHeroMode] = useState<'character' | 'motion'>('character');
  const [prompt, setPrompt] = useState('');
  const [motionPrompt, setMotionPrompt] = useState('');
  const [characterReference, setCharacterReference] = useState<File | null>(
    null
  );
  const [motionCharacter, setMotionCharacter] =
    useState<MotionCharacterRef | null>(null);
  const [characterPickerOpen, setCharacterPickerOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(
    null
  );
  const [characterGenerationStatus, setCharacterGenerationStatus] =
    useState<string>('idle');
  const [characterGenerationResult, setCharacterGenerationResult] =
    useState<any>(null);
  const [characterGenerationError, setCharacterGenerationError] = useState('');
  const [motionGenerationStatus, setMotionGenerationStatus] =
    useState<string>('idle');
  const [motionGenerationResult, setMotionGenerationResult] =
    useState<any>(null);
  const [motionGenerationError, setMotionGenerationError] = useState('');
  const [characterStyle, setCharacterStyle] = useState<string>(
    generationDefaults.style
  );
  const [characterPerspective, setCharacterPerspective] = useState<string>(
    generationDefaults.perspective
  );
  const [characterType, setCharacterType] = useState<string>(
    generationDefaults.characterType
  );
  const [motionType, setMotionType] = useState<string>(
    generationDefaults.actionType
  );
  const [motionDirection, setMotionDirection] = useState<string>(
    generationDefaults.direction
  );
  const [motionFrames, setMotionFrames] = useState<string>(
    generationDefaults.frames
  );
  const [motionFrameSize, setMotionFrameSize] = useState<string>(
    generationDefaults.frameSize
  );
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('');
  const [validationAttempted, setValidationAttempted] = useState(false);
  const inspirationIndexRef = useRef(0);

  const localize = (path: string) =>
    locale === defaultLocale ? path : `/${locale}${path}`;

  const firstInspiration = inspirations[0] ?? '';

  useEffect(() => {
    inspirationIndexRef.current = 0;
    if (!firstInspiration) {
      setAnimatedPlaceholder('');
      return;
    }

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setAnimatedPlaceholder(firstInspiration);
      return;
    }

    let cancelled = false;
    let i = 0;
    setAnimatedPlaceholder('');
    const timer = window.setInterval(() => {
      if (cancelled) return;
      i += 1;
      setAnimatedPlaceholder(firstInspiration.slice(0, i));
      if (i >= firstInspiration.length) {
        window.clearInterval(timer);
      }
    }, TYPING_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [firstInspiration]);

  useEffect(() => {
    if (isCheckSign || !user) return;
    void prefetchProjectList(user.id).catch(() => undefined);
  }, [isCheckSign, user]);

  useEffect(() => {
    const stored = window.sessionStorage.getItem('sv_pending_generation');
    if (!stored) return;
    try {
      const pending = JSON.parse(stored);
      setHeroMode(pending.mode === 'motion' ? 'motion' : 'character');
      if (pending.mode === 'motion') {
        setMotionPrompt(pending.prompt || '');
        setMotionType(pending.action || generationDefaults.actionType);
        setMotionDirection(pending.direction || generationDefaults.direction);
        setMotionFrames(pending.frames || generationDefaults.frames);
        setMotionFrameSize(pending.frameSize || generationDefaults.frameSize);
        setMotionGenerationError(tProduct('generation.referenceRequired'));
      } else {
        setPrompt(pending.prompt || '');
        setCharacterStyle(pending.style || generationDefaults.style);
        setCharacterPerspective(
          pending.perspective || generationDefaults.perspective
        );
        setCharacterType(
          pending.characterType || generationDefaults.characterType
        );
      }
      window.sessionStorage.removeItem('sv_pending_generation');
    } catch {
      window.sessionStorage.removeItem('sv_pending_generation');
    }
  }, []);

  const surprisePrompt = () => {
    const next = pickInspirationIndex(
      inspirationIndexRef.current,
      inspirations.length
    );
    inspirationIndexRef.current = next;
    setPrompt(inspirations[next]);
    setValidationAttempted(false);
  };

  const uploadReference = async (file: File, projectId: string, role: string) =>
    uploadProjectReferenceFile({
      projectId,
      file,
      role,
    });

  const applyGenerationPayload = (
    payload: any,
    mode: 'character' | 'motion'
  ) => {
    if (mode === 'motion') {
      setMotionGenerationStatus(payload?.status || 'idle');
      setMotionGenerationResult(payload);
    } else {
      setCharacterGenerationStatus(payload?.status || 'idle');
      setCharacterGenerationResult(payload);
    }
  };

  const activeGenerationKey = (mode: 'character' | 'motion') =>
    mode === 'motion'
      ? 'sv_active_motion_generation'
      : 'sv_active_character_generation';

  const pollGeneration = async (
    generationId: string,
    mode: 'character' | 'motion'
  ) => {
    const response = await fetch(`/api/generations/${generationId}`);
    const payload = await readApiPayload(response);
    const resolvedMode =
      payload.data?.taskType === 'animation' ? 'motion' : mode;
    applyGenerationPayload(payload.data, resolvedMode);
    if (['pending', 'processing'].includes(payload.data.status)) {
      window.setTimeout(
        () =>
          pollGeneration(generationId, resolvedMode).catch((error) =>
            handleGenerationError(resolvedMode, error)
          ),
        1800
      );
    } else {
      window.sessionStorage.removeItem(activeGenerationKey(resolvedMode));
      window.sessionStorage.removeItem('sv_active_generation');
    }
  };

  const handleGenerationError = (
    mode: 'character' | 'motion',
    error: unknown
  ) => {
    const message = notifyApiError(error);
    if (mode === 'motion') {
      setMotionGenerationStatus('failed');
      setMotionGenerationError(message);
    } else {
      setCharacterGenerationStatus('failed');
      setCharacterGenerationError(message);
    }
  };

  const startProject = async (event?: FormEvent) => {
    event?.preventDefault();
    const submittedPrompt =
      heroMode === 'character' ? prompt.trim() : motionPrompt.trim();
    setValidationAttempted(true);
    if (!submittedPrompt || (heroMode === 'motion' && !motionCharacter)) return;
    if (isCheckSign) return;
    if (!user) {
      notifyApiError('UNAUTHORIZED');
      return;
    }
    if (!selectedProject) {
      notifyApiError('PROJECT_NOT_FOUND');
      return;
    }
    setValidationAttempted(false);
    if (heroMode === 'motion') {
      setMotionGenerationStatus('validating');
      setMotionGenerationError('');
      setMotionGenerationResult(null);
    } else {
      setCharacterGenerationStatus('validating');
      setCharacterGenerationError('');
      setCharacterGenerationResult(null);
    }
    try {
      let referenceFileId: string | undefined;
      let itemId: string | undefined;
      if (heroMode === 'motion' && motionCharacter?.origin === 'vault') {
        referenceFileId = motionCharacter.fileId;
        itemId = motionCharacter.itemId;
      } else {
        const referenceFile =
          heroMode === 'character'
            ? characterReference
            : motionCharacter?.origin === 'upload'
              ? motionCharacter.file
              : null;
        referenceFileId = referenceFile
          ? await uploadReference(
              referenceFile,
              selectedProject.id,
              heroMode === 'motion' ? 'motion_reference' : 'reference'
            )
          : undefined;
      }
      const generationId = crypto.randomUUID();
      const directionMode =
        motionDirection === 'eight-way'
          ? '8'
          : motionDirection === 'four-way'
            ? '4'
            : 'single';
      const directionMap: Record<string, string> = {
        up: 'north',
        right: 'east',
        down: 'south',
        left: 'west',
      };
      const request =
        heroMode === 'character'
          ? {
              id: generationId,
              type: 'character',
              prompt: submittedPrompt,
              referenceFileId,
              style: characterStyle,
              perspective: characterPerspective,
              characterType,
            }
          : {
              id: generationId,
              type: 'animation',
              prompt: submittedPrompt,
              itemId,
              referenceFileId,
              action: motionType,
              directionMode,
              direction: directionMap[motionDirection] || 'east',
              frames: motionFrames === 'auto' ? 'auto' : Number(motionFrames),
              fps: 12,
              frameSize: motionFrameSize,
            };
      const response = await fetch(
        `/api/projects/${selectedProject.id}/generations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }
      );
      const payload = await readApiPayload(response);
      applyGenerationPayload(
        payload.data,
        heroMode === 'motion' ? 'motion' : 'character'
      );
      window.sessionStorage.setItem(
        activeGenerationKey(heroMode === 'motion' ? 'motion' : 'character'),
        generationId
      );
      if (['pending', 'processing'].includes(payload.data.status)) {
        window.setTimeout(
          () =>
            pollGeneration(
              generationId,
              heroMode === 'motion' ? 'motion' : 'character'
            ).catch((error) =>
              handleGenerationError(
                heroMode === 'motion' ? 'motion' : 'character',
                error
              )
            ),
          1800
        );
      }
    } catch (error) {
      handleGenerationError(
        heroMode === 'motion' ? 'motion' : 'character',
        error
      );
    }
  };

  useEffect(() => {
    const characterId =
      window.sessionStorage.getItem('sv_active_character_generation') ||
      window.sessionStorage.getItem('sv_active_generation');
    const motionId = window.sessionStorage.getItem(
      'sv_active_motion_generation'
    );
    if (characterId) {
      pollGeneration(characterId, 'character').catch((error) =>
        handleGenerationError('character', error)
      );
    }
    if (motionId) {
      pollGeneration(motionId, 'motion').catch((error) =>
        handleGenerationError('motion', error)
      );
    }
  }, []);

  const characterPreviewItem = characterGenerationResult?.items?.find(
    (item: any) => item.status === 'success' && item.file?.url
  );
  const motionPreviewItem = motionGenerationResult?.items?.find(
    (item: any) => item.status === 'success' && item.file?.url
  );
  const statusLabelFor = (
    status: string,
    error: string,
    processingFallback: string
  ) =>
    error
      ? error
      : ['validating', 'pending'].includes(status)
        ? tProduct('generation.queued')
        : status === 'processing'
          ? processingFallback
          : status === 'partial'
            ? tProduct('generation.partial')
            : status === 'failed' ||
                status === 'postprocessing_failed' ||
                status === 'canceled'
              ? tProduct('generation.failed')
              : undefined;
  const characterStatusLabel = statusLabelFor(
    characterGenerationStatus,
    characterGenerationError,
    tProduct('generation.processing')
  );
  const motionStatusLabel = statusLabelFor(
    motionGenerationStatus,
    motionGenerationError,
    tProduct('generation.processing')
  );
  const editorVersionId = motionGenerationResult?.items?.find(
    (item: any) => item.editorVersionId
  )?.editorVersionId;
  const motionContinueHref = motionPreviewItem
    ? editorVersionId
      ? localize(`/editor/animations/${editorVersionId}`)
      : undefined
    : undefined;
  const openMotionFromCharacter = async () => {
    const vault = vaultRefFromCharacterGeneration(characterGenerationResult);
    if (!vault) return;
    setMotionCharacter(vault);
    setHeroMode('motion');
    setValidationAttempted(false);
  };
  const activePrompt = heroMode === 'character' ? prompt : motionPrompt;
  const validationMessage = validationAttempted
    ? !activePrompt.trim()
      ? tProduct('generation.promptRequired')
      : heroMode === 'motion' && !motionCharacter
        ? tProduct('generation.motionReferenceRequired')
        : undefined
    : undefined;

  return (
    <main className="bg-background text-foreground overflow-hidden">
      <section
        id="hero"
        className="border-border bg-vault-navy relative isolate flex min-h-screen items-center overflow-hidden border-b bg-cover bg-center pt-32 pb-[72px] max-[760px]:min-h-[760px] max-[760px]:pt-28 max-[760px]:pb-[60px]"
        style={{ backgroundImage: "url('/imgs/bg/index.webp')" }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[#050911]/65"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--primary)_1px,transparent_1px),linear-gradient(to_bottom,var(--primary)_1px,transparent_1px)] bg-[size:48px_48px] opacity-[0.045]"
        />
        <div className={cn(shellClass, 'relative z-10')}>
          <div className="mx-auto flex w-full flex-col items-center text-center">
            <div
              className={cn(
                monoLabel,
                'text-primary border-primary/35 mb-5 rounded-full border bg-black/25 px-4 py-2 backdrop-blur-sm'
              )}
            >
              {t('eyebrow')}
            </div>
            <h1
              aria-label={t('heroTitle')}
              className={cn(
                headingFont,
                'max-w-[1040px] text-[clamp(48px,5.8vw,82px)] leading-[0.98] text-balance max-[760px]:text-[clamp(42px,13vw,62px)]'
              )}
            >
              <span className="mt-2 block text-white">
                {t('heroTitleAccent')}
              </span>
            </h1>
            <p className="mt-7 max-w-[720px] text-[17px] leading-[1.75] text-white/72 max-[760px]:text-[15px]">
              {t('heroDescription')}
            </p>

            <form
              onSubmit={startProject}
              className="mx-auto mt-9 w-full text-left max-[760px]:mt-8 min-[761px]:w-[calc(100%-160px)]"
            >
              <div
                aria-label={t('generationMode')}
                className="flex items-end gap-2 px-4 max-[560px]:px-0"
                role="tablist"
              >
                {[
                  {
                    id: 'character',
                    label: t('createCharacter'),
                    icon: IconPhotoAi,
                  },
                  {
                    id: 'motion',
                    label: t('generateMotion'),
                    icon: IconMovie,
                  },
                ].map(({ id, label, icon: TabIcon }) => {
                  const active = heroMode === id;

                  return (
                    <button
                      aria-controls={`hero-${id}-panel`}
                      aria-selected={active}
                      className={cn(
                        'inline-flex min-h-11 items-center gap-2 rounded-t-lg border border-b-0 px-6 text-sm font-bold transition-colors max-[560px]:flex-1 max-[560px]:justify-center max-[560px]:px-3 [&_svg]:size-4',
                        active
                          ? 'border-primary/70! text-primary border-b-[#0b111b] bg-[#0b111b]/95 shadow-[0_-8px_28px_rgba(245,181,48,0.08)]'
                          : 'border-white/12 bg-[#0b111b]/70 text-white/65 hover:border-white/25 hover:text-white'
                      )}
                      id={`hero-${id}-tab`}
                      key={id}
                      onClick={() => {
                        setHeroMode(id as 'character' | 'motion');
                        setValidationAttempted(false);
                      }}
                      role="tab"
                      type="button"
                    >
                      <TabIcon aria-hidden="true" />
                      {label}
                    </button>
                  );
                })}
              </div>

              <div
                aria-labelledby="hero-character-tab"
                className={cn(
                  'border-primary/65 rounded-2xl border bg-[#0b111b]/94 p-4 shadow-[0_28px_80px_rgba(0,0,0,0.42),0_0_32px_rgba(245,181,48,0.08)] backdrop-blur-xl max-[760px]:p-3',
                  heroMode !== 'character' && 'hidden'
                )}
                hidden={heroMode !== 'character'}
                id="hero-character-panel"
                role="tabpanel"
              >
                <HeroComposer
                  SubmitIcon={IconSparkles}
                  file={characterReference}
                  onFileChange={setCharacterReference}
                  removeLabel={tGeneration('upload.remove')}
                  selectedProject={selectedProject}
                  onProjectChange={setSelectedProject}
                  onPromptChange={(value) => {
                    setPrompt(value);
                  }}
                  placeholder={animatedPlaceholder}
                  previewEmpty={t('previewEmpty')}
                  previewLabel={t('preview')}
                  result={
                    characterPreviewItem
                      ? {
                          fileUrl: characterPreviewItem.file.url,
                          alt: characterGenerationResult?.prompt,
                        }
                      : null
                  }
                  statusLabel={characterStatusLabel}
                  failed={[
                    'failed',
                    'postprocessing_failed',
                    'canceled',
                  ].includes(characterGenerationStatus)}
                  downloadLabel={tProduct('generation.download')}
                  zoomLabel={tProduct('generation.zoom')}
                  continueLabel={tProduct('generation.openCharacter')}
                  onContinue={
                    characterPreviewItem ? openMotionFromCharacter : undefined
                  }
                  disabled={['validating', 'pending', 'processing'].includes(
                    characterGenerationStatus
                  )}
                  prompt={prompt}
                  promptId="homepage-character-prompt"
                  promptLabel={t('characterDescription')}
                  submitLabel={t('startCreating')}
                  busyLabel={t('startCreatingBusy')}
                  credits={getGenerationCredits('character')}
                  uploadId="homepage-character-reference"
                  uploadLabel={tGeneration('upload.reference')}
                  validationMessage={validationMessage}
                >
                  <HeroOptionSelect
                    label={tGeneration('fields.style')}
                    onValueChange={setCharacterStyle}
                    options={mapGenerationOptions('style', translateGeneration)}
                    value={characterStyle}
                  />
                  <HeroOptionSelect
                    label={tGeneration('fields.perspective')}
                    onValueChange={setCharacterPerspective}
                    options={mapGenerationOptions(
                      'perspective',
                      translateGeneration
                    )}
                    value={characterPerspective}
                  />
                  <HeroOptionSelect
                    label={tGeneration('fields.characterType')}
                    onValueChange={setCharacterType}
                    options={mapGenerationOptions(
                      'characterType',
                      translateGeneration
                    )}
                    value={characterType}
                  />
                  <button
                    className="text-foreground hover:border-primary hover:text-primary ml-auto inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/12 bg-white/4 px-2.5 font-mono text-[9px] font-bold tracking-[0.03em] whitespace-nowrap uppercase transition-colors [&_svg]:size-3.5"
                    onClick={surprisePrompt}
                    type="button"
                  >
                    <IconSparkles aria-hidden="true" />
                    {t('surpriseMe')}
                  </button>
                </HeroComposer>
              </div>
              <div
                aria-labelledby="hero-motion-tab"
                className={cn(
                  'border-primary/65 rounded-2xl border bg-[#0b111b]/94 p-4 shadow-[0_28px_80px_rgba(0,0,0,0.42),0_0_32px_rgba(245,181,48,0.08)] backdrop-blur-xl max-[760px]:p-3',
                  heroMode !== 'motion' && 'hidden'
                )}
                hidden={heroMode !== 'motion'}
                id="hero-motion-panel"
                role="tabpanel"
              >
                <HeroComposer
                  SubmitIcon={IconMovie}
                  file={
                    motionCharacter?.origin === 'upload'
                      ? motionCharacter.file
                      : null
                  }
                  previewSrc={
                    motionCharacter?.origin === 'vault'
                      ? motionCharacter.previewUrl
                      : undefined
                  }
                  onFileChange={(file) =>
                    setMotionCharacter(file ? { origin: 'upload', file } : null)
                  }
                  removeLabel={tGeneration('upload.remove')}
                  selectedProject={selectedProject}
                  onProjectChange={setSelectedProject}
                  onPromptChange={setMotionPrompt}
                  placeholder={t('motionPromptPlaceholder')}
                  previewEmpty={t('previewEmpty')}
                  previewLabel={t('preview')}
                  previewMotion
                  result={
                    motionPreviewItem
                      ? {
                          fileUrl: motionPreviewItem.file.url,
                          alt: motionGenerationResult?.prompt,
                          columns: Number(motionPreviewItem.metadata?.columns),
                          rows: Number(motionPreviewItem.metadata?.rows),
                          frameCount: Number(
                            motionPreviewItem.metadata?.frameCount
                          ),
                          frameSize: Number(
                            motionGenerationResult?.params?.frameSize ||
                              motionFrameSize
                          ),
                          fps: Number(
                            motionGenerationResult?.params?.fps || 12
                          ),
                        }
                      : null
                  }
                  statusLabel={motionStatusLabel}
                  failed={[
                    'failed',
                    'postprocessing_failed',
                    'canceled',
                  ].includes(motionGenerationStatus)}
                  downloadLabel={tProduct('generation.download')}
                  zoomLabel={tProduct('generation.zoom')}
                  continueLabel={t('editAndDownload')}
                  continueHref={motionContinueHref}
                  disabled={['validating', 'pending', 'processing'].includes(
                    motionGenerationStatus
                  )}
                  prompt={motionPrompt}
                  promptId="homepage-motion-prompt"
                  promptLabel={t('motionDescription')}
                  submitLabel={t('startCreating')}
                  busyLabel={t('startCreatingBusy')}
                  credits={getGenerationCredits('animation', {
                    taskCount:
                      motionDirection === 'eight-way'
                        ? 8
                        : motionDirection === 'four-way'
                          ? 4
                          : 1,
                  })}
                  uploadId="homepage-motion-reference"
                  uploadLabel={tGeneration('upload.character')}
                  uploadRequired
                  uploadActionLabel={tGeneration('upload.file')}
                  existingActionLabel={tGeneration('upload.existing')}
                  onPickExisting={() => {
                    if (!user) {
                      notifyApiError('UNAUTHORIZED');
                      return;
                    }
                    if (!selectedProject) {
                      notifyApiError('PROJECT_NOT_FOUND');
                      return;
                    }
                    setCharacterPickerOpen(true);
                  }}
                  validationMessage={validationMessage}
                >
                  <HeroOptionSelect
                    label={tGeneration('fields.actionType')}
                    onValueChange={setMotionType}
                    options={mapGenerationOptions(
                      'actionType',
                      translateGeneration
                    )}
                    value={motionType}
                  />
                  <HeroOptionSelect
                    label={tGeneration('fields.direction')}
                    onValueChange={setMotionDirection}
                    options={mapGenerationOptions(
                      'direction',
                      translateGeneration
                    )}
                    value={motionDirection}
                  />
                  <HeroOptionSelect
                    label={tGeneration('fields.frames')}
                    onValueChange={setMotionFrames}
                    options={mapGenerationOptions(
                      'frames',
                      translateGeneration
                    )}
                    value={motionFrames}
                  />
                  <HeroOptionSelect
                    label={tGeneration('fields.frameSize')}
                    onValueChange={setMotionFrameSize}
                    options={mapGenerationOptions(
                      'frameSize',
                      translateGeneration
                    )}
                    value={motionFrameSize}
                  />
                </HeroComposer>
                <ProjectAssetPicker
                  open={characterPickerOpen}
                  onOpenChange={setCharacterPickerOpen}
                  projectId={selectedProject?.id}
                  kinds={['character']}
                  selectedId={
                    motionCharacter?.origin === 'vault'
                      ? motionCharacter.fileId
                      : undefined
                  }
                  title={tProduct('filePicker.characterTitle')}
                  description={tProduct('filePicker.characterDescription')}
                  selectLabel={tGeneration('upload.character')}
                  onSelect={(file) => {
                    setMotionCharacter({
                      origin: 'vault',
                      itemId: file.itemId || '',
                      fileId: file.id,
                      previewUrl: file.url,
                    });
                  }}
                />
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="border-border bg-vault-navy border-b">
        <div className={shellClass}>
          <ul className="grid grid-cols-4 max-[760px]:grid-cols-2">
            {valueBarItems.map((item) => (
              <li
                className="border-border flex min-h-24 items-center gap-3 border-r px-5 text-sm font-semibold last:border-r-0 max-[760px]:border-b max-[760px]:px-3"
                key={item}
              >
                <IconCheck
                  aria-hidden="true"
                  className="text-primary size-4 shrink-0"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={sectionClass} id="features">
        <div className={shellClass}>
          <SectionHeader
            index="01"
            title={t('capabilities.title')}
            description={t('capabilities.description')}
          />
          <div className="grid grid-cols-3 gap-4 max-[1024px]:grid-cols-2 max-[760px]:grid-cols-1">
            {capabilityItems.map(({ title, description }, index) => {
              const IconComponent =
                [
                  IconPhotoAi,
                  IconSparkles,
                  IconArrowsMaximize,
                  IconMovie,
                  IconDownload,
                  IconBox,
                ][index] ?? IconSparkles;
              return (
                <article
                  className="border-border bg-card rounded-lg border p-6"
                  key={title}
                >
                  <IconComponent
                    aria-hidden="true"
                    className="text-primary size-8 stroke-[1.35]"
                  />
                  <h3
                    className={cn(headingFont, 'mt-6 text-2xl tracking-normal')}
                  >
                    {title}
                  </h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-7">
                    {description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className={cn(sectionClass, 'bg-vault-navy')} id="examples">
        <div className={shellClass}>
          <SectionHeader
            index="02"
            title={t('features.title')}
            description={t('features.description')}
          />
          <div className="divide-border divide-y">
            {featureItems.map((item, index) => (
              <FeatureShowcase index={index} item={item} key={item.title} />
            ))}
          </div>
        </div>
      </section>

      <section className={sectionClass} id="tools">
        <div className={shellClass}>
          <SectionHeader
            index="07"
            title={t('tools.title')}
            description={t('tools.description')}
          />
          <div className="grid grid-cols-3 gap-4 max-[1024px]:grid-cols-1">
            {toolItems.map((item, index) => {
              const IconComponent =
                [IconPhotoAi, IconBox, IconWand][index] ?? IconBox;
              return (
                <a
                  className="border-border bg-card hover:border-primary/55 group flex min-h-72 flex-col rounded-lg border p-6 transition-colors"
                  href={localize(item.href)}
                  key={item.title}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="bg-primary/10 text-primary grid size-11 place-items-center rounded-lg">
                      <IconComponent aria-hidden="true" className="size-6" />
                    </span>
                    <span className="border-primary/25 text-primary rounded-full border px-2.5 py-1 font-mono text-xs font-bold uppercase">
                      {item.badge}
                    </span>
                  </div>
                  <h3
                    className={cn(
                      headingFont,
                      'mt-10 text-2xl tracking-normal'
                    )}
                  >
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-7">
                    {item.description}
                  </p>
                  <span className="text-primary mt-auto flex items-center gap-2 pt-8 text-sm font-semibold">
                    {item.cta}
                    <IconArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className={shellClass}>
          <SectionHeader
            index="08"
            title={t('workflowTitle')}
            description={t('workflowDescription')}
          />
          <div className="grid grid-cols-3 gap-4 max-[760px]:grid-cols-1">
            {workflowSteps.map(({ title, description }, index) => {
              const IconComponent =
                [IconPlus, IconSparkles, IconDownload][index] ?? IconPlus;
              return (
                <article
                  className="border-border bg-card min-h-64 rounded-lg border p-7"
                  key={title}
                >
                  <span className="text-primary font-mono text-xs font-bold">
                    0{index + 1}
                  </span>
                  <IconComponent
                    aria-hidden="true"
                    className="text-primary mt-6 size-8 stroke-[1.2]"
                  />
                  <h3
                    className={cn(
                      headingFont,
                      'mt-6 text-[22px] tracking-normal'
                    )}
                  >
                    {title}
                  </h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-7">
                    {description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className={cn(sectionClass, 'bg-vault-navy')}>
        <div className={shellClass}>
          <SectionHeader
            index="09"
            title={t('useCasesTitle')}
            description={t('useCasesDescription')}
          />
          <div className="grid grid-cols-4 gap-4 max-[1024px]:grid-cols-2 max-[760px]:grid-cols-1">
            {useCaseItems.map(({ title, description }, index) => {
              const IconComponent =
                [IconSword, IconDeviceGamepad2, IconFlask, IconBrandGithub][
                  index
                ] ?? IconSword;
              return (
                <article
                  className="border-border bg-card min-h-64 rounded-lg border p-7"
                  key={title}
                >
                  <IconComponent
                    aria-hidden="true"
                    className="text-primary size-8 stroke-[1.2]"
                  />
                  <h3
                    className={cn(
                      headingFont,
                      'mt-6 text-[22px] tracking-normal'
                    )}
                  >
                    {title}
                  </h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-7">
                    {description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className={sectionClass} id="pricing">
        <div className={shellClass}>
          <SectionHeader
            index="11"
            title={t('pricingTitle')}
            description={t('pricingNote')}
          />
          <Pricing compact section={pricingSection} />
        </div>
      </section>

      <section className={cn(sectionClass, 'bg-vault-navy')}>
        <div className={shellClass}>
          <div className="grid grid-cols-[0.75fr_1.25fr] gap-20 max-[760px]:block">
            <SectionHeader
              index="12"
              title={t('faqTitle')}
              description={t('faqDescription')}
            />
            <div className="border-border border-t max-[760px]:mt-9">
              {faqItems.map(({ question, answer }) => (
                <details
                  className="border-border group border-b"
                  key={question}
                >
                  <summary className="flex min-h-[78px] cursor-pointer list-none items-center justify-between gap-[18px] text-sm font-semibold [&::-webkit-details-marker]:hidden">
                    {question}
                    <IconPlus
                      aria-hidden="true"
                      className="text-accent-foreground size-4 shrink-0 transition-transform duration-150 group-open:rotate-45"
                    />
                  </summary>
                  <p className="text-muted-foreground pr-11 pb-6 text-sm leading-7">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className={cn(
          sectionClass,
          'border-t-0 py-[150px] text-center max-[760px]:py-[100px]'
        )}
      >
        <div className={cn(shellClass, 'flex flex-col items-center')}>
          <IconDeviceGamepad2
            aria-hidden="true"
            className="text-primary size-[38px] stroke-[1.2]"
          />
          <h2
            className={cn(
              headingFont,
              'mt-[30px] max-w-[850px] text-[clamp(40px,5vw,70px)] leading-none'
            )}
          >
            {t('finalTitle')}
          </h2>
          <p className="text-muted-foreground mt-5 max-w-2xl text-sm leading-7">
            {t('finalDescription')}
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <button
              className={cn(ctaClass, 'px-[22px] py-[15px]')}
              onClick={() => startProject()}
              type="button"
            >
              {t('createProject')}
              <IconArrowRight aria-hidden="true" />
            </button>
            <a
              className="border-border hover:border-primary/55 hover:text-primary inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border px-[22px] py-[15px] text-sm font-semibold transition-colors"
              href={localize('/sprite-sheet-maker')}
            >
              {t('freeToolsCta')}
              <IconBox aria-hidden="true" className="size-4" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
