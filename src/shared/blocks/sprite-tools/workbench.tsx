'use client';

import {
  ChangeEvent,
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import {
  ArrowUpRight,
  BoxSelect,
  CircleHelp,
  Download,
  FileArchive,
  Film,
  Grid2X2,
  HardDrive,
  ImagePlus,
  Images,
  Infinity,
  MoveHorizontal,
  MoveVertical,
  Play,
  Trash2,
  UserRoundCheck,
  WandSparkles,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createPortal } from 'react-dom';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  abortCheck,
  download,
  encodeFramesGif,
  exportAtlas,
  extractFrames,
  frameEntries,
  readGif,
  readImages,
  renderSheet,
  trimFrames,
  zipFiles,
} from '@/shared/lib/sprite-tools/browser';
import {
  ATLAS_FORMAT_LABELS,
  ATLAS_FORMATS,
  AtlasFormat,
  defaultMaker,
  defaultSlice,
  Frame,
  LIMITS,
  MakerOptions,
  naturalSort,
  packFrames,
  resolveSpriteSheetSlice,
  sliceGrid,
  SliceOptions,
  suggestMakerGridColumns,
  Tool,
} from '@/shared/lib/sprite-tools/core';
import { takeHandoff } from '@/shared/lib/sprite-tools/transfer';
import { cn } from '@/shared/lib/utils';

import {
  AnimationPreview,
  clampZoom,
  FrameStrip,
  SheetPreview,
  ZoomControls,
} from './previews';

function InlineNumber({
  label,
  value,
  onChange,
  min = 0,
  max = 8192,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span>{label}</span>
      <input
        className="border-input bg-background focus-visible:outline-ring h-7 w-14 rounded-md border px-1.5 text-right font-mono text-xs focus-visible:outline-2"
        type="number"
        min={min}
        max={max}
        step={1}
        value={Number.isNaN(value) ? '' : value}
        onChange={(event) =>
          onChange(event.target.value === '' ? NaN : Number(event.target.value))
        }
      />
    </label>
  );
}
function HintPopup({
  id,
  label,
  placement = 'above',
  children,
}: {
  id: string;
  label: string;
  placement?: 'above' | 'below';
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0, below: false });
  const box = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open || !box.current) return;
    const rect = box.current.getBoundingClientRect();
    const popupHeight = 180;
    const preferBelow = placement === 'below';
    const fitsBelow = rect.bottom + 8 + popupHeight <= window.innerHeight;
    const fitsAbove = rect.top - 8 - popupHeight >= 0;
    const below = preferBelow
      ? fitsBelow || !fitsAbove
      : !fitsAbove && fitsBelow;
    setCoords({
      top: below ? rect.bottom + 8 : rect.top - 8,
      right: Math.max(8, window.innerWidth - rect.right),
      below,
    });
  }, [open, placement]);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (box.current?.contains(target) || popup.current?.contains(target))
        return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="text-muted-foreground hover:text-accent-foreground flex h-5 w-5 items-center justify-center rounded-full"
      >
        <CircleHelp size={14} />
      </button>
      {open
        ? createPortal(
            <div
              ref={popup}
              id={id}
              role="region"
              aria-label={label}
              style={{
                top: coords.below ? coords.top : undefined,
                bottom: coords.below
                  ? undefined
                  : window.innerHeight - coords.top,
                right: coords.right,
              }}
              className="border-accent-foreground/25 bg-secondary text-muted-foreground fixed z-80 w-56 space-y-1.5 rounded-md border px-4 py-3.5 text-[11px] leading-relaxed shadow-[0_12px_40px_-8px_rgba(0,0,0,0.72),0_0_0_1px_rgba(53,194,255,0.14)]"
            >
              {children}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
function EngineImportHint() {
  const t = useTranslations('tools.sprites.ui');
  return (
    <HintPopup id="engine-import-hint" label={t('engineImport')}>
      <p>{t('engineImportGodot')}</p>
      <p>{t('engineImportPhaser')}</p>
      <p>{t('engineImportUnity')}</p>
    </HintPopup>
  );
}
function GridHint() {
  const t = useTranslations('tools.sprites.ui');
  return (
    <HintPopup id="slice-grid-hint" label={t('gridHelp')} placement="below">
      <p>{t('gridHelp')}</p>
    </HintPopup>
  );
}
function SelectionTabs({
  locked,
  count,
  selectedCount,
  onSelectAll,
  onSelectNone,
  rangeStart,
  rangeEnd,
  onApplyRange,
}: {
  locked: boolean;
  count: number;
  selectedCount: number;
  onSelectAll: () => void;
  onSelectNone: () => void;
  rangeStart: number;
  rangeEnd: number;
  onApplyRange: (start: number, end: number) => void;
}) {
  const t = useTranslations('tools.sprites.ui');
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(rangeStart);
  const [draftEnd, setDraftEnd] = useState(rangeEnd);
  const box = useRef<HTMLDivElement>(null);
  const check = useRef<HTMLInputElement>(null);
  const all = count > 0 && selectedCount === count;
  const none = selectedCount === 0;
  const openRange = () => {
    setDraftStart(rangeStart);
    setDraftEnd(rangeEnd);
    setOpen(true);
  };
  useEffect(() => {
    if (check.current) check.current.indeterminate = !all && !none;
  }, [all, none]);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const valid =
    Number.isInteger(draftStart) &&
    Number.isInteger(draftEnd) &&
    draftStart >= 1 &&
    draftEnd >= draftStart &&
    draftEnd <= Math.max(1, count);
  return (
    <div ref={box} className="relative px-2 pb-2">
      <div className="flex items-center justify-between gap-2">
        <label className="flex min-h-8 min-w-0 cursor-pointer items-center gap-2 text-[11px]">
          <input
            ref={check}
            type="checkbox"
            disabled={locked}
            checked={all}
            onChange={() => {
              setOpen(false);
              if (all) onSelectNone();
              else onSelectAll();
            }}
            className="accent-accent-foreground h-3.5 w-3.5 shrink-0"
          />
          <span>{t('selectAllNone')}</span>
        </label>
        <button
          type="button"
          aria-expanded={open}
          disabled={locked}
          onClick={openRange}
          className={cn(
            'flex h-8 shrink-0 items-center rounded-md border px-2.5 text-[10px] transition-colors',
            open
              ? 'border-accent-foreground/60 bg-accent text-accent-foreground'
              : 'border-border text-muted-foreground hover:text-foreground'
          )}
        >
          {t('rangeTab')}
        </button>
      </div>
      {open ? (
        <div className="border-accent-foreground/25 bg-secondary absolute inset-x-2 top-full z-30 mt-1 space-y-2 rounded-lg border p-2 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.72)]">
          <InlineNumber
            label={t('rangeStart')}
            value={draftStart}
            min={1}
            max={count}
            onChange={setDraftStart}
          />
          <InlineNumber
            label={t('rangeEnd')}
            value={draftEnd}
            min={1}
            max={count}
            onChange={setDraftEnd}
          />
          <Button
            variant="outline"
            className="h-8 min-h-8 w-full rounded-md text-xs"
            disabled={locked || !valid}
            onClick={() => {
              onApplyRange(draftStart, draftEnd);
              setOpen(false);
            }}
          >
            {t('applyRange')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
function RangeField({
  label,
  value,
  onChange,
  min = 0,
  max = 128,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const safe = Number.isFinite(value) ? value : min;
  return (
    <label className="block space-y-1 text-xs">
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <span className="text-muted-foreground font-mono">{safe}px</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={safe}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-primary h-4 w-full cursor-pointer"
      />
    </label>
  );
}
export function SpriteWorkbench({ tool }: { tool: Tool }) {
  const t = useTranslations('tools.sprites.ui');
  const maker = tool === 'maker';
  const [mode, setMode] = useState<'images' | 'gif'>('images');
  const [formats, setFormats] = useState<Record<AtlasFormat, boolean>>({
    jsonHash: true,
    jsonArray: false,
    css: false,
    xml: false,
    gif: false,
  });
  const [includeGif, setIncludeGif] = useState(false);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [trimmed, setTrimmed] = useState<Frame[]>([]);
  const trimCache = useRef(new Map<string, Frame>());
  const [sheet, setSheet] = useState<Frame>();
  const hasAssets = maker ? frames.length > 0 : !!sheet;
  const hadAssets = useRef(hasAssets);
  useEffect(() => {
    if (hadAssets.current === hasAssets) return;
    const appeared = !hadAssets.current && hasAssets;
    hadAssets.current = hasAssets;
    if (!appeared) return;
    const node = document.getElementById('workbench');
    if (!node) return;
    const header = document.querySelector('header');
    const offset = (header?.getBoundingClientRect().height ?? 72) + 16;
    const top = node.getBoundingClientRect().top;
    if (top >= offset && top < window.innerHeight * 0.8) return;
    window.scrollBy({ top: top - offset, behavior: 'instant' });
  }, [hasAssets]);
  const [options, setOptions] = useState<MakerOptions>(defaultMaker);
  const [slice, setSlice] = useState<SliceOptions>(defaultSlice);
  const [extracted, setExtracted] = useState<Frame[]>([]);
  const [rendered, setRendered] =
    useState<Awaited<ReturnType<typeof renderSheet>>>();
  const [renderedToken, setRenderedToken] = useState('');
  const [extractedToken, setExtractedToken] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [skipEmpty, setSkipEmpty] = useState(false);
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(1);
  const [gridVisible, setGridVisible] = useState(true);
  const [zoom, setZoom] = useState(0);
  const [fitScale, setFitScale] = useState(1);
  const [tab, setTab] = useState<'sheet' | 'animation'>('sheet');
  const [fps, setFps] = useState(12);
  const [originalTiming, setOriginalTiming] = useState(true);
  const [busy, setBusy] = useState(false);
  const [computing, setComputing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [computeError, setComputeError] = useState('');
  const [exported, setExported] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const operation = useRef<AbortController | null>(null);
  const computation = useRef<AbortController | null>(null);
  const anchor = useRef(0);
  const originals = useRef<{ frames: Frame[]; signature: string } | undefined>(
    undefined
  );
  const extractState = useRef({
    count: 0,
    selectedSize: 0,
    filledCount: 0,
  });
  const mounted = useRef(true);
  const makerColumnsTouched = useRef(false);
  const message = useCallback(
    (error: unknown) => {
      const key = error instanceof Error ? error.message : '';
      return t.has(`errors.${key}`)
        ? t(`errors.${key}`)
        : t('errors.invalidImage');
    },
    [t]
  );
  const reportProgress = useCallback(
    (done: number, total: number) =>
      setProgress(t('progress', { done, total })),
    [t]
  );
  useEffect(() => {
    mounted.current = true;
    const handoff = takeHandoff(tool);
    if (handoff) {
      if (maker) {
        setFrames(handoff.frames);
        if (handoff.frames.length > 0) {
          makerColumnsTouched.current = false;
          setOptions((current) => ({
            ...current,
            columns: suggestMakerGridColumns(handoff.frames.length),
          }));
        }
      }
      else if (handoff.sheet && handoff.slice) {
        originals.current = {
          frames: handoff.frames,
          signature: JSON.stringify(
            sliceGrid(handoff.sheet, handoff.slice).rects
          ),
        };
        setSheet(handoff.sheet);
        setSlice(handoff.slice);
      }
    }
    return () => {
      mounted.current = false;
      operation.current?.abort();
      computation.current?.abort();
    };
  }, [tool, maker]);
  const run = async (task: (signal: AbortSignal) => Promise<void>) => {
    if (operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError('');
    setProgress(t('processing'));
    setExported(false);
    try {
      await task(controller.signal);
    } catch (error) {
      if (mounted.current && !controller.signal.aborted)
        setError(message(error));
    } finally {
      if (operation.current === controller) operation.current = null;
      if (mounted.current) {
        setBusy(false);
        setProgress(controller.signal.aborted ? t('cancelled') : '');
      }
    }
  };
  useEffect(() => {
    const ids = new Set(frames.map((frame) => frame.id));
    for (const id of [...trimCache.current.keys()]) {
      if (!ids.has(id)) trimCache.current.delete(id);
    }
    if (!maker || !options.trim || !frames.length) {
      setTrimmed([]);
      return;
    }
    const controller = new AbortController();
    void trimFrames(frames, trimCache.current, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setTrimmed(next);
      })
      .catch((error) => {
        if (
          !controller.signal.aborted &&
          !(error instanceof DOMException && error.name === 'AbortError')
        )
          setError(message(error));
      });
    return () => controller.abort();
  }, [maker, options.trim, frames, message]);
  const packSource = useMemo(() => {
    if (!maker || !options.trim) return frames;
    const byId = new Map(trimmed.map((frame) => [frame.id, frame]));
    if (frames.some((frame) => !byId.has(frame.id))) return frames;
    return frames.map((frame) => byId.get(frame.id)!);
  }, [maker, options.trim, frames, trimmed]);
  const trimReady =
    !maker ||
    !options.trim ||
    (trimmed.length === frames.length &&
      frames.every((frame) => trimmed.some((item) => item.id === frame.id)));
  useEffect(() => {
    const controller = new AbortController();
    computation.current = controller;
    setComputeError('');
    setExported(false);
    if (maker ? !frames.length : !sheet) {
      setComputing(false);
      setRendered(undefined);
      setRenderedToken('');
      setExtracted([]);
      setExtractedToken('');
      return;
    }
    const onProgress = () => {};
    const delay = maker ? 160 : 180;
    const timer = window.setTimeout(() => {
      if (!maker) setComputing(true);
      const task = async () => {
        if (maker) {
          const value = await renderSheet(
            packSource,
            options,
            controller.signal,
            onProgress
          );
          if (!controller.signal.aborted) {
            setRendered(value);
            setRenderedToken(
              `${packSource.map((frame) => `${frame.id}:${frame.width}x${frame.height}`).join('|')}|${JSON.stringify(options)}`
            );
          }
        } else if (sheet) {
          const grid = sliceGrid(sheet, slice);
          const original =
            originals.current?.signature === JSON.stringify(grid.rects)
              ? originals.current.frames
              : undefined;
          const value = await extractFrames(
            sheet,
            grid.rects,
            controller.signal,
            onProgress,
            original
          );
          if (!controller.signal.aborted) {
            const { count, selectedSize, filledCount } = extractState.current;
            const wasAll = count > 0 && selectedSize === count;
            const wasFilled = count > 0 && selectedSize === filledCount;
            const filled = new Set(
              value.flatMap((frame, index) => (frame.empty ? [] : [index]))
            );
            setExtracted(value);
            setExtractedToken(`${sheet.id}|${JSON.stringify(slice)}`);
            if (count === 0 || wasFilled) setSelected(filled);
            else if (wasAll)
              setSelected(new Set(value.map((_, index) => index)));
            else
              setSelected((current) => {
                const valid = new Set(
                  [...current].filter((index) => index < value.length)
                );
                return valid.size ? valid : filled;
              });
            if (count === 0) {
              setRangeStart(1);
              setRangeEnd(value.length);
            } else {
              setRangeStart((start) =>
                Math.min(
                  Math.max(1, Number.isFinite(start) ? start : 1),
                  Math.max(1, value.length)
                )
              );
              setRangeEnd((end) =>
                Math.min(
                  Math.max(1, Number.isFinite(end) ? end : value.length),
                  Math.max(1, value.length)
                )
              );
            }
          }
        }
      };
      task()
        .catch((error) => {
          if (!controller.signal.aborted) setComputeError(message(error));
        })
        .finally(() => {
          if (!controller.signal.aborted) setComputing(false);
        });
    }, delay);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [maker, packSource, options, sheet, slice, frames.length, message]);
  const grid = useMemo(() => {
    try {
      return sheet ? sliceGrid(sheet, slice) : undefined;
    } catch {
      return undefined;
    }
  }, [sheet, slice]);
  const displayFrames = maker ? packSource : extracted;
  const makerPack = useMemo(() => {
    if (!maker || !packSource.length) return;
    try {
      return packFrames(packSource, options);
    } catch {
      return;
    }
  }, [maker, packSource, options]);
  const makerToken = `${packSource.map((frame) => `${frame.id}:${frame.width}x${frame.height}`).join('|')}|${JSON.stringify(options)}`;
  const sliceToken = sheet ? `${sheet.id}|${JSON.stringify(slice)}` : '';
  extractState.current = {
    count: extracted.length,
    selectedSize: selected.size,
    filledCount: extracted.filter((frame) => !frame.empty).length,
  };
  const chosen = useMemo(
    () =>
      maker
        ? packSource
        : extracted.filter(
            (frame, index) =>
              selected.has(index) && (!skipEmpty || !frame.empty)
          ),
    [maker, packSource, extracted, selected, skipEmpty]
  );
  const effectiveFps = originalTiming ? null : fps;
  const invalidFps =
    !originalTiming && (!Number.isFinite(fps) || fps < 1 || fps > 60);
  const locked = busy;
  const canExport =
    !busy &&
    !computing &&
    !computeError &&
    !invalidFps &&
    chosen.length > 0 &&
    trimReady &&
    (maker
      ? !!rendered && renderedToken === makerToken
      : !!grid && extractedToken === sliceToken);
  const selectedFormats = ATLAS_FORMATS.filter((format) => formats[format]);
  const displayScale = zoom || fitScale;
  const onFitScale = useCallback((value: number) => setFitScale(value), []);
  const nudgeZoom = (direction: 1 | -1) => {
    setZoom(
      Number(
        clampZoom(
          (zoom || fitScale) * (direction === 1 ? 1.1 : 1 / 1.1)
        ).toFixed(3)
      )
    );
  };
  const changeOption = <K extends keyof MakerOptions>(
    key: K,
    value: MakerOptions[K]
  ) => {
    if (key === 'columns') makerColumnsTouched.current = true;
    setOptions((current) => ({ ...current, [key]: value }));
  };
  const changeSlice = <K extends keyof SliceOptions>(
    key: K,
    value: SliceOptions[K]
  ) => setSlice((current) => ({ ...current, [key]: value }));
  const changeMode = (value: 'images' | 'gif') => {
    if (value === mode || locked) return;
    if (frames.length && !window.confirm(t('replaceConfirm'))) return;
    setMode(value);
    setFrames([]);
    setError('');
    setOriginalTiming(true);
  };
  const importFiles = (files: File[]) => {
    if (locked || !files.length) return;
    if ((!maker || mode === 'gif') && files.length !== 1) {
      setError(t('errors.singleFile'));
      return;
    }
    if (
      ((maker && mode === 'gif' && frames.length) || (!maker && sheet)) &&
      !window.confirm(t('replaceConfirm'))
    )
      return;
    const firstMakerImport = maker && frames.length === 0;
    void run(async (signal) => {
      if (maker && mode === 'gif') {
        const result = await readGif(files[0], signal, reportProgress);
        abortCheck(signal);
        setFrames(result);
        if (
          firstMakerImport &&
          options.layout === 'grid' &&
          !makerColumnsTouched.current
        ) {
          setOptions((current) => ({
            ...current,
            columns: suggestMakerGridColumns(result.length),
          }));
        }
      } else {
        const existing = maker ? frames : [];
        if (
          files.reduce((n, f) => n + f.size, 0) +
            existing.reduce((n, f) => n + f.blob.size, 0) >
          LIMITS.bytes
        )
          throw new Error('fileLimit');
        const result = await readImages(
          naturalSort(files),
          existing,
          signal,
          reportProgress
        );
        abortCheck(signal);
        if (maker) {
          const nextFrames = [...frames, ...result];
          setFrames(nextFrames);
          if (
            firstMakerImport &&
            options.layout === 'grid' &&
            !makerColumnsTouched.current
          ) {
            setOptions((current) => ({
              ...current,
              columns: suggestMakerGridColumns(nextFrames.length),
            }));
          }
        }
        else {
          originals.current = undefined;
          setSheet(result[0]);
          setSlice(resolveSpriteSheetSlice(result[0]).options);
          setExtracted([]);
          setExtractedToken('');
          setSelected(new Set());
        }
      }
    });
  };
  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    importFiles(Array.from(event.target.files || []));
    event.target.value = '';
  };
  const toggle = (index: number, range: boolean) => {
    if (maker) {
      setSelected(new Set([index]));
      return;
    }
    setSelected((current) => {
      const next = new Set(current);
      if (range)
        for (
          let i = Math.min(anchor.current, index);
          i <= Math.max(anchor.current, index);
          i++
        )
          next.add(i);
      else if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    anchor.current = index;
  };
  const switchSliceMode = (mode: string) =>
    setSlice((current) => ({
      ...current,
      mode: mode as SliceOptions['mode'],
      ...(grid
        ? {
            width: grid.width,
            height: grid.height,
            rows: grid.rows,
            columns: grid.columns,
          }
        : {}),
    }));
  const save = (zip: boolean) => {
    if (!canExport) return;
    void run(async (signal) => {
      if (maker && rendered) {
        const blob =
          zip && selectedFormats.length
            ? await exportAtlas(
                packSource,
                rendered,
                effectiveFps,
                selectedFormats,
                signal,
                reportProgress,
                {
                  align: options.align,
                  background: options.background,
                }
              )
            : rendered.blob;
        abortCheck(signal);
        download(
          blob,
          zip && selectedFormats.length
            ? 'sprite-sheet.zip'
            : 'sprite-sheet.png'
        );
      } else {
        const withGif = includeGif && chosen.length > 0;
        const entries = frameEntries(chosen);
        if (withGif) {
          entries.push({
            name: 'animation.gif',
            blob: await encodeFramesGif(
              chosen,
              {
                align: 'top-left',
                background: '',
                fps: effectiveFps,
              },
              signal,
              reportProgress
            ),
          });
        }
        const blob =
          chosen.length === 1 && !withGif
            ? chosen[0].blob
            : await zipFiles(entries, signal, reportProgress);
        abortCheck(signal);
        download(
          blob,
          chosen.length === 1 && !withGif
            ? frameEntries(chosen)[0].name
            : 'sprite-frames.zip'
        );
      }
      setExported(true);
    });
  };
  const reset = () => {
    if (locked || !window.confirm(t('clearConfirm'))) return;
    setFrames([]);
    setTrimmed([]);
    trimCache.current.clear();
    setSheet(undefined);
    setError('');
    setSelected(new Set());
    setOptions(defaultMaker);
    setSlice(defaultSlice);
    makerColumnsTouched.current = false;
    originals.current = undefined;
  };
  const previewBlob = maker ? rendered?.blob : sheet?.blob;
  const previewWidth = maker ? makerPack?.width : sheet?.width;
  const previewHeight = maker ? makerPack?.height : sheet?.height;
  const fileInputElement = (
    <input
      ref={fileInput}
      type="file"
      className="hidden"
      tabIndex={-1}
      aria-label={t('upload')}
      accept={
        maker && mode === 'gif'
          ? 'image/gif,.gif'
          : 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp'
      }
      multiple={maker && mode === 'images'}
      onChange={onFiles}
      disabled={locked}
    />
  );
  const dropHandlers = {
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault();
      if (!locked) setDragging(true);
    },
    onDragLeave: (event: React.DragEvent) => {
      if (
        !(event.relatedTarget instanceof Node) ||
        !event.currentTarget.contains(event.relatedTarget)
      )
        setDragging(false);
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      setDragging(false);
      importFiles(Array.from(event.dataTransfer.files));
    },
  };
  const feedback = (
    <>
      {(busy || progress) && (
        <div
          role="status"
          aria-live="polite"
          className="bg-accent/40 flex items-center justify-between gap-3 px-4 py-3 text-sm"
        >
          <span>{progress}</span>
          {(busy || computing) && (
            <Button
              variant="ghost"
              className="shrink-0 rounded-md"
              onClick={() => {
                operation.current?.abort();
                if (computing) {
                  computation.current?.abort();
                  setComputing(false);
                  setComputeError(t('cancelled'));
                }
              }}
            >
              {t('cancel')}
            </Button>
          )}
        </div>
      )}
      {(error || computeError) && (
        <div
          role="alert"
          className="border-destructive bg-destructive/10 border-l-2 p-4 text-sm"
        >
          {error || computeError}
          {computeError && (rendered || extracted.length > 0) && (
            <p className="mt-2 text-sm">{t('previousPreview')}</p>
          )}
        </div>
      )}
    </>
  );
  const modeTabs = (
    <div
      className="flex flex-wrap justify-center gap-1"
      role="group"
      aria-label={t('inputMode')}
    >
      {(['images', 'gif'] as const).map((value) => (
        <Button
          key={value}
          disabled={locked}
          className={cn(
            'min-h-11 rounded-lg border px-5',
            mode === value
              ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20'
              : 'text-muted-foreground hover:bg-secondary border-transparent bg-transparent'
          )}
          variant="ghost"
          aria-pressed={mode === value}
          onClick={() => changeMode(value)}
        >
          {value === 'images' ? <Images size={16} /> : <Film size={16} />}
          {t(value === 'images' ? 'imagesToSheet' : 'gifToSheet')}
        </Button>
      ))}
    </div>
  );
  const promises = [
    { icon: Infinity, label: t('promiseForever') },
    { icon: UserRoundCheck, label: t('promiseNoAccount') },
    { icon: HardDrive, label: t('promiseLocal') },
    { icon: FileArchive, label: t('promiseFormats') },
  ];
  if (!hasAssets)
    return (
      <section
        id="workbench"
        aria-label={t(maker ? 'makerLabel' : 'splitterLabel')}
        className="mx-auto max-w-[1100px] scroll-mt-24"
      >
        {fileInputElement}
        <div className="border-border bg-card/90 relative border p-4 shadow-[0_40px_120px_-64px_#35c2ff55] sm:p-7">
          <span
            className="bg-primary absolute -top-px -left-px h-6 w-px"
            aria-hidden="true"
          />
          <span
            className="bg-primary absolute -top-px -left-px h-px w-6"
            aria-hidden="true"
          />
          {maker && <div className="mb-5">{modeTabs}</div>}
          <button
            type="button"
            disabled={locked}
            onClick={() => fileInput.current?.click()}
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
              {t(
                maker && mode === 'gif'
                  ? 'dropGif'
                  : maker
                    ? 'dropImages'
                    : 'dropSheet'
              )}
            </span>
            <span className="text-muted-foreground mt-6 font-mono text-[11px]">
              {t(
                !maker
                  ? 'sheetLimits'
                  : mode === 'gif'
                    ? 'gifLimits'
                    : 'imageLimits'
              )}
            </span>
          </button>
          {feedback}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-1.5 text-sm leading-none">
            <span className="text-muted-foreground">{t('noFiles')}</span>
            <Link
              href="/"
              className="text-foreground decoration-primary/50 hover:text-primary inline-flex items-center gap-1 underline underline-offset-4 transition-colors"
            >
              {t('generateAssets')}
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
        <ul
          aria-label={t('promisesLabel')}
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
    );
  return (
    <section
      id="workbench"
      aria-label={t(maker ? 'makerLabel' : 'splitterLabel')}
      className="border-border bg-card scroll-mt-24 border text-left shadow-[0_28px_80px_-40px_var(--color-background)]"
    >
      {fileInputElement}
      <div className="grid min-w-0 lg:h-[min(700px,calc(100svh-120px))] lg:min-h-[560px] lg:grid-cols-[220px_minmax(0,1fr)_240px]">
        <aside
          aria-label={t('frames')}
          className="border-border order-2 flex min-h-0 min-w-0 flex-col border-t lg:order-1 lg:border-t-0 lg:border-r"
        >
          <div className="p-2">
            <button
              type="button"
              {...dropHandlers}
              disabled={locked}
              onClick={() => fileInput.current?.click()}
              className={cn(
                'focus-visible:outline-ring flex min-h-16 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-2 py-2 text-left text-sm transition-colors focus-visible:outline-2',
                dragging
                  ? 'border-accent-foreground/30! bg-accent-foreground/15 text-accent-foreground hover:border-accent-foreground/80!'
                  : 'border-accent-foreground/30! bg-accent/40 text-accent-foreground hover:bg-accent-foreground/15 hover:border-accent-foreground/80!'
              )}
            >
              <ImagePlus size={16} className="shrink-0" />
              <span>
                {t(
                  maker && mode === 'images' ? 'addFramesHint' : 'replaceSource'
                )}
              </span>
            </button>
          </div>
          <div className="flex items-center justify-between px-2 pb-2">
            <h2 className="text-muted-foreground text-xs font-semibold tracking-wider">
              {t('frames')}{' '}
              <span className="text-foreground ml-1 font-mono">
                {displayFrames.length}
              </span>
            </h2>
            <button
              type="button"
              aria-label={t('clear')}
              title={t('clear')}
              disabled={locked}
              onClick={reset}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex h-8 w-8 items-center justify-center rounded-md"
            >
              <Trash2 size={16} />
            </button>
          </div>
          {!maker && (
            <SelectionTabs
              locked={locked}
              count={extracted.length}
              selectedCount={selected.size}
              onSelectAll={() =>
                setSelected(new Set(extracted.map((_, index) => index)))
              }
              onSelectNone={() => setSelected(new Set())}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onApplyRange={(start, end) => {
                setRangeStart(start);
                setRangeEnd(end);
                setSelected(
                  new Set(
                    Array.from(
                      { length: end - start + 1 },
                      (_, index) => start - 1 + index
                    )
                  )
                );
              }}
            />
          )}
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            <FrameStrip
              frames={displayFrames}
              selected={selected}
              onToggle={toggle}
              onRemove={
                maker
                  ? (index) =>
                      setFrames((current) =>
                        current.filter((_, i) => i !== index)
                      )
                  : undefined
              }
              onMove={
                maker
                  ? (from, to) =>
                      setFrames((current) => arrayMove(current, from, to))
                  : undefined
              }
              disabled={locked}
            />
          </div>
          <div className="border-border text-muted-foreground border-t px-2 py-2 text-sm leading-relaxed">
            {t(maker ? 'sortHelp' : 'selectionHelp')}
          </div>
        </aside>
        <div className="bg-vault-navy/35 order-1 flex min-h-0 min-w-0 flex-col lg:order-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-2">
            <div
              className="border-border bg-background flex gap-0.5 border p-0.5"
              role="group"
              aria-label={t('previewMode')}
            >
              {(['sheet', 'animation'] as const).map((value) => (
                <Button
                  key={value}
                  variant="ghost"
                  className={cn(
                    'h-8 min-h-8 rounded-md px-2.5 text-xs',
                    tab === value
                      ? 'bg-accent text-accent-foreground hover:bg-accent'
                      : 'text-muted-foreground'
                  )}
                  aria-pressed={tab === value}
                  onClick={() => setTab(value)}
                >
                  {value === 'sheet' ? (
                    <Grid2X2 size={15} />
                  ) : (
                    <Play size={15} />
                  )}
                  {t(value)}
                </Button>
              ))}
            </div>
            {tab === 'sheet' ? (
              <label className="text-muted-foreground flex h-8 shrink-0 items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="accent-accent-foreground"
                  checked={gridVisible}
                  onChange={(event) => setGridVisible(event.target.checked)}
                />
                {t('showGrid')}
              </label>
            ) : null}
          </div>
          <div className="min-h-0 space-y-1 px-2">{feedback}</div>
          <div className="min-h-0 flex-1 p-2 pt-0">
            {tab === 'animation' ? (
              <AnimationPreview
                frames={chosen}
                fps={invalidFps ? 12 : effectiveFps}
                align={maker ? options.align : 'top-left'}
                zoom={zoom}
                onFitScale={onFitScale}
                fpsValue={
                  Number.isFinite(fps) ? Math.min(60, Math.max(1, fps)) : 12
                }
                onFpsChange={(value) => {
                  setOriginalTiming(false);
                  setFps(value);
                }}
                zoomControls={
                  <ZoomControls
                    scale={displayScale}
                    onReset={() => setZoom(0)}
                    onZoomOut={() => nudgeZoom(-1)}
                    onZoomIn={() => nudgeZoom(1)}
                  />
                }
              />
            ) : (
                maker ? makerPack : previewBlob && previewWidth && previewHeight
              ) ? (
              <SheetPreview
                blob={maker ? undefined : previewBlob}
                frames={maker ? packSource : undefined}
                background={maker ? options.background : undefined}
                width={previewWidth ?? 1}
                height={previewHeight ?? 1}
                rects={maker ? (makerPack?.cells ?? []) : (grid?.rects ?? [])}
                frameRects={maker ? makerPack?.rects : undefined}
                selected={selected}
                onToggle={locked ? undefined : toggle}
                grid={gridVisible}
                zoom={zoom}
                onFitScale={onFitScale}
                label={t('sheetPreview')}
              />
            ) : (
              <div className="bg-background text-muted-foreground flex h-full min-h-80 items-center justify-center p-6 text-sm">
                {t(computing ? 'updating' : 'adjustSettings')}
              </div>
            )}
          </div>
          {tab === 'sheet' && (
            <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 px-2 pb-2 font-mono text-[11px]">
              <span>
                {previewWidth ?? '—'} × {previewHeight ?? '—'} px{' '}
                <span className="text-border mx-2">/</span>
                {t('frameCount', { count: chosen.length })}
                {previewBlob
                  ? ` / ${Math.max(0.1, previewBlob.size / 1024).toFixed(1)} KB`
                  : ''}
              </span>
              <ZoomControls
                scale={displayScale}
                onReset={() => setZoom(0)}
                onZoomOut={() => nudgeZoom(-1)}
                onZoomIn={() => nudgeZoom(1)}
              />
            </div>
          )}
          {!maker && grid && (grid.remainderX > 0 || grid.remainderY > 0) && (
            <p
              role="status"
              className="border-primary bg-primary/5 text-primary mx-2 mb-2 border-l-2 p-2 text-sm"
            >
              {t('remainder', { x: grid.remainderX, y: grid.remainderY })}
            </p>
          )}
        </div>
        <aside
          aria-label={t('settings')}
          className="border-border order-3 flex min-h-0 min-w-0 flex-col border-t lg:order-3 lg:border-t-0 lg:border-l"
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <fieldset
              disabled={locked}
              className="space-y-3 disabled:opacity-60"
            >
              {maker ? (
                <legend className="text-muted-foreground mb-2 text-xs font-semibold tracking-widest uppercase">
                  {t('layout')}
                </legend>
              ) : (
                <div className="mb-2 flex w-full items-center justify-between gap-2">
                  <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                    {t('sliceMode')}
                  </p>
                  <GridHint />
                </div>
              )}
              {maker ? (
                <>
                  <div
                    className="grid grid-cols-3 gap-1"
                    role="group"
                    aria-label={t('layout')}
                  >
                    {(['grid', 'horizontal', 'vertical'] as const).map(
                      (value, index) => {
                        const Icon = [Grid2X2, MoveHorizontal, MoveVertical][
                          index
                        ];
                        return (
                          <button
                            key={value}
                            type="button"
                            aria-label={t(value)}
                            aria-pressed={options.layout === value}
                            onClick={() => changeOption('layout', value)}
                            className={cn(
                              'flex flex-col items-center justify-center gap-1 rounded-md border px-1 py-2 text-[10px] transition-colors',
                              options.layout === value
                                ? 'border-accent-foreground/60 bg-accent text-accent-foreground'
                                : 'border-border text-muted-foreground hover:text-foreground'
                            )}
                          >
                            <Icon size={17} />
                            {t(
                              value === 'horizontal'
                                ? 'horizontalShort'
                                : value === 'vertical'
                                  ? 'verticalShort'
                                  : 'grid'
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>
                  {options.layout === 'grid' && (
                    <InlineNumber
                      label={t('columns')}
                      value={options.columns}
                      min={1}
                      max={256}
                      onChange={(value) => changeOption('columns', value)}
                    />
                  )}
                  <div className="space-y-1">
                    <p className="text-sm">{t('align')}</p>
                    <div
                      className="grid grid-cols-3 gap-1"
                      role="group"
                      aria-label={t('align')}
                    >
                      {(
                        [
                          ['bottom', 'bottomShort'],
                          ['center', 'centerShort'],
                          ['top-left', 'topLeftShort'],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          aria-label={t(value)}
                          aria-pressed={options.align === value}
                          onClick={() => changeOption('align', value)}
                          className={cn(
                            'flex h-8 items-center justify-center rounded-md border px-1 text-[10px] transition-colors',
                            options.align === value
                              ? 'border-accent-foreground/60 bg-accent text-accent-foreground'
                              : 'border-border text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {t(label)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <RangeField
                    label={t('padding')}
                    value={options.padding}
                    max={128}
                    onChange={(value) => changeOption('padding', value)}
                  />
                  <RangeField
                    label={t('gap')}
                    value={options.gap}
                    max={128}
                    onChange={(value) => changeOption('gap', value)}
                  />
                  <label className="flex items-center justify-between gap-2 text-xs">
                    <span>{t('trimTransparent')}</span>
                    <input
                      type="checkbox"
                      className="accent-accent-foreground h-4 w-4"
                      checked={!!options.trim}
                      onChange={(event) =>
                        changeOption('trim', event.target.checked)
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 text-xs">
                    <span>{t('transparentBackground')}</span>
                    <input
                      type="checkbox"
                      className="accent-accent-foreground h-4 w-4"
                      checked={!options.background}
                      onChange={(event) =>
                        changeOption(
                          'background',
                          event.target.checked ? '' : '#0b1020'
                        )
                      }
                    />
                  </label>
                  {!!options.background && (
                    <label className="flex items-center justify-between gap-3 text-xs">
                      {t('solidColor')}
                      <input
                        type="color"
                        aria-label={t('solidColor')}
                        className="border-input bg-background h-9 w-16 border"
                        value={options.background}
                        onChange={(event) =>
                          changeOption('background', event.target.value)
                        }
                      />
                    </label>
                  )}
                </>
              ) : (
                <>
                  <div
                    className="grid grid-cols-2 gap-1"
                    role="group"
                    aria-label={t('sliceMode')}
                  >
                    {(['count', 'size'] as const).map((value, index) => {
                      const Icon = [Grid2X2, BoxSelect][index];
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-label={t(
                            value === 'count' ? 'byCount' : 'bySize'
                          )}
                          aria-pressed={slice.mode === value}
                          onClick={() => switchSliceMode(value)}
                          className={cn(
                            'flex flex-col items-center justify-center gap-1 rounded-md border px-1 py-2 text-[10px] transition-colors',
                            slice.mode === value
                              ? 'border-accent-foreground/60 bg-accent text-accent-foreground'
                              : 'border-border text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <Icon size={17} />
                          {t(
                            value === 'count' ? 'byCountShort' : 'bySizeShort'
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {slice.mode === 'count' ? (
                    <>
                      <InlineNumber
                        label={t('columns')}
                        value={slice.columns}
                        min={1}
                        max={256}
                        onChange={(value) => changeSlice('columns', value)}
                      />
                      <InlineNumber
                        label={t('rows')}
                        value={slice.rows}
                        min={1}
                        max={256}
                        onChange={(value) => changeSlice('rows', value)}
                      />
                    </>
                  ) : (
                    <>
                      <InlineNumber
                        label={t('frameWidth')}
                        value={slice.width}
                        min={1}
                        onChange={(value) => changeSlice('width', value)}
                      />
                      <InlineNumber
                        label={t('frameHeight')}
                        value={slice.height}
                        min={1}
                        onChange={(value) => changeSlice('height', value)}
                      />
                    </>
                  )}
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                      {t('spacingAndOffsets')}
                    </p>
                    <InlineNumber
                      label={t('offsetX')}
                      value={slice.offsetX}
                      onChange={(value) => changeSlice('offsetX', value)}
                    />
                    <InlineNumber
                      label={t('offsetY')}
                      value={slice.offsetY}
                      onChange={(value) => changeSlice('offsetY', value)}
                    />
                    <InlineNumber
                      label={t('gapX')}
                      value={slice.gapX}
                      onChange={(value) => changeSlice('gapX', value)}
                    />
                    <InlineNumber
                      label={t('gapY')}
                      value={slice.gapY}
                      onChange={(value) => changeSlice('gapY', value)}
                    />
                    <InlineNumber
                      label={t('trimRight')}
                      value={slice.trimRight ?? 0}
                      onChange={(value) => changeSlice('trimRight', value)}
                    />
                    <InlineNumber
                      label={t('trimBottom')}
                      value={slice.trimBottom ?? 0}
                      onChange={(value) => changeSlice('trimBottom', value)}
                    />
                  </div>
                </>
              )}
            </fieldset>
          </div>
          <div className="border-border bg-vault-navy/50 space-y-2 border-t p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                {t('exportTitle')}
              </p>
              {maker ? <EngineImportHint /> : null}
            </div>
            {maker && (
              <div
                className="grid grid-cols-2 gap-x-2 gap-y-1"
                role="group"
                aria-label={t('exportFormats')}
              >
                {ATLAS_FORMATS.map((format) => (
                  <label
                    key={format}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={formats[format]}
                      disabled={locked}
                      onChange={(event) =>
                        setFormats((current) => ({
                          ...current,
                          [format]: event.target.checked,
                        }))
                      }
                    />
                    {t(ATLAS_FORMAT_LABELS[format])}
                  </label>
                ))}
              </div>
            )}
            {!maker && (
              <>
                <label className="flex items-center justify-between gap-2 text-xs">
                  <span>{t('includeGif')}</span>
                  <input
                    type="checkbox"
                    className="accent-primary h-4 w-4"
                    checked={includeGif}
                    disabled={locked}
                    onChange={(event) => setIncludeGif(event.target.checked)}
                  />
                </label>
                <label className="flex items-center justify-between gap-2 text-xs">
                  <span>{t('skipEmpty')}</span>
                  <input
                    type="checkbox"
                    className="accent-accent-foreground h-4 w-4"
                    checked={skipEmpty}
                    disabled={locked}
                    onChange={(event) => setSkipEmpty(event.target.checked)}
                  />
                </label>
              </>
            )}
            <Button
              className="h-9 min-h-9 w-full rounded-lg"
              disabled={!canExport}
              onClick={() => save(maker ? selectedFormats.length > 0 : true)}
            >
              <Download size={16} />
              {t(
                maker
                  ? selectedFormats.length
                    ? 'downloadZip'
                    : 'downloadPng'
                  : chosen.length === 1 && !includeGif
                    ? 'downloadFrame'
                    : 'downloadFrames'
              )}
            </Button>
            {!maker && !chosen.length && !computing && (
              <p className="text-muted-foreground text-sm">
                {t('selectFrames')}
              </p>
            )}
          </div>
        </aside>
      </div>
      {exported && (
        <div
          role="status"
          className="border-primary/30 bg-primary/5 flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3"
        >
          <p className="text-sm">{t('exportSuccess')}</p>
          <Link
            href="/#sprites"
            className="text-primary inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:underline"
          >
            <WandSparkles size={16} />
            {t('aiCta')}
          </Link>
        </div>
      )}
    </section>
  );
}
