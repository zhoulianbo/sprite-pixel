'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Frame, Rect } from '@/shared/lib/sprite-tools/core';

const checker =
  'bg-[conic-gradient(var(--color-secondary)_25%,transparent_0_50%,var(--color-secondary)_0_75%,transparent_0)] bg-[length:16px_16px]';
export function useBlobUrl(blob?: Blob) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!blob) {
      setUrl('');
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}
export function BlobImage({
  frame,
  className = '',
}: {
  frame: Frame;
  className?: string;
}) {
  const url = useBlobUrl(frame.blob);
  // Browser-local blobs cannot use the server image optimizer.
  return url ? (
    <img
      src={url}
      alt={frame.name}
      width={frame.width}
      height={frame.height}
      className={className}
      style={{ imageRendering: 'pixelated' }}
    />
  ) : null;
}
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 8;
export function clampZoom(value: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
}
export function ZoomControls({
  scale,
  onReset,
  onZoomOut,
  onZoomIn,
}: {
  scale: number;
  onReset: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
}) {
  const t = useTranslations('tools.sprites.ui');
  return (
    <div
      className="border-border bg-background flex items-center rounded-lg border p-0.5"
      role="group"
      aria-label={t('zoom')}
    >
      <button
        type="button"
        aria-label={t('resetZoom')}
        title={t('resetZoom')}
        className="flex h-7 w-7 items-center justify-center rounded-md"
        onClick={onReset}
      >
        <Maximize2 size={12} />
      </button>
      <button
        type="button"
        aria-label={t('zoomOut')}
        className="flex h-7 w-7 items-center justify-center rounded-md"
        onClick={onZoomOut}
      >
        <Minus size={12} />
      </button>
      <span className="min-w-10 px-1 text-center text-[11px] tabular-nums">
        {Math.round(scale * 100)}%
      </span>
      <button
        type="button"
        aria-label={t('zoomIn')}
        className="flex h-7 w-7 items-center justify-center rounded-md"
        onClick={onZoomIn}
      >
        <Plus size={12} />
      </button>
    </div>
  );
}
function useViewportSize() {
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 480, height: 440 });
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { viewport, size };
}
export function SheetPreview({
  blob,
  frames,
  background,
  width,
  height,
  rects,
  frameRects,
  selected,
  onToggle,
  grid,
  zoom,
  onFitScale,
  label,
}: {
  blob?: Blob;
  frames?: Frame[];
  background?: string;
  width: number;
  height: number;
  rects: Rect[];
  frameRects?: Rect[];
  selected?: Set<number>;
  onToggle?: (index: number, range: boolean) => void;
  grid: boolean;
  zoom: number;
  onFitScale?: (scale: number) => void;
  label: string;
}) {
  const url = useBlobUrl(blob);
  const { viewport, size } = useViewportSize();
  const fitScale = Math.min(
    (size.width - 16) / width,
    (size.height - 16) / height
  );
  const safeFit = Number.isFinite(fitScale) && fitScale > 0 ? fitScale : 1;
  const scale = zoom || safeFit;
  useEffect(() => {
    onFitScale?.(safeFit);
  }, [onFitScale, safeFit]);
  return (
    <div
      ref={viewport}
      className={`bg-background h-[360px] w-full overflow-auto lg:h-full ${checker}`}
    >
      <div
        className="flex min-h-full min-w-full items-center justify-center p-2"
        style={{
          width: Math.max(size.width, width * scale + 16),
          height: Math.max(size.height, height * scale + 16),
        }}
      >
        <div
          className="relative shrink-0"
          style={{
            width: width * scale,
            height: height * scale,
            background: background || undefined,
          }}
        >
          {frames
            ? frames.map((frame, index) => {
                const place = frameRects?.[index] ?? rects[index];
                return (
                  <div
                    key={frame.id}
                    className="absolute"
                    style={{
                      left: place.x * scale,
                      top: place.y * scale,
                      width: frame.width * scale,
                      height: frame.height * scale,
                    }}
                  >
                    <BlobImage frame={frame} className="block h-full w-full" />
                  </div>
                );
              })
            : url && (
                <img
                  src={url}
                  alt={label}
                  width={width}
                  height={height}
                  className="block h-full w-full"
                  style={{ imageRendering: 'pixelated' }}
                />
              )}
          {grid && (
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              {rects.map((rect, index) => (
                <g
                  key={index}
                  onClick={(event) => onToggle?.(index, event.shiftKey)}
                  className={onToggle ? 'cursor-pointer' : ''}
                >
                  <rect
                    {...rect}
                    fill={selected?.has(index) ? '#35c2ff20' : 'transparent'}
                    stroke={selected?.has(index) ? '#35c2ff' : '#7e8ca5'}
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={rect.x + 2}
                    y={
                      rect.y +
                      Math.min(rect.height * 0.3, Math.max(width / 75, 6))
                    }
                    fontSize={Math.min(
                      rect.height * 0.25,
                      Math.max(width / 85, 5)
                    )}
                    fill="white"
                    stroke="#0b1020"
                    strokeWidth="0.6"
                    paintOrder="stroke"
                    pointerEvents="none"
                  >
                    {index + 1}
                  </text>
                </g>
              ))}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
export function AnimationPreview({
  frames,
  fps,
  align,
  zoom,
  onFitScale,
  zoomControls,
  fpsValue,
  onFpsChange,
}: {
  frames: Frame[];
  fps: number | null;
  align: 'bottom' | 'center' | 'top-left';
  zoom: number;
  onFitScale?: (scale: number) => void;
  zoomControls?: ReactNode;
  fpsValue: number;
  onFpsChange?: (value: number) => void;
}) {
  const t = useTranslations('tools.sprites.ui');
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const { viewport, size } = useViewportSize();
  const current = frames[Math.min(index, frames.length - 1)];
  const width = Math.max(1, ...frames.map((f) => f.width));
  const height = Math.max(1, ...frames.map((f) => f.height));
  const fitScale = Math.min(
    (size.width - 16) / width,
    (size.height - 16) / height
  );
  const safeFit = Number.isFinite(fitScale) && fitScale > 0 ? fitScale : 1;
  const scale = zoom || safeFit;
  useEffect(() => {
    onFitScale?.(safeFit);
  }, [onFitScale, safeFit]);
  useEffect(() => {
    setIndex(0);
  }, [frames]);
  useEffect(() => {
    const node = boxRef.current;
    if (!node) return;
    let intersecting = true;
    const update = () => setVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      update();
    });
    observer.observe(node);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  useEffect(() => {
    if (!playing || !visible || !current || frames.length < 2) return;
    const timer = setTimeout(
      () => setIndex((value) => (value + 1) % frames.length),
      fps ? 1000 / fps : current.duration
    );
    return () => clearTimeout(timer);
  }, [playing, visible, current, frames.length, fps, index]);
  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, width, height);
    context.imageSmoothingEnabled = false;
    if (current)
      createImageBitmap(current.blob)
        .then((bitmap) => {
          if (!cancelled)
            context.drawImage(
              bitmap,
              align === 'top-left'
                ? 0
                : Math.floor((width - current.width) / 2),
              align === 'bottom'
                ? height - current.height
                : align === 'center'
                  ? Math.floor((height - current.height) / 2)
                  : 0
            );
          bitmap.close();
        })
        .catch(() => {
          if (!cancelled) setPlaying(false);
        });
    return () => {
      cancelled = true;
    };
  }, [current, width, height, align]);
  const frameLabel = frames.length
    ? t('frameIndex', {
        current: Math.min(index + 1, frames.length),
        total: frames.length,
      })
    : t('frameIndex', { current: 0, total: 0 });
  return (
    <div ref={boxRef} className="flex h-[360px] flex-col lg:h-full">
      <div
        ref={viewport}
        className={`bg-background min-h-0 flex-1 overflow-auto ${checker}`}
      >
        <div
          className="flex min-h-full min-w-full items-center justify-center p-2"
          style={{
            width: Math.max(size.width, width * scale + 16),
            height: Math.max(size.height, height * scale + 16),
          }}
        >
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="block shrink-0"
            style={{
              width: width * scale,
              height: height * scale,
              imageRendering: 'pixelated',
            }}
            aria-label={t('animation')}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-md"
            disabled={!frames.length}
            aria-label={t('previous')}
            onClick={() => {
              setPlaying(false);
              setIndex((index + frames.length - 1) % frames.length);
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-md"
            disabled={!frames.length}
            aria-label={t(playing ? 'pause' : 'play')}
            onClick={() => setPlaying(!playing)}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-md"
            disabled={!frames.length}
            aria-label={t('next')}
            onClick={() => {
              setPlaying(false);
              setIndex((index + 1) % frames.length);
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-[11px]">
            {frameLabel}
          </span>
          {zoomControls}
        </div>
      </div>
      {onFpsChange && (
        <label className="flex items-center gap-2 pt-1 text-[11px]">
          <span className="shrink-0">{t('fpsShort')}</span>
          <input
            type="range"
            min={1}
            max={60}
            step={1}
            value={fpsValue}
            onChange={(event) => onFpsChange(Number(event.target.value))}
            className="accent-primary h-4 min-w-0 flex-1 cursor-pointer"
          />
          <span className="text-muted-foreground w-6 text-right font-mono">
            {fpsValue}
          </span>
        </label>
      )}
    </div>
  );
}
function FrameTile({
  frame,
  index,
  selected,
  onToggle,
  onRemove,
  onKeyboardMove,
  sortable,
  disabled,
}: {
  frame: Frame;
  index: number;
  selected: boolean;
  onToggle: (index: number, range: boolean) => void;
  onRemove?: (index: number) => void;
  onKeyboardMove?: (index: number, direction: number) => void;
  sortable: boolean;
  disabled: boolean;
}) {
  const t = useTranslations('tools.sprites.ui');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: frame.id, disabled: !sortable || disabled });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={`flex min-w-0 items-stretch overflow-hidden rounded-lg border ${selected ? 'border-accent-foreground/60 bg-accent/50' : 'border-border bg-background/30'}`}
    >
      {sortable && (
        <button
          type="button"
          className="text-muted-foreground focus-visible:outline-ring flex w-6 shrink-0 touch-none items-center justify-center rounded-md focus-visible:outline-2"
          aria-label={t('reorder', { name: frame.name })}
          data-reorder-id={frame.id}
          disabled={disabled}
          {...attributes}
          {...listeners}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              event.preventDefault();
              onKeyboardMove?.(index, event.key === 'ArrowUp' ? -1 : 1);
            }
          }}
        >
          <GripVertical size={14} />
        </button>
      )}
      {!sortable && (
        <span
          className="flex w-6 shrink-0 cursor-pointer items-center justify-center self-stretch"
          onClick={(event) => {
            if (disabled) return;
            onToggle(index, event.shiftKey);
          }}
        >
          <input
            type="checkbox"
            tabIndex={-1}
            readOnly
            checked={selected}
            className="accent-accent-foreground pointer-events-none h-3.5 w-3.5"
          />
        </span>
      )}
      <button
        type="button"
        aria-pressed={selected}
        disabled={disabled}
        onClick={(event) => onToggle(index, event.shiftKey)}
        className="focus-visible:outline-ring flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-2 text-left focus-visible:outline-2"
        title={frame.name}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center ${checker}`}
        >
          <BlobImage
            frame={frame}
            className="max-h-full max-w-full object-contain"
          />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[11px] font-medium">
            {String(index + 1).padStart(2, '0')} · {frame.name}
          </span>
          <span className="text-muted-foreground mt-1 block text-[10px]">
            {frame.width} × {frame.height}
            {frame.empty ? ` · ${t('transparent')}` : ''}
          </span>
        </span>
      </button>
      {onRemove && (
        <button
          type="button"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-ring flex w-7 shrink-0 items-center justify-center rounded-md focus-visible:outline-2"
          aria-label={t('remove', { name: frame.name })}
          disabled={disabled}
          onClick={() => onRemove(index)}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
export function FrameStrip({
  frames,
  selected,
  onToggle,
  onRemove,
  onMove,
  disabled,
}: {
  frames: Frame[];
  selected: Set<number>;
  onToggle: (index: number, range: boolean) => void;
  onRemove?: (index: number) => void;
  onMove?: (from: number, to: number) => void;
  disabled: boolean;
}) {
  const t = useTranslations('tools.sprites.ui');
  const [announcement, setAnnouncement] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<{ id: string; processingSeen: boolean } | null>(
    null
  );
  useEffect(() => {
    if (!pendingFocus.current) return;
    if (disabled) {
      pendingFocus.current.processingSeen = true;
      return;
    }
    if (!pendingFocus.current.processingSeen) return;
    const request = requestAnimationFrame(() => {
      const handle = Array.from(
        listRef.current?.querySelectorAll<HTMLButtonElement>(
          '[data-reorder-id]'
        ) ?? []
      ).find((node) => node.dataset.reorderId === pendingFocus.current?.id);
      if (handle && !handle.disabled) {
        handle.focus({ preventScroll: true });
        handle.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        pendingFocus.current = null;
      }
    });
    return () => cancelAnimationFrame(request);
  }, [disabled, frames]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  const moveByKeyboard = (from: number, direction: number) => {
    const to = from + direction;
    if (!onMove || disabled || to < 0 || to >= frames.length) return;
    pendingFocus.current = { id: frames[from].id, processingSeen: false };
    onMove(from, to);
    setAnnouncement(t('dragDropped', { index: to + 1 }));
  };
  const end = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id)
      onMove?.(
        frames.findIndex((f) => f.id === active.id),
        frames.findIndex((f) => f.id === over.id)
      );
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={end}
      accessibility={{
        screenReaderInstructions: { draggable: t('dragInstructions') },
        announcements: {
          onDragStart: ({ active }) =>
            t('dragPicked', {
              index: frames.findIndex((frame) => frame.id === active.id) + 1,
            }),
          onDragOver: ({ over }) =>
            over
              ? t('dragMoved', {
                  index: frames.findIndex((frame) => frame.id === over.id) + 1,
                })
              : undefined,
          onDragEnd: ({ active, over }) =>
            t('dragDropped', {
              index:
                frames.findIndex(
                  (frame) => frame.id === (over?.id ?? active.id)
                ) + 1,
            }),
          onDragCancel: () => t('dragCancelled'),
        },
      }}
    >
      <SortableContext
        items={frames.map((f) => f.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={listRef}
          className="flex max-h-[360px] flex-col gap-1 p-0.5 lg:max-h-none"
        >
          {frames.map((frame, index) => (
            <FrameTile
              key={frame.id}
              frame={frame}
              index={index}
              selected={selected.has(index)}
              onToggle={onToggle}
              onRemove={onRemove}
              onKeyboardMove={moveByKeyboard}
              sortable={!!onMove}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </DndContext>
  );
}
