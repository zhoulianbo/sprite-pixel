'use client';

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  ArrowUpRight,
  ChevronsLeftRight,
  CircleCheck,
  Download,
  FileArchive,
  HardDrive,
  Image as ImageIcon,
  ImagePlus,
  Infinity,
  Play,
  UserRoundCheck,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import { BACKGROUND_MODEL_CACHE } from '@/config/tools/background-model';
import {
  BACKGROUND_BATCH_LIMIT,
  BACKGROUND_LIMIT,
} from '@/config/tools/free-tools';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  BackgroundClient,
  type ModelProgress,
} from '@/shared/lib/sprite-tools/background-client';
import {
  download,
  encodeFramesGif,
  frameEntries,
  readGif,
  readImages,
  zipFiles,
} from '@/shared/lib/sprite-tools/browser';
import type { Frame } from '@/shared/lib/sprite-tools/core';
import { cn } from '@/shared/lib/utils';

import { BlobImage, useBlobUrl, ZoomControls } from './previews';

const checker =
  'bg-[conic-gradient(var(--color-secondary)_25%,transparent_0_50%,var(--color-secondary)_0_75%,transparent_0)] bg-[length:16px_16px]';
const lightChecker =
  'bg-[conic-gradient(#d4d4d4_25%,#f7f7f7_0_50%,#d4d4d4_0_75%,#f7f7f7_0)] bg-[length:16px_16px]';
const PREVIEW_BACKGROUNDS = [
  { id: 'transparent', color: '' },
  { id: 'white', color: '#ffffff' },
  { id: 'blue', color: '#5aa2f0' },
  { id: 'green', color: '#5cbf7a' },
  { id: 'yellow', color: '#f0c94d' },
  { id: 'red', color: '#e25b5b' },
] as const;
type Item = {
  original: Frame;
  result?: Frame;
  status: 'waiting' | 'processing' | 'success' | 'failed';
  error?: string;
  cutKey?: string;
};
type PreviewTab = 'image' | 'animation';

function cutKey(threshold: number, hardEdge: boolean) {
  return `${threshold}:${hardEdge ? 'hard' : 'soft'}`;
}
function clampZoom(value: number) {
  return Math.min(8, Math.max(0.25, value));
}
function useStageSize() {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const measure = () =>
      setSize((current) =>
        current.width === node.clientWidth &&
        current.height === node.clientHeight
          ? current
          : { width: node.clientWidth, height: node.clientHeight }
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { box, size };
}
function fittedSize(
  frame: Frame | undefined,
  zoom: number,
  box: { width: number; height: number }
) {
  if (!frame || !box.width || !box.height) return { width: 0, height: 0 };
  const fit = Math.min(
    (box.width - 24) / frame.width,
    (box.height - 24) / frame.height
  );
  const scale = Math.max(0.05, fit * zoom);
  return {
    width: Math.max(1, Math.round(frame.width * scale)),
    height: Math.max(1, Math.round(frame.height * scale)),
  };
}
function backdropProps(background: string) {
  if (background === 'transparent')
    return { className: lightChecker, style: undefined };
  if (background)
    return { className: '', style: { backgroundColor: background } as const };
  return { className: '', style: undefined };
}
function StageSurface({
  background,
  children,
}: {
  background: string;
  children: ReactNode;
}) {
  const { box } = useStageSize();
  const backdrop = backdropProps(background);
  return (
    <div
      ref={box}
      className={cn('h-full min-h-80 overflow-auto', backdrop.className)}
      style={backdrop.style}
    >
      <div className="flex min-h-full min-w-full items-center justify-center p-3">
        {children}
      </div>
    </div>
  );
}
function FrameView({
  frame,
  zoom,
  background,
  alt,
  empty,
}: {
  frame?: Frame;
  zoom: number;
  background: string;
  alt: string;
  empty: string;
}) {
  const url = useBlobUrl(frame?.blob);
  const { box, size } = useStageSize();
  const fitted = fittedSize(frame, zoom, size);
  const backdrop = backdropProps(background);
  return (
    <div
      ref={box}
      className={cn('h-full min-h-80 overflow-auto', backdrop.className)}
      style={backdrop.style}
    >
      <div
        className="flex min-h-full min-w-full items-center justify-center p-3"
        style={
          fitted.width
            ? { width: fitted.width + 24, height: fitted.height + 24 }
            : undefined
        }
      >
        {url ? (
          <img
            src={url}
            alt={alt}
            width={fitted.width || frame?.width}
            height={fitted.height || frame?.height}
            className="max-w-none shrink-0 [image-rendering:pixelated]"
            style={{
              width: fitted.width || undefined,
              height: fitted.height || undefined,
            }}
          />
        ) : (
          <p className="text-muted-foreground text-sm">{empty}</p>
        )}
      </div>
    </div>
  );
}
function CutoutStage({
  before,
  after,
  zoom,
  background,
  originalLabel,
  resultLabel,
  compareLabel,
  empty,
}: {
  before?: Frame;
  after?: Frame;
  zoom: number;
  background: string;
  originalLabel: string;
  resultLabel: string;
  compareLabel: string;
  empty: string;
}) {
  const [split, setSplit] = useState(50);
  const beforeUrl = useBlobUrl(before?.blob);
  const afterUrl = useBlobUrl(after?.blob);
  const { box, size } = useStageSize();
  const fitted = fittedSize(before, zoom, size);
  const backdrop = backdropProps(background);
  const moveSplit = (clientX: number, bounds: DOMRect) => {
    if (!bounds.width) return;
    setSplit(
      Math.min(100, Math.max(0, ((clientX - bounds.left) / bounds.width) * 100))
    );
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!bounds) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    moveSplit(event.clientX, bounds);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
    if (bounds) moveSplit(event.clientX, bounds);
  };
  return (
    <div className="relative h-full min-h-80">
      <div
        ref={box}
        className={cn('h-full overflow-auto', backdrop.className)}
        style={backdrop.style}
      >
        <div
          className="flex min-h-full min-w-full items-center justify-center p-3"
          style={
            fitted.width
              ? { width: fitted.width + 24, height: fitted.height + 24 }
              : undefined
          }
        >
          {beforeUrl ? (
            <div
              className="relative max-w-none shrink-0"
              style={{
                width: fitted.width || undefined,
                height: fitted.height || undefined,
              }}
            >
              <img
                src={beforeUrl}
                alt={originalLabel}
                className="h-full w-full [image-rendering:pixelated]"
              />
              {afterUrl && (
                <div
                  className={cn(
                    'absolute inset-0',
                    background === 'transparent' && lightChecker
                  )}
                  style={{
                    clipPath: `inset(0 0 0 ${split}%)`,
                    backgroundColor:
                      background && background !== 'transparent'
                        ? background
                        : undefined,
                  }}
                >
                  <img
                    src={afterUrl}
                    alt={resultLabel}
                    className="h-full w-full [image-rendering:pixelated]"
                  />
                </div>
              )}
              {afterUrl && (
                <button
                  type="button"
                  role="slider"
                  aria-label={compareLabel}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(split)}
                  className="absolute inset-y-0 z-10 w-8 -translate-x-1/2 cursor-ew-resize touch-none"
                  style={{ left: `${split}%` }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowLeft')
                      setSplit((current) => Math.max(0, current - 4));
                    if (event.key === 'ArrowRight')
                      setSplit((current) => Math.min(100, current + 4));
                  }}
                >
                  <span className="bg-primary pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2" />
                  <span className="border-primary bg-background text-foreground pointer-events-none absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border">
                    <ChevronsLeftRight size={16} />
                  </span>
                </button>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{empty}</p>
          )}
        </div>
      </div>
      {beforeUrl && (
        <span className="bg-background/90 text-foreground pointer-events-none absolute top-3 left-3 z-10 rounded-full px-2.5 py-1 text-xs">
          {originalLabel}
        </span>
      )}
      {afterUrl && (
        <span className="bg-primary text-primary-foreground pointer-events-none absolute top-3 right-3 z-10 rounded-full px-2.5 py-1 text-xs">
          {resultLabel}
        </span>
      )}
    </div>
  );
}
function AnimationView({
  frames,
  zoom,
  background,
  empty,
  playLabel,
  pauseLabel,
}: {
  frames: Frame[];
  zoom: number;
  background: string;
  empty: string;
  playLabel: string;
  pauseLabel: string;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const safeIndex = Math.min(index, Math.max(0, frames.length - 1));
  const frame = frames[safeIndex];
  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const timer = window.setTimeout(
      () => setIndex((current) => (current + 1) % frames.length),
      frame?.duration || 100
    );
    return () => window.clearTimeout(timer);
  }, [playing, safeIndex, frame?.duration, frames.length]);
  if (!frame) {
    return (
      <StageSurface background={background}>
        <p className="text-muted-foreground text-sm">{empty}</p>
      </StageSurface>
    );
  }
  return (
    <div className="flex h-full min-h-80 flex-col">
      <div className="min-h-0 flex-1">
        <FrameView
          frame={frame}
          zoom={zoom}
          background={background}
          alt={frame.name}
          empty={empty}
        />
      </div>
      <div className="flex items-center gap-3 px-3 py-2">
        <Button
          type="button"
          variant="outline"
          className="h-8"
          onClick={() => setPlaying((current) => !current)}
        >
          {playing ? pauseLabel : playLabel}
        </Button>
        <span className="text-muted-foreground font-mono text-sm">
          {safeIndex + 1} / {frames.length}
        </span>
      </div>
    </div>
  );
}

export function BackgroundWorkbench({ gif = false }: { gif?: boolean }) {
  const t = useTranslations('tools.sprites.ui.freeTools');
  const ui = useTranslations('tools.sprites.ui');
  const mediaErrors = useTranslations('tools.sprites.ui.errors');
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<ModelProgress>();
  const [count, setCount] = useState({ done: 0, total: 0 });
  const [error, setError] = useState('');
  const [cacheWarning, setCacheWarning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [modelPrompt, setModelPrompt] = useState(false);
  const [tab, setTab] = useState<PreviewTab>('image');
  const [zoom, setZoom] = useState(1);
  const [backgroundId, setBackgroundId] = useState('');
  const [customColor, setCustomColor] = useState('#f4f1ea');
  const [threshold, setThreshold] = useState(50);
  const [hardEdge, setHardEdge] = useState(true);
  const client = useRef<BackgroundClient | undefined>(undefined);
  const operation = useRef<AbortController | undefined>(undefined);
  const picker = useRef<HTMLInputElement>(null);
  const pendingOnly = useRef<number | undefined>(undefined);
  const followPreview = useRef(true);
  const listScroller = useRef<HTMLDivElement>(null);
  const cutOptions = useRef({ threshold: 50, hardEdge: true });
  cutOptions.current = { threshold, hardEdge };
  useEffect(
    () => () => {
      operation.current?.abort();
      client.current?.dispose();
    },
    []
  );
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (typeof caches === 'undefined') return;
        const response = await fetch('/api/tools/background-removal/model', {
          cache: 'no-store',
        });
        if (!response.ok) return;
        const resources: { modelUrl?: string } = await response.json();
        if (!resources.modelUrl) return;
        const url = new URL(resources.modelUrl, window.location.href).href;
        const cache = await caches.open(BACKGROUND_MODEL_CACHE);
        const hit = await cache.match(url);
        if (!cancelled && hit) setModelReady(true);
      } catch {
        // A missing cache only means the next run asks before downloading.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!followPreview.current) return;
    listScroller.current
      ?.querySelector('[data-processing="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [items]);
  const errorText = (e: unknown) => {
    const code = e instanceof Error ? e.message : '';
    if (mediaErrors.has(code)) return mediaErrors(code);
    return t(
      t.has(`errors.${code}`) ? `errors.${code}` : 'errors.PROCESSING_FAILED'
    );
  };
  const cancel = () => {
    operation.current?.abort();
    operation.current = undefined;
    setBusy(false);
    setStage(undefined);
    setItems((current) =>
      current.map((item) =>
        item.status === 'processing' ? { ...item, status: 'waiting' } : item
      )
    );
  };
  async function run(task: (signal: AbortSignal) => Promise<void>) {
    if (operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError('');
    setStage(undefined);
    try {
      await task(controller.signal);
    } catch (e) {
      if (!controller.signal.aborted) setError(errorText(e));
    } finally {
      if (operation.current === controller) {
        operation.current = undefined;
        setBusy(false);
        setStage(undefined);
      }
    }
  }
  async function importFiles(files: File[]) {
    if (!files.length || operation.current) return;
    if (
      gif
        ? files.length !== 1
        : files.length + items.length > BACKGROUND_BATCH_LIMIT
    ) {
      setError(t('errors.BATCH_LIMIT'));
      return;
    }
    if (files.some((f) => !f.size || f.size > BACKGROUND_LIMIT)) {
      setError(t('errors.FILE_TOO_LARGE'));
      return;
    }
    if (gif && items.length && !window.confirm(t('replaceConfirm'))) return;
    await run(async (signal) => {
      setStage({ phase: 'decoding', loaded: 0, total: 0 });
      const frames: Frame[] = [];
      if (gif)
        frames.push(
          ...(await readGif(files[0], signal, (done, total) =>
            setCount({ done, total })
          ))
        );
      else
        for (const file of files)
          frames.push(...(await readImages([file], [], signal, () => {})));
      signal.throwIfAborted();
      setItems((current) => [
        ...(gif ? [] : current),
        ...frames.map((original) => ({ original, status: 'waiting' as const })),
      ]);
      setSelected(gif ? 0 : items.length);
      setCount({ done: 0, total: frames.length });
      setTab('image');
    });
  }
  function chooseImage(index: number) {
    followPreview.current = false;
    setSelected(index);
  }
  async function process(only?: number) {
    const key = cutKey(threshold, hardEdge);
    const targets = items.flatMap((item, index) =>
      (
        only === undefined
          ? !item.result || item.cutKey !== key
          : only === index
      )
        ? [index]
        : []
    );
    if (!targets.length) return;
    followPreview.current = true;
    setBackgroundId((current) => current || 'transparent');
    await run(async (signal) => {
      client.current ||= new BackgroundClient((progress) => {
        if (progress.phase === 'cacheUnavailable') {
          setCacheWarning(true);
          setModelReady(false);
        } else if (progress.phase === 'cached') setModelReady(true);
        else if (progress.phase === 'downloading') setModelReady(false);
        if (progress.phase !== 'cacheUnavailable') setStage(progress);
      });
      setCount({ done: 0, total: targets.length });
      for (let step = 0; step < targets.length; step++) {
        const index = targets[step];
        signal.throwIfAborted();
        setItems((current) =>
          current.map((item, n) =>
            n === index
              ? { ...item, status: 'processing', error: undefined }
              : item
          )
        );
        const live = { ...cutOptions.current };
        const usedKey = cutKey(live.threshold, live.hardEdge);
        try {
          const original = items[index].original;
          const blob = await client.current.remove(original.blob, signal, {
            threshold: live.threshold / 100,
            hardEdge: live.hardEdge,
          });
          signal.throwIfAborted();
          const result = {
            ...original,
            id: crypto.randomUUID(),
            name: `${original.name.replace(/\.[^.]+$/, '')}.png`,
            blob,
          };
          if (followPreview.current) setSelected(index);
          setItems((current) =>
            current.map((item, n) =>
              n === index
                ? { ...item, result, status: 'success', cutKey: usedKey }
                : item
            )
          );
        } catch (e) {
          signal.throwIfAborted();
          setItems((current) =>
            current.map((item, n) =>
              n === index
                ? { ...item, status: 'failed', error: errorText(e) }
                : item
            )
          );
          if (
            e instanceof Error &&
            [
              'MODEL_DOWNLOAD_FAILED',
              'MODEL_INVALID',
              'MODEL_INITIALIZATION_FAILED',
              'BROWSER_UNSUPPORTED',
            ].includes(e.message)
          ) {
            if (e.message === 'MODEL_INVALID') setModelReady(false);
            throw e;
          }
        }
        setCount({ done: step + 1, total: targets.length });
      }
    });
  }
  function requestExecute(only?: number) {
    pendingOnly.current = only;
    if (modelReady) void process(only);
    else setModelPrompt(true);
  }
  function save(format: 'zip' | 'gif') {
    const frames = items.flatMap((item) => (item.result ? [item.result] : []));
    if (!frames.length || (gif && frames.length !== items.length)) return;
    void run(async (signal) => {
      setStage({ phase: 'exporting', loaded: 0, total: 0 });
      const progress = (done: number, total: number) =>
        setCount({ done, total });
      const blob =
        format === 'zip'
          ? await zipFiles(frameEntries(frames), signal, progress)
          : await encodeFramesGif(
              frames,
              { align: 'top-left', background: '', fps: null },
              signal,
              progress
            );
      signal.throwIfAborted();
      download(
        blob,
        format === 'zip'
          ? 'transparent-frames.zip'
          : 'transparent-animation.gif'
      );
    });
  }
  function clearAll() {
    setItems([]);
    setSelected(0);
    setError('');
    setZoom(1);
    setTab('image');
    setBackgroundId('');
  }
  function removeItem(index: number) {
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
    setSelected((current) => (index < current ? current - 1 : current));
  }
  const completed = items.filter((item) => item.result).length;
  const settled = items.filter(
    (item) => item.status === 'success' || item.status === 'failed'
  ).length;
  const processingIndex = items.findIndex(
    (item) => item.status === 'processing'
  );
  const activeCutKey = cutKey(threshold, hardEdge);
  const needsRun = items.some(
    (item) => !item.result || item.cutKey !== activeCutKey
  );
  const selectedIndex = Math.min(selected, Math.max(0, items.length - 1));
  const active = items[selectedIndex];
  const zipReady = completed > 0 && (!gif || completed === items.length);
  const gifReady = gif && completed > 0 && completed === items.length;
  const backgroundColor =
    backgroundId === 'custom'
      ? customColor
      : backgroundId === 'transparent'
        ? 'transparent'
        : (PREVIEW_BACKGROUNDS.find((item) => item.id === backgroundId)
            ?.color ?? '');
  const animationFrames = items.flatMap((item) =>
    item.result ? [item.result] : []
  );
  const promises = [
    { icon: Infinity, label: ui('promiseForever') },
    { icon: UserRoundCheck, label: ui('promiseNoAccount') },
    { icon: HardDrive, label: ui('promiseLocal') },
    { icon: FileArchive, label: ui('promiseFormats') },
  ];
  const fileInput = (
    <input
      ref={picker}
      type="file"
      multiple={!gif}
      accept={gif ? 'image/gif,.gif' : 'image/png,image/jpeg,image/webp'}
      className="sr-only"
      aria-label={t(gif ? 'chooseGif' : 'chooseImages')}
      disabled={busy}
      onChange={(event) => {
        void importFiles(Array.from(event.target.files || []));
        event.target.value = '';
      }}
    />
  );
  const dropHandlers = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      if (!busy) setDragging(true);
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (
        !(event.relatedTarget instanceof Node) ||
        !event.currentTarget.contains(event.relatedTarget)
      )
        setDragging(false);
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setDragging(false);
      if (!busy) void importFiles(Array.from(event.dataTransfer.files));
    },
  };
  const modelDialog = (
    <Dialog open={modelPrompt} onOpenChange={setModelPrompt}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('modelDialogTitle')}</DialogTitle>
          <DialogDescription>{t('modelDialogBody')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setModelPrompt(false)}>
            {t('cancel')}
          </Button>
          <Button
            onClick={() => {
              setModelPrompt(false);
              void process(pendingOnly.current);
            }}
          >
            {t('modelDialogConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  if (!items.length) {
    return (
      <div id="workbench" className="scroll-mt-24">
        {fileInput}
        {modelDialog}
        <section className="mx-auto max-w-[1100px]">
          <div className="border-border bg-card/90 relative border p-4 shadow-[0_40px_120px_-64px_#35c2ff55] sm:p-7">
            <span
              className="bg-primary absolute -top-px -left-px h-6 w-px"
              aria-hidden="true"
            />
            <span
              className="bg-primary absolute -top-px -left-px h-px w-6"
              aria-hidden="true"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => picker.current?.click()}
              {...dropHandlers}
              className={cn(
                'group focus-visible:outline-ring flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-5 py-9 text-center transition-[background-color,border-color,transform] duration-200 focus-visible:outline-2 active:translate-y-px',
                dragging
                  ? 'border-primary bg-primary/10'
                  : 'border-muted-foreground/40 bg-vault-navy/50 hover:border-primary/70 hover:bg-primary/5'
              )}
            >
              <span className="border-primary/20 bg-primary/5 text-primary group-hover:bg-primary/10 mb-5 flex h-16 w-16 items-center justify-center rounded-lg border transition-colors">
                <ImagePlus size={29} strokeWidth={1.5} />
              </span>
              <span className="text-base font-medium sm:text-lg">
                {t(gif ? 'chooseGif' : 'chooseImages')}
              </span>
              <span className="text-muted-foreground mt-6 font-mono text-[11px]">
                {t(gif ? 'gifLimits' : 'imageLimits')}
              </span>
            </button>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-1.5 text-sm leading-none">
              <span className="text-muted-foreground">{ui('noFiles')}</span>
              <Link
                href="/"
                className="text-foreground decoration-primary/50 hover:text-primary inline-flex items-center gap-1 underline underline-offset-4 transition-colors"
              >
                {ui('generateAssets')}
                <ArrowUpRight size={15} />
              </Link>
            </div>
            {busy && (
              <p role="status" className="mt-4 text-sm">
                {stage ? t(`model.${stage.phase}`) : t('processing')}
              </p>
            )}
            {error && (
              <p role="alert" className="text-destructive mt-3 text-sm">
                {error}
              </p>
            )}
          </div>
          <ul
            aria-label={ui('promisesLabel')}
            className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
          >
            {promises.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="text-muted-foreground flex items-center gap-1.5 text-sm"
              >
                <Icon
                  size={14}
                  strokeWidth={1.5}
                  className="shrink-0"
                  aria-hidden="true"
                />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }
  return (
    <div id="workbench" className="scroll-mt-24">
      {fileInput}
      {modelDialog}
      <section
        aria-label={t('images')}
        className="border-border bg-card border text-left shadow-[0_28px_80px_-40px_var(--color-background)]"
      >
        <div className="grid min-w-0 lg:h-[min(700px,calc(100svh-120px))] lg:min-h-[560px] lg:grid-cols-[220px_minmax(0,1fr)_240px]">
          <aside
            aria-label={t('images')}
            className="border-border order-2 flex min-h-0 min-w-0 flex-col border-t lg:order-1 lg:border-t-0 lg:border-r"
          >
            {!gif && items.length < BACKGROUND_BATCH_LIMIT && (
              <div className="p-2">
                <button
                  type="button"
                  {...dropHandlers}
                  disabled={busy}
                  onClick={() => picker.current?.click()}
                  className={cn(
                    'focus-visible:outline-ring flex min-h-16 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-2 py-2 text-left text-sm transition-colors focus-visible:outline-2',
                    dragging
                      ? 'border-accent-foreground/30! bg-accent-foreground/15 text-accent-foreground'
                      : 'border-accent-foreground/30! bg-accent/40 text-accent-foreground hover:bg-accent-foreground/15 hover:border-accent-foreground/80!'
                  )}
                >
                  <ImagePlus size={16} className="shrink-0" />
                  <span>{t('addImages')}</span>
                </button>
              </div>
            )}
            <div
              className={cn(
                'flex items-center justify-between px-2 pb-2',
                (gif || items.length >= BACKGROUND_BATCH_LIMIT) && 'pt-2'
              )}
            >
              <h2 className="text-muted-foreground text-xs font-semibold tracking-wider">
                {t('images')}{' '}
                <span className="text-foreground ml-1 font-mono">
                  {items.length}
                </span>
              </h2>
            </div>
            <div
              ref={listScroller}
              className="min-h-0 flex-1 overflow-y-auto px-2 pb-2"
            >
              <div className="flex flex-col gap-1">
                {items.map((item, index) => (
                  <div
                    key={item.original.id}
                    data-processing={
                      item.status === 'processing' ? 'true' : undefined
                    }
                    className={cn(
                      'flex min-w-0 items-stretch overflow-hidden rounded-lg border',
                      index === selectedIndex
                        ? 'border-accent-foreground/60 bg-accent/50'
                        : 'border-border bg-background/30'
                    )}
                  >
                    <button
                      type="button"
                      aria-pressed={index === selectedIndex}
                      onClick={() => chooseImage(index)}
                      className="focus-visible:outline-ring flex min-w-0 flex-1 items-center gap-1.5 px-1.5 py-2 text-left focus-visible:outline-2"
                    >
                      <span
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center',
                          checker
                        )}
                      >
                        <BlobImage
                          frame={item.result || item.original}
                          className="max-h-full max-w-full object-contain"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          {String(index + 1).padStart(2, '0')} ·{' '}
                          {item.original.name}
                        </span>
                        <span className="text-muted-foreground mt-0.5 block text-xs leading-4 whitespace-nowrap">
                          {item.original.width} × {item.original.height}
                        </span>
                        <span
                          className={cn(
                            'block text-xs leading-4 whitespace-nowrap',
                            item.status === 'success' && 'text-[#7CFF8A]',
                            item.status === 'processing' && 'text-primary',
                            item.status === 'failed' && 'text-destructive',
                            item.status === 'waiting' && 'text-muted-foreground'
                          )}
                        >
                          {t(`status.${item.status}`)}
                        </span>
                        {item.status === 'processing' && (
                          <span
                            className="bg-secondary mt-1 block h-1 overflow-hidden rounded-full"
                            role="progressbar"
                            aria-label={t('status.processing')}
                          >
                            <span className="bg-primary block h-full w-2/5 animate-pulse" />
                          </span>
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={t('deleteImage')}
                      title={t('deleteImage')}
                      disabled={busy}
                      onClick={() => removeItem(index)}
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex w-8 shrink-0 items-center justify-center"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              {active?.error && (
                <p className="text-destructive mt-2 text-sm">{active.error}</p>
              )}
            </div>
          </aside>
          <div className="bg-vault-navy/35 order-1 flex h-[min(640px,75svh)] min-h-0 min-w-0 flex-col lg:order-2 lg:h-full">
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-2">
              <div
                className="border-border bg-background flex gap-0.5 border p-0.5"
                role="group"
                aria-label={t('images')}
              >
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    'h-8 min-h-8 rounded-md px-2.5 text-xs',
                    tab === 'image'
                      ? 'bg-accent text-accent-foreground hover:bg-accent'
                      : 'text-muted-foreground'
                  )}
                  aria-pressed={tab === 'image'}
                  onClick={() => setTab('image')}
                >
                  <ImageIcon size={15} />
                  {t('images')}
                </Button>
                {gif && (
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                      'h-8 min-h-8 rounded-md px-2.5 text-xs',
                      tab === 'animation'
                        ? 'bg-accent text-accent-foreground hover:bg-accent'
                        : 'text-muted-foreground'
                    )}
                    aria-pressed={tab === 'animation'}
                    onClick={() => setTab('animation')}
                  >
                    <Play size={15} />
                    {ui('animation')}
                  </Button>
                )}
              </div>
            </div>
            <div className="min-h-0 flex-1 p-2 pt-0">
              {tab === 'animation' ? (
                <AnimationView
                  frames={animationFrames}
                  zoom={zoom}
                  background={backgroundColor}
                  empty={t('notProcessed')}
                  playLabel={t('play')}
                  pauseLabel={t('pause')}
                />
              ) : (
                <CutoutStage
                  before={active?.original}
                  after={active?.result}
                  zoom={zoom}
                  background={backgroundColor}
                  originalLabel={t('viewOriginal')}
                  resultLabel={t('viewResult')}
                  compareLabel={t('compare')}
                  empty={t('notProcessed')}
                />
              )}
            </div>
            <div className="space-y-2 px-2 pb-2">
              <div className="flex justify-center">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!active?.result}
                  onClick={() =>
                    active?.result &&
                    download(active.result.blob, active.result.name)
                  }
                >
                  <Download size={14} />
                  {t('downloadCurrent')}
                </Button>
              </div>
              <div className="text-muted-foreground flex items-center justify-between gap-2 font-mono text-xs">
                <span>
                  {active
                    ? `${active.original.width} × ${active.original.height} px`
                    : ''}
                </span>
                <ZoomControls
                  scale={zoom}
                  onReset={() => setZoom(1)}
                  onZoomOut={() =>
                    setZoom((current) => clampZoom(current / 1.25))
                  }
                  onZoomIn={() =>
                    setZoom((current) => clampZoom(current * 1.25))
                  }
                />
              </div>
            </div>
          </div>
          <aside
            aria-label={t('backgroundSettings')}
            className="border-border order-3 flex min-h-0 min-w-0 flex-col border-t lg:border-t-0 lg:border-l"
          >
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-widest uppercase">
                {t('backgroundSettings')}
              </p>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label={t('backgroundSettings')}
              >
                {PREVIEW_BACKGROUNDS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={t(`backgrounds.${item.id}`)}
                    title={t(`backgrounds.${item.id}`)}
                    aria-pressed={backgroundId === item.id}
                    onClick={() => setBackgroundId(item.id)}
                    className={cn(
                      'size-8 rounded-md border',
                      backgroundId === item.id
                        ? 'border-primary ring-primary/40 ring-2'
                        : 'border-border',
                      !item.color && lightChecker
                    )}
                    style={
                      item.color ? { backgroundColor: item.color } : undefined
                    }
                  />
                ))}
                <label
                  title={t('backgrounds.custom')}
                  className={cn(
                    'relative size-8 rounded-md border',
                    backgroundId === 'custom'
                      ? 'border-primary ring-primary/40 ring-2'
                      : 'border-border bg-[conic-gradient(#e25b5b,#f0c94d,#5cbf7a,#5aa2f0,#e25b5b)]'
                  )}
                  style={
                    backgroundId === 'custom'
                      ? { backgroundColor: customColor }
                      : undefined
                  }
                >
                  <span className="sr-only">{t('backgrounds.custom')}</span>
                  <input
                    type="color"
                    aria-label={t('backgrounds.custom')}
                    value={customColor}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(event) => {
                      setCustomColor(event.target.value);
                      setBackgroundId('custom');
                    }}
                  />
                </label>
              </div>
              <div className="mt-5 space-y-3">
                <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                  {t('cutSettings')}
                </p>
                <label className="block text-sm">
                  <span className="mb-1 flex items-center justify-between gap-2">
                    <span>{t('cutStrength')}</span>
                    <span className="font-mono text-xs">{threshold}</span>
                  </span>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    step={1}
                    value={threshold}
                    aria-label={t('cutStrength')}
                    onChange={(event) =>
                      setThreshold(Number(event.target.value))
                    }
                    className="accent-primary h-2 w-full cursor-pointer"
                  />
                </label>
                <div>
                  <p className="mb-1 text-sm">{t('edge')}</p>
                  <div
                    className="grid grid-cols-2 gap-1"
                    role="group"
                    aria-label={t('edge')}
                  >
                    {[true, false].map((hard) => (
                      <button
                        key={hard ? 'hard' : 'soft'}
                        type="button"
                        aria-pressed={hardEdge === hard}
                        onClick={() => setHardEdge(hard)}
                        className={cn(
                          'h-8 rounded-md border text-sm',
                          hardEdge === hard
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border'
                        )}
                      >
                        {t(hard ? 'edgeHard' : 'edgeSoft')}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground text-sm">
                  {t('cutSettingsHelp')}
                </p>
              </div>
              <div className="mt-5 space-y-2">
                <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                  {ui('exportTitle')}
                </p>
                <Button
                  type="button"
                  className="w-full"
                  variant="outline"
                  disabled={!zipReady || busy}
                  onClick={() => save('zip')}
                >
                  {t('downloadZip', { count: completed })}
                </Button>
                {gif && (
                  <Button
                    type="button"
                    className="w-full"
                    variant="outline"
                    disabled={!gifReady || busy}
                    onClick={() => save('gif')}
                  >
                    {t('downloadGif')}
                  </Button>
                )}
                <Button
                  type="button"
                  className="w-full"
                  variant="outline"
                  disabled={busy}
                  onClick={clearAll}
                >
                  {t('clearAll')}
                </Button>
                {gif && (
                  <p className="text-muted-foreground text-sm">
                    {t('gifAlpha')}
                  </p>
                )}
              </div>
            </div>
            <div className="border-border bg-vault-navy/50 space-y-2 border-t p-2">
              {busy && (
                <div role="status" className="space-y-1 text-sm">
                  <p>{stage ? t(`model.${stage.phase}`) : t('processing')}</p>
                  {stage?.phase === 'downloading' ? (
                    <>
                      <progress
                        className="w-full"
                        value={stage.loaded}
                        max={stage.total}
                      />
                      <p>
                        {t('modelBytes', {
                          loaded: (stage.loaded / 1048576).toFixed(1),
                          total: (stage.total / 1048576).toFixed(1),
                          progress: Math.round(
                            (stage.loaded / stage.total) * 100
                          ),
                        })}
                      </p>
                    </>
                  ) : stage?.phase === 'exporting' ||
                    stage?.phase === 'decoding' ? (
                    <p>{t('batchProgress', count)}</p>
                  ) : (
                    <>
                      {processingIndex >= 0 && (
                        <p>
                          {t('processingFrame', {
                            index: processingIndex + 1,
                          })}
                        </p>
                      )}
                      <p>
                        {t('batchDone', {
                          done: settled,
                          total: items.length,
                        })}
                      </p>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={cancel}
                  >
                    {t('cancel')}
                  </Button>
                </div>
              )}
              {cacheWarning && (
                <p className="text-muted-foreground text-sm">
                  {t('model.cacheUnavailable')}
                </p>
              )}
              {error && (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              )}
              <p
                className={cn(
                  'flex items-center justify-center gap-1.5 text-sm',
                  modelReady ? 'text-[#7CFF8A]' : 'text-muted-foreground'
                )}
              >
                <CircleCheck size={16} aria-hidden="true" />
                {t(modelReady ? 'modelReady' : 'modelMissing')}
              </p>
              <Button
                type="button"
                className="h-10 w-full"
                disabled={busy || !needsRun}
                onClick={() => requestExecute()}
              >
                {t('execute')}
              </Button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
