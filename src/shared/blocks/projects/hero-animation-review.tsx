'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  LoaderCircle,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { animationFrameLimit } from '@/shared/lib/animation-review';
import {
  readApiPayload,
  useProductApiFeedback,
} from '@/shared/lib/product-api-error';
import { cn } from '@/shared/lib/utils';

const optionTriggerClass =
  'hover:bg-secondary/70 bg-secondary/55 data-[state=open]:bg-secondary/70 h-8 w-auto min-w-0 shrink-0 gap-1 rounded-lg border-0 px-3 text-[12px] shadow-none hover:border-transparent focus-visible:ring-0 data-[state=open]:border-transparent [&_svg]:size-3.5';

// Homepage only: the workspace keeps its existing review and manual-save flow.
export function HeroAnimationReview({
  generation,
  generating,
  failed,
  startedAt,
  onChange,
  onBusyChange,
  onReset,
}: {
  generation: any;
  generating: boolean;
  failed: boolean;
  startedAt: number;
  onChange(value: any): void;
  onBusyChange(value: boolean): void;
  onReset(): void;
}) {
  const t = useTranslations('workspace.heroAnimation');
  const preview = useTranslations('workspace.animationPreview');
  const editor = useTranslations('workspace.editor');
  const notify = useProductApiFeedback();
  const video = useRef<HTMLVideoElement>(null);
  const inFlight = useRef(false);
  const task = generation?.items?.find((item: any) => item.video);
  const sheet = task?.heroSheet;
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sheetPlaying, setSheetPlaying] = useState(true);
  const [sheetLoadAttempt, setSheetLoadAttempt] = useState(0);
  const [sheetImage, setSheetImage] = useState<{
    key: string;
    status: 'ready' | 'error';
  } | null>(null);
  const sheetUrl = sheet?.url;
  const sheetImageKey = JSON.stringify([
    sheetUrl,
    sheet?.requestId,
    sheetLoadAttempt,
  ]);
  const sheetReady =
    sheetImage?.key === sheetImageKey && sheetImage.status === 'ready';
  const sheetLoadFailed =
    sheetImage?.key === sheetImageKey && sheetImage.status === 'error';
  const [elapsed, setElapsed] = useState(0);
  const [frameMode, setFrameMode] = useState('auto');
  const [customFrames, setCustomFrames] = useState('24');
  const [framesOpen, setFramesOpen] = useState(false);
  const [customFrameInvalid, setCustomFrameInvalid] = useState(false);
  const customFrameInput = useRef<HTMLInputElement>(null);
  const customFrameConfirm = useRef<HTMLButtonElement>(null);
  const frameErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [size, setSize] = useState('128');
  const [fps, setFps] = useState(12);
  const [loop, setLoop] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<'video' | 'sheet' | null>(null);
  const [large, setLarge] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [frame, setFrame] = useState(0);
  const requestId = useRef<string | null>(null);
  const maxFrames = Math.min(
    animationFrameLimit(duration),
    sheet?.source_frame_count ?? Infinity
  );
  const count =
    frameMode === 'auto' ? Math.min(16, maxFrames) : Number(frameMode);
  const disabled = generating || busy;
  const valid =
    duration > 0 &&
    Number.isInteger(count) &&
    count >= 2 &&
    count <= maxFrames &&
    Number.isInteger(fps) &&
    fps >= 1 &&
    fps <= 60;
  useEffect(() => {
    setDuration(
      video.current && video.current.readyState >= 1
        ? video.current.duration
        : 0
    );
    setError('');
    setPlaying(false);
    requestId.current = null;
  }, [generation?.id]);
  useEffect(() => {
    if (!sheet) return;
    setFrameMode(String(sheet.frame_count));
    setSize(String(sheet.frame_size));
    setFps(sheet.fps);
    setLoop(sheet.loop);
    setFrame(0);
    setSheetPlaying(true);
  }, [sheet?.requestId]);
  useEffect(() => {
    if (!sheetUrl) return;
    let canceled = false;
    const image = new Image();
    setFrame(0);
    setSheetPlaying(true);
    image.onload = async () => {
      try {
        // Wait for decoding too: a downloaded sheet may not yet be drawable.
        await image.decode();
        if (!canceled) setSheetImage({ key: sheetImageKey, status: 'ready' });
      } catch {
        if (!canceled) setSheetImage({ key: sheetImageKey, status: 'error' });
      }
    };
    image.onerror = () => {
      if (!canceled) setSheetImage({ key: sheetImageKey, status: 'error' });
    };
    image.src = sheetUrl;
    return () => {
      canceled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [sheetUrl, sheetImageKey]);
  useEffect(() => {
    if (!generating) return;
    const update = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [generating, startedAt]);
  useEffect(() => {
    if (!sheet || !sheetReady || !sheetPlaying || hovered || large || busy)
      return;
    const timer = setTimeout(() => {
      if (!sheet.loop && frame >= sheet.frame_count - 1) {
        setSheetPlaying(false);
        return;
      }
      setFrame((current) => (current + 1) % sheet.frame_count);
    }, 1000 / fps);
    return () => clearTimeout(timer);
  }, [sheet, sheetReady, sheetPlaying, hovered, large, busy, fps, frame]);

  useEffect(
    () => () => {
      if (frameErrorTimer.current) clearTimeout(frameErrorTimer.current);
    },
    []
  );

  function flashFrameError() {
    if (frameErrorTimer.current) clearTimeout(frameErrorTimer.current);
    setCustomFrameInvalid(true);
    frameErrorTimer.current = setTimeout(
      () => setCustomFrameInvalid(false),
      900
    );
  }

  function confirmCustomFrames() {
    const value = Number(customFrames);
    const clamped = Math.max(2, Math.min(maxFrames, Math.trunc(value || 2)));
    if (!Number.isInteger(value) || value !== clamped) {
      setCustomFrames(String(clamped));
      flashFrameError();
      customFrameInput.current?.focus();
      return;
    }
    setFrameMode(String(clamped));
    requestId.current = null;
    setFramesOpen(false);
  }

  async function generateSheet() {
    if (!task || inFlight.current || (!valid && !sheet?.cleanupPending)) return;
    inFlight.current = true;
    setBusy(true);
    onBusyChange(true);
    setError('');
    // Reuse the ID after an ambiguous network failure; the server will not extract twice.
    requestId.current ||= sheet?.cleanupPending
      ? sheet.requestId
      : crypto.randomUUID();
    try {
      const response = await readApiPayload(
        await fetch(`/api/generations/${generation.id}/animation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate-sheet',
            taskId: task.id,
            requestId: requestId.current,
            replaceVersionId: sheet?.versionId,
            frameCount: sheet?.cleanupPending ? sheet.frame_count : count,
            frameSize: sheet?.cleanupPending ? sheet.frame_size : Number(size),
            fps: sheet?.cleanupPending ? sheet.fps : fps,
            loop: sheet?.cleanupPending ? sheet.loop : loop,
            sourceDuration: sheet?.cleanupPending
              ? sheet.source_duration
              : duration,
          }),
        })
      );
      onChange(response.data);
      requestId.current = null;
    } catch (reason) {
      setError(notify(reason));
    } finally {
      inFlight.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }
  const presets = [
    ...new Set([
      8,
      12,
      16,
      24,
      32,
      48,
      72,
      ...(sheet ? [sheet.frame_count] : []),
    ]),
  ]
    .filter((n) => n <= maxFrames)
    .sort((a, b) => a - b);
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-busy={disabled}>
      <div className="grid grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] items-start gap-4 max-[560px]:grid-cols-1">
        <div className="min-w-0">
          <div className="mb-3 flex h-8 items-center justify-between gap-2">
            <span className="text-sm font-semibold">{t('video')}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => setConfirm('video')}
            >
              {t('regenerateVideo')}
            </Button>
          </div>
          <div className="bg-secondary relative aspect-square overflow-hidden rounded-xl border">
            {generating ? (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center"
                role="status"
              >
                <LoaderCircle className="text-primary size-7 animate-spin" />
                <span className="text-sm">{t('generating')}</span>
                <span className="text-muted-foreground text-sm">
                  {t('elapsed', { seconds: elapsed })}
                </span>
                <span className="text-muted-foreground text-sm">
                  {t('waitHint')}
                </span>
              </div>
            ) : task?.video ? (
              <>
                <video
                  ref={video}
                  src={task.video.url}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 h-full w-full object-cover"
                  onLoadedMetadata={(event) =>
                    setDuration(event.currentTarget.duration)
                  }
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onError={() => setError(t('videoError'))}
                />
                {duration > 0 && (
                  <span className="pointer-events-none absolute top-2 left-2 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
                    {t('videoFrameCount', { count: maxFrames })}
                  </span>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2"
                  disabled={disabled}
                  aria-label={playing ? t('pause') : t('play')}
                  onClick={() => {
                    if (!video.current) return;
                    if (video.current.paused)
                      void video.current
                        .play()
                        .catch(() => setError(t('videoError')));
                    else video.current.pause();
                  }}
                >
                  {playing ? (
                    <Pause className="size-4" />
                  ) : (
                    <Play className="size-4" />
                  )}
                </Button>
              </>
            ) : (
              <div
                className="text-destructive absolute inset-0 flex items-center justify-center p-4 text-center text-sm"
                role="alert"
              >
                {failed ? t('generationFailed') : t('loading')}
              </div>
            )}
          </div>
        </div>
        <ArrowRight
          className="text-muted-foreground w-full translate-y-5 self-center max-[560px]:hidden"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <div className="mb-3 flex h-8 items-center text-sm font-semibold">
            {t('sheet')}
          </div>
          <div className="bg-secondary flex aspect-square flex-col overflow-hidden rounded-xl border">
            <div
              className={cn(
                'group relative min-h-0 flex-1 overflow-hidden',
                !sheet &&
                  'bg-transparent bg-[linear-gradient(45deg,rgba(255,255,255,.04)_25%,transparent_25%),linear-gradient(-45deg,rgba(255,255,255,.04)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(255,255,255,.04)_75%),linear-gradient(-45deg,transparent_75%,rgba(255,255,255,.04)_75%)] bg-[size:16px_16px]'
              )}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onFocusCapture={() => setHovered(true)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  setHovered(false);
              }}
            >
              {sheet && sheetReady ? (
                <>
                  {hovered ? (
                    <img
                      src={sheet.url}
                      alt={t('sheet')}
                      className="h-full w-full object-contain [image-rendering:pixelated]"
                    />
                  ) : (
                    <div
                      role="img"
                      aria-label={t('animation')}
                      className="absolute top-1/2 left-1/2 aspect-square h-full max-w-full -translate-x-1/2 -translate-y-1/2 [image-rendering:pixelated]"
                      style={{
                        backgroundImage: `url("${sheet.url}")`,
                        backgroundSize: `${sheet.columns * 100}% ${sheet.rows * 100}%`,
                        backgroundPosition: `${sheet.columns === 1 ? 0 : ((frame % sheet.columns) / (sheet.columns - 1)) * 100}% ${sheet.rows === 1 ? 0 : (Math.floor(frame / sheet.columns) / (sheet.rows - 1)) * 100}%`,
                      }}
                    />
                  )}
                  <Button
                    asChild
                    className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100"
                  >
                    <Link
                      href={`/editor/animations/${sheet.versionId}`}
                      aria-disabled={disabled}
                      tabIndex={disabled ? -1 : 0}
                      onClick={(e) => {
                        if (disabled) e.preventDefault();
                      }}
                    >
                      {t('edit')}
                    </Link>
                  </Button>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      disabled={disabled}
                      aria-label={t('viewLarge')}
                      onClick={() => setLarge(true)}
                    >
                      <Expand className="size-4" />
                    </Button>
                    <Button asChild size="icon" variant="secondary">
                      <a
                        aria-label={t('download')}
                        href={`/api/files/${sheet.fileId}?download=1`}
                        download
                        aria-disabled={disabled}
                        tabIndex={disabled ? -1 : 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (disabled) e.preventDefault();
                        }}
                      >
                        <Download className="size-4" />
                      </a>
                    </Button>
                  </div>
                </>
              ) : sheet ? (
                <div
                  className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-sm"
                  role={sheetLoadFailed ? 'alert' : 'status'}
                >
                  {sheetLoadFailed ? (
                    <>
                      <span>{preview('error')}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        onClick={() =>
                          setSheetLoadAttempt((value) => value + 1)
                        }
                      >
                        {preview('retry')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <LoaderCircle className="text-primary size-7 animate-spin" />
                      <span>{preview('loading')}</span>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground absolute inset-0 flex items-center justify-center p-4 text-center text-sm">
                  {t('sheetEmpty')}
                </div>
              )}
              {busy && (
                <div
                  className="bg-background/85 absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center"
                  role="status"
                >
                  <LoaderCircle className="text-primary size-7 animate-spin" />
                  <span className="text-sm">{t('extracting')}</span>
                </div>
              )}
            </div>
            {sheet && (
              <div className="shrink-0 px-2 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={disabled || !sheetReady}
                      aria-label={editor('previousFrame')}
                      onClick={() => {
                        setSheetPlaying(false);
                        setFrame(
                          (current) =>
                            (current + sheet.frame_count - 1) %
                            sheet.frame_count
                        );
                      }}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={disabled || !sheetReady}
                      aria-label={
                        sheetReady && sheetPlaying ? t('pause') : t('play')
                      }
                      onClick={() => {
                        if (
                          !sheetPlaying &&
                          !sheet.loop &&
                          frame === sheet.frame_count - 1
                        )
                          setFrame(0);
                        setSheetPlaying(!sheetPlaying);
                      }}
                    >
                      {sheetReady && sheetPlaying ? (
                        <Pause className="size-4" />
                      ) : (
                        <Play className="size-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={disabled || !sheetReady}
                      aria-label={editor('nextFrame')}
                      onClick={() => {
                        setSheetPlaying(false);
                        setFrame(
                          (current) => (current + 1) % sheet.frame_count
                        );
                      }}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                  <span className="text-muted-foreground font-mono text-xs">
                    {editor('frameStatus', {
                      current: sheetReady ? frame + 1 : 1,
                      total: sheet.frame_count,
                    })}
                  </span>
                </div>
                <label className="text-muted-foreground flex items-center gap-2 text-xs">
                  <span>{t('fps')}</span>
                  <input
                    type="range"
                    min={1}
                    max={60}
                    step={1}
                    value={fps}
                    disabled={disabled || !sheetReady}
                    onChange={(event) => {
                      setFps(Number(event.target.value));
                      requestId.current = null;
                    }}
                    className="accent-primary h-4 min-w-0 flex-1 cursor-pointer"
                  />
                  <span className="w-6 text-right font-mono">{fps}</span>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
      <fieldset
        disabled={disabled || !task?.video}
        className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 disabled:opacity-60"
      >
        <DropdownMenu
          open={framesOpen}
          onOpenChange={(open) => {
            setFramesOpen(open);
            if (open) {
              setCustomFrames(
                String(frameMode === 'auto' ? Math.min(24, maxFrames) : count)
              );
              setCustomFrameInvalid(false);
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t('frames')}
              disabled={disabled || !task?.video || maxFrames < 2}
              className={cn(
                optionTriggerClass,
                'inline-flex h-9 items-center disabled:opacity-50'
              )}
            >
              <span className="text-muted-foreground shrink-0 pr-1 font-normal">
                {t('frames')}
              </span>
              <span className="text-foreground font-medium">
                {frameMode === 'auto' ? t('auto') : frameMode}
              </span>
              <ChevronDown className="size-3.5 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="border-primary/30 w-[150px] min-w-0"
            onKeyDownCapture={(event) => {
              if (
                event.key === 'Tab' &&
                event.target !== customFrameInput.current &&
                event.target !== customFrameConfirm.current
              ) {
                event.preventDefault();
                event.stopPropagation();
                customFrameInput.current?.focus();
              }
            }}
          >
            <DropdownMenuRadioGroup
              value={frameMode}
              onValueChange={(value) => {
                setFrameMode(value);
                requestId.current = null;
              }}
            >
              <DropdownMenuRadioItem value="auto">
                {t('auto')}
              </DropdownMenuRadioItem>
              {presets.map((n) => (
                <DropdownMenuRadioItem key={n} value={String(n)}>
                  {n}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
              {t('custom')}
            </DropdownMenuLabel>
            <div className="flex items-center gap-2 px-2 pb-2">
              <Input
                ref={customFrameInput}
                type="number"
                inputMode="numeric"
                aria-label={t('customFrames')}
                aria-invalid={customFrameInvalid}
                min={2}
                max={maxFrames}
                step={1}
                className={cn(
                  'h-8 w-[84px] min-w-0 shrink-0',
                  customFrameInvalid &&
                    'border-destructive! ring-destructive/25! ring-2'
                )}
                value={customFrames}
                onChange={(event) => {
                  const next = event.target.value;
                  if (Number(next) > maxFrames) {
                    setCustomFrames(String(maxFrames));
                    flashFrameError();
                  } else setCustomFrames(next);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') return;
                  event.stopPropagation();
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    confirmCustomFrames();
                  }
                  if (event.key === 'Tab') {
                    event.preventDefault();
                    customFrameConfirm.current?.focus();
                  }
                }}
              />
              <Button
                ref={customFrameConfirm}
                type="button"
                size="icon"
                className="size-8 shrink-0"
                aria-label={t('confirm')}
                onClick={confirmCustomFrames}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') return;
                  event.stopPropagation();
                  if (event.key === 'Tab') {
                    event.preventDefault();
                    customFrameInput.current?.focus();
                  }
                }}
              >
                <Check className="size-4" />
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <Select
          value={size}
          onValueChange={(value) => {
            setSize(value);
            requestId.current = null;
          }}
          disabled={disabled || !task?.video}
        >
          <SelectTrigger
            className={optionTriggerClass}
            size="sm"
            aria-label={t('size')}
          >
            <span className="text-muted-foreground shrink-0 pr-1 font-normal">
              {t('size')}
            </span>
            <SelectValue>
              <span className="text-foreground font-medium">
                {size}×{size}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {[64, 128, 256, 512].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}×{n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={loop}
            onChange={(e) => {
              setLoop(e.target.checked);
              requestId.current = null;
            }}
          />
          {t('loop')}
        </label>
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            disabled={disabled || (!valid && !sheet?.cleanupPending)}
            onClick={() =>
              sheet && !sheet.cleanupPending
                ? setConfirm('sheet')
                : void generateSheet()
            }
          >
            {sheet?.cleanupPending
              ? t('retryCleanup')
              : sheet
                ? t('regenerateSheet')
                : t('generateSheet')}
          </Button>
        </div>
      </fieldset>
      {(error || sheet?.cleanupPending) && (
        <p className="text-destructive text-sm" role="alert">
          {error || t('cleanupPending')}
        </p>
      )}
      <Dialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogTitle>
            {confirm === 'video' ? t('regenerateVideo') : t('regenerateSheet')}
          </DialogTitle>
          <DialogDescription>
            {confirm === 'video' ? t('resetConfirm') : t('replaceConfirm')}
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirm(null)}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => {
                const action = confirm;
                setConfirm(null);
                if (action === 'video') onReset();
                else void generateSheet();
              }}
            >
              {t('confirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={large} onOpenChange={setLarge}>
        <DialogContent className="sm:max-w-4xl">
          <DialogTitle>{t('sheet')}</DialogTitle>
          {sheet && large && (
            <SheetImagePreview
              key={sheet.url}
              src={sheet.url}
              alt={t('sheet')}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SheetImagePreview({ src, alt }: { src: string; alt: string }) {
  const t = useTranslations('workspace.pixelRepair');
  const [zoom, setZoom] = useState(1);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const [panning, setPanning] = useState(false);
  const pan = useRef<{
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);

  useEffect(() => {
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewportSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [viewport]);

  const fitScale =
    imageSize.width && imageSize.height
      ? Math.min(
          Math.max(1, viewportSize.width - 32) / imageSize.width,
          Math.max(1, viewportSize.height - 32) / imageSize.height
        )
      : 0;
  const width = imageSize.width * fitScale * zoom;
  const height = imageSize.height * fitScale * zoom;
  const canPan =
    width + 32 > viewportSize.width + 1 ||
    height + 32 > viewportSize.height + 1;

  useEffect(() => {
    if (!viewport) return;
    viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
    viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) / 2;
  }, [viewport, width, height]);

  return (
    <div className="bg-secondary/45 relative h-[65vh] min-h-48 overflow-hidden rounded-lg border">
      <div
        ref={setViewport}
        className={cn(
          'size-full overflow-auto',
          canPan && 'touch-none select-none',
          canPan && (panning ? 'cursor-grabbing' : 'cursor-grab')
        )}
        onPointerDown={(event) => {
          if (!canPan || event.button !== 0 || !event.isPrimary) return;
          event.preventDefault();
          pan.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            left: event.currentTarget.scrollLeft,
            top: event.currentTarget.scrollTop,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          setPanning(true);
        }}
        onPointerMove={(event) => {
          const start = pan.current;
          if (!start || start.id !== event.pointerId) return;
          event.currentTarget.scrollLeft =
            start.left - (event.clientX - start.x);
          event.currentTarget.scrollTop = start.top - (event.clientY - start.y);
        }}
        onPointerUp={(event) => {
          if (pan.current?.id !== event.pointerId) return;
          pan.current = null;
          setPanning(false);
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          pan.current = null;
          setPanning(false);
        }}
        onLostPointerCapture={() => {
          pan.current = null;
          setPanning(false);
        }}
      >
        <div
          className="flex min-h-full min-w-full items-center justify-center p-4"
          style={{
            width: Math.max(viewportSize.width, width + 32),
            height: Math.max(viewportSize.height, height + 32),
          }}
        >
          <img
            src={src}
            alt={alt}
            draggable={false}
            onLoad={(event) =>
              setImageSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
            className="block max-w-none shrink-0 [image-rendering:pixelated]"
            style={{
              width: width || undefined,
              height: height || undefined,
              visibility: width ? 'visible' : 'hidden',
            }}
          />
        </div>
      </div>
      <div
        className="bg-background/90 absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-lg border p-1 shadow-md backdrop-blur-sm"
        role="group"
        aria-label={t('zoom')}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t('zoomOut')}
          title={t('zoomOut')}
          disabled={zoom <= 0.5}
          onClick={() => setZoom((value) => Math.max(0.5, value / 1.5))}
        >
          <Minus className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t('resetZoom')}
          title={t('resetZoom')}
          onClick={() => setZoom(1)}
        >
          <RotateCcw className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t('zoomIn')}
          title={t('zoomIn')}
          disabled={zoom >= 8}
          onClick={() => setZoom((value) => Math.min(8, value * 1.5))}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
