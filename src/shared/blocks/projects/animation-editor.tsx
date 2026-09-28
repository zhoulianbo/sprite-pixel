'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  Eraser,
  FlipHorizontal,
  FlipVertical,
  GripVertical,
  LoaderCircle,
  Minus,
  PaintBucket,
  Pause,
  Pencil,
  Pipette,
  Play,
  Plus,
  Redo2,
  RotateCw,
  Save,
  Square,
  Undo2,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, useRouter } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import {
  actionDirectionLabel,
  characterWorkspacePath,
} from '@/shared/lib/character-workspace';
import {
  clonePixels,
  collectShapePoints,
  drawCircle,
  drawLine,
  drawRect,
  extractPalette,
  flipHorizontal,
  flipVertical,
  floodFill,
  hexToRgba,
  readPixel,
  stampBrush,
  type PixelTool,
} from '@/shared/lib/pixel-drawing';
import {
  readApiPayload,
  useProductApiFeedback,
} from '@/shared/lib/product-api-error';
import {
  download,
  makeCanvas,
  pngBlob,
  zipFiles,
} from '@/shared/lib/sprite-tools/browser';
import { uploadProjectReferenceFile } from '@/shared/lib/upload-project-file';
import { cn } from '@/shared/lib/utils';

type EditorFrame = {
  id: string;
  fileId: string;
  file: { url: string };
  frameIndex: number;
  durationMs?: number | null;
  offsetX: number;
  offsetY: number;
  metadata: { crop?: { x: number; y: number; width: number; height: number } };
};

type EditorData = {
  version: {
    id: string;
    fps: number;
    frameWidth: number;
    frameHeight: number;
    versionNo: number;
  };
  versions: Array<{
    id: string;
    versionNo: number;
    isCurrent: boolean;
  }>;
  clip: { id: string; direction: string };
  set: {
    id: string;
    loop: boolean;
    projectId: string;
    itemId: string;
    name: string;
    action: string;
  };
  item: { id: string; name: string };
  frames: EditorFrame[];
};

type DocumentSnapshot = {
  frames: EditorFrame[];
  loop: boolean;
};

type PixelSnapshot = {
  frameId: string;
  pixels: Uint8ClampedArray;
};

type HistoryEntry =
  | { kind: 'document'; value: DocumentSnapshot }
  | { kind: 'pixels'; value: PixelSnapshot };

const PIXEL_TOOLS: PixelTool[] = [
  'pencil',
  'eraser',
  'fill',
  'eyedropper',
  'line',
  'rect',
  'circle',
];

const MIN_ZOOM = 50;
const MAX_ZOOM = 1600;
const ZOOM_STEP = 50;
const MIN_IMAGE_SCALE = 0.25;
const MAX_IMAGE_SCALE = 4;
const IMAGE_SCALE_STEP = 0.25;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function clampImageScale(value: number) {
  return Math.min(MAX_IMAGE_SCALE, Math.max(MIN_IMAGE_SCALE, value));
}

function defaultZoomPercent(width: number, height: number) {
  const edge = Math.max(width, height, 1);
  const fit = Math.floor((Math.min(560, 420) / edge) * 100);
  return clampZoom(Math.round(fit / ZOOM_STEP) * ZOOM_STEP);
}

const sheetImageLoads = new Map<string, Promise<HTMLImageElement>>();

function loadSheetImage(frame: EditorFrame) {
  const key = frame.fileId || frame.file.url;
  const existing = sheetImageLoads.get(key);
  if (existing) return existing;
  const pending = loadFrameImage(frame);
  sheetImageLoads.set(key, pending);
  pending.catch(() => {
    if (sheetImageLoads.get(key) === pending) sheetImageLoads.delete(key);
  });
  return pending;
}

function loadHtmlImage(url: string, cors: boolean) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    if (cors) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`image load failed: ${url}`));
    image.src = url;
  });
}

async function loadImageFromBlobUrl(url: string) {
  const response = await fetch(url, { credentials: 'omit' });
  if (!response.ok) throw new Error(`image fetch failed: ${url}`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await loadHtmlImage(objectUrl, false);
    if (image.decode) await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadFrameImage(frame: EditorFrame) {
  const url = frame.file.url;
  if (!url) throw new Error('image url missing');
  try {
    return await loadImageFromBlobUrl(url);
  } catch {
    return loadHtmlImage(url, true);
  }
}

function scheduleIdleTask(callback: () => void) {
  const idleWindow = window as Window & {
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout: number }
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };
  if (idleWindow.requestIdleCallback) {
    const handle = idleWindow.requestIdleCallback(callback, { timeout: 800 });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }
  const handle = window.setTimeout(callback, 80);
  return () => window.clearTimeout(handle);
}

function drawFrameImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  frame: EditorFrame,
  width: number,
  height: number
) {
  const crop = frame.metadata.crop || {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  };
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, width, height);
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
}

async function renderFrame(frame: EditorFrame, width: number, height: number) {
  const image = await loadSheetImage(frame);
  const { canvas, context } = makeCanvas(width, height);
  drawFrameImage(context, image, frame, width, height);
  return canvas;
}

async function readFramePixels(
  frame: EditorFrame,
  width: number,
  height: number
) {
  const image = await loadSheetImage(frame);
  const { canvas, context } = makeCanvas(width, height);
  drawFrameImage(context, image, frame, width, height);
  try {
    const pixels = new Uint8ClampedArray(
      context.getImageData(0, 0, width, height).data
    );
    canvas.width = 0;
    canvas.height = 0;
    return pixels;
  } catch {
    canvas.width = 0;
    canvas.height = 0;
    return null;
  }
}

const CHECKER_LIGHT = '#2a2a2e';
const CHECKER_DARK = '#222226';

let blitCanvas: HTMLCanvasElement | null = null;
let blitContext: CanvasRenderingContext2D | null = null;
let checkerTile: HTMLCanvasElement | null = null;
let checkerTileSize = 0;

function getBlitTarget(width: number, height: number) {
  if (!blitCanvas || !blitContext) {
    blitCanvas = document.createElement('canvas');
    blitContext = blitCanvas.getContext('2d');
  }
  if (!blitContext) return null;
  if (blitCanvas.width !== width || blitCanvas.height !== height) {
    blitCanvas.width = width;
    blitCanvas.height = height;
    blitContext.imageSmoothingEnabled = false;
  }
  return { canvas: blitCanvas, context: blitContext };
}

function fillCheckerboard(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize: number
) {
  if (!checkerTile || checkerTileSize !== cellSize) {
    checkerTile = document.createElement('canvas');
    checkerTile.width = Math.max(2, cellSize * 2);
    checkerTile.height = Math.max(2, cellSize * 2);
    const tileContext = checkerTile.getContext('2d');
    if (!tileContext) return;
    tileContext.fillStyle = CHECKER_LIGHT;
    tileContext.fillRect(0, 0, cellSize, cellSize);
    tileContext.fillRect(cellSize, cellSize, cellSize, cellSize);
    tileContext.fillStyle = CHECKER_DARK;
    tileContext.fillRect(cellSize, 0, cellSize, cellSize);
    tileContext.fillRect(0, cellSize, cellSize, cellSize);
    checkerTileSize = cellSize;
  }
  const pattern = context.createPattern(checkerTile, 'repeat');
  if (!pattern) return;
  context.fillStyle = pattern;
  context.fillRect(0, 0, width, height);
}

function putPixels(
  canvas: HTMLCanvasElement | null,
  pixels: Uint8ClampedArray | undefined,
  width: number,
  height: number
) {
  if (!canvas || !pixels) return;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.imageSmoothingEnabled = false;
  context.putImageData(
    new ImageData(new Uint8ClampedArray(pixels), width, height),
    0,
    0
  );
}

function paintEditorCanvas(
  canvas: HTMLCanvasElement | null,
  pixels: Uint8ClampedArray | undefined,
  width: number,
  height: number,
  cellSize: number,
  source?: CanvasImageSource
) {
  if (!canvas) return;
  const size = Math.max(1, Math.round(cellSize));
  canvas.width = width * size;
  canvas.height = height * size;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.imageSmoothingEnabled = false;
  fillCheckerboard(context, canvas.width, canvas.height, size);
  if (pixels) {
    const blit = getBlitTarget(width, height);
    if (!blit) return;
    const imageData = blit.context.createImageData(width, height);
    imageData.data.set(pixels);
    blit.context.putImageData(imageData, 0, 0);
    context.drawImage(blit.canvas, 0, 0, canvas.width, canvas.height);
    return;
  }
  if (source) context.drawImage(source, 0, 0, canvas.width, canvas.height);
}

function FrameCanvas({
  frame,
  width,
  height,
  pixels,
  priority,
}: {
  frame: EditorFrame;
  width: number;
  height: number;
  pixels?: Uint8ClampedArray;
  priority: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (pixels) {
      putPixels(ref.current, pixels, width, height);
      return;
    }
    if (!priority) return;
    let cancelled = false;
    const paint = () => {
      void renderFrame(frame, width, height)
        .then((source) => {
          if (cancelled || !ref.current) return;
          ref.current.width = width;
          ref.current.height = height;
          const context = ref.current.getContext('2d');
          if (!context) return;
          context.imageSmoothingEnabled = false;
          context.clearRect(0, 0, width, height);
          context.drawImage(source, 0, 0);
          source.width = 0;
          source.height = 0;
        })
        .catch(() => {});
    };
    paint();
    return () => {
      cancelled = true;
    };
  }, [frame, height, pixels, priority, width]);
  return (
    <canvas
      ref={ref}
      className="size-full object-contain [image-rendering:pixelated]"
    />
  );
}

function SortableFrame({
  frame,
  selected,
  onSelect,
  onDelete,
  canDelete,
  width,
  height,
  label,
  deleteLabel,
  pixels,
}: {
  frame: EditorFrame;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  canDelete: boolean;
  width: number;
  height: number;
  label: string;
  deleteLabel: string;
  pixels?: Uint8ClampedArray;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: frame.id });
  return (
    <div
      ref={setNodeRef}
      aria-label={label}
      aria-pressed={selected}
      className={cn(
        'group bg-secondary/40 border-border relative h-20 w-20 shrink-0 cursor-pointer rounded-lg border-2 p-1',
        'hover:border-muted-foreground hover:z-20',
        selected && 'border-primary hover:border-primary',
        isDragging && 'z-10 opacity-60'
      )}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      role="button"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      tabIndex={0}
    >
      <div className="size-full overflow-hidden rounded-md">
        <FrameCanvas
          frame={frame}
          height={height}
          pixels={pixels}
          priority={selected}
          width={width}
        />
      </div>
      <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1 font-mono text-[9px] text-white">
        {label}
      </span>
      <span
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 flex size-5 cursor-grab items-center justify-center rounded bg-black/65 text-white active:cursor-grabbing"
        onClick={(event) => event.stopPropagation()}
      >
        <GripVertical className="size-3" />
      </span>
      <button
        aria-label={deleteLabel}
        className="bg-destructive text-destructive-foreground hover:bg-destructive absolute -top-2 -right-2 z-30 hidden size-5 items-center justify-center rounded-full shadow-sm group-hover:flex disabled:opacity-40"
        disabled={!canDelete}
        onClick={(event) => {
          event.stopPropagation();
          if (canDelete) onDelete();
        }}
        type="button"
      >
        <X className="size-3" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={label}
          aria-pressed={active}
          className={cn(
            'hover:bg-primary/10 hover:text-primary flex size-9 items-center justify-center rounded-md border border-transparent',
            active &&
              'border-primary bg-primary/10 text-primary shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_35%,transparent)]',
            disabled && 'pointer-events-none opacity-40'
          )}
          disabled={disabled}
          onClick={onClick}
          type="button"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function AnimationEditor({ data }: { data: EditorData }) {
  const t = useTranslations('workspace.editor');
  const td = useTranslations('workspace.directions');
  const to = useTranslations('generation');
  const notifyApiError = useProductApiFeedback();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const pixelsRef = useRef(new Map<string, Uint8ClampedArray>());
  const dirtyPixelsRef = useRef(new Set<string>());
  const drawingRef = useRef(false);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastPaintRef = useRef<{ x: number; y: number } | null>(null);
  const [frames, setFrames] = useState(data.frames);
  const [selectedId, setSelectedId] = useState(data.frames[0]?.id || '');
  const [fps, setFps] = useState(Number(data.version.fps));
  const [loop, setLoop] = useState(Boolean(data.set.loop));
  const [playing, setPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [past, setPast] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pixelsVersion, setPixelsVersion] = useState(0);
  const [primaryFrameReady, setPrimaryFrameReady] = useState(false);
  // 暂时跳过像素画检测，先开放全部绘制工具。
  // const [pixelArt, setPixelArt] = useState(false);
  const pixelArt = true;
  const [tool, setTool] = useState<PixelTool>('pencil');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(1);
  const [palette, setPalette] = useState<string[]>([]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  const width = data.version.frameWidth;
  const height = data.version.frameHeight;
  const selected = frames.find((frame) => frame.id === selectedId) || frames[0];
  const selectedIndex = useMemo(
    () => frames.findIndex((frame) => frame.id === selectedId),
    [frames, selectedId]
  );
  const visible = playing
    ? frames[playIndex % Math.max(frames.length, 1)]
    : selected;
  const [zoomPercent, setZoomPercent] = useState(() =>
    defaultZoomPercent(width, height)
  );
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const zoom = zoomPercent / 100;
  const zoomCell = Math.max(1, Math.round(zoom));
  const cellSize = Math.max(1, Math.round(zoom * imageScale));
  const canvasEdge = Math.max(width, height) * zoomCell;
  const imageWidth = width * cellSize;
  const imageHeight = height * cellSize;
  const stageRef = useRef<HTMLDivElement>(null);

  const title = actionDirectionLabel(
    data.set.action,
    data.clip.direction,
    (action) => {
      const key = `options.actionType.${action}`;
      return to.has(key as never) ? to(key as never) : action;
    },
    (direction) =>
      td.has(direction as never) ? td(direction as never) : direction
  );
  const versions = data.versions?.length
    ? data.versions
    : [
        {
          id: data.version.id,
          versionNo: data.version.versionNo,
          isCurrent: true,
        },
      ];

  const bumpPixels = () => setPixelsVersion((value) => value + 1);

  const documentSnapshot = (): DocumentSnapshot => ({
    frames: frames.map((frame) => ({ ...frame })),
    loop,
  });

  const pushHistory = (entry: HistoryEntry) => {
    setPast((current) => [...current.slice(-29), entry]);
    setFuture([]);
    setDirty(true);
  };

  const commitDocument = (next: Partial<DocumentSnapshot>) => {
    pushHistory({ kind: 'document', value: documentSnapshot() });
    if (next.frames) setFrames(next.frames);
    if (next.loop !== undefined) setLoop(next.loop);
  };

  const beginPixelEdit = (frameId: string) => {
    const current = pixelsRef.current.get(frameId);
    if (!current) return;
    pushHistory({
      kind: 'pixels',
      value: { frameId, pixels: clonePixels(current) },
    });
    dirtyPixelsRef.current.add(frameId);
  };

  const restore = (entry: HistoryEntry) => {
    if (entry.kind === 'document') {
      setFrames(entry.value.frames);
      setLoop(entry.value.loop);
      if (!entry.value.frames.some((frame) => frame.id === selectedId)) {
        setSelectedId(entry.value.frames[0]?.id || '');
      }
      return;
    }
    pixelsRef.current.set(entry.value.frameId, clonePixels(entry.value.pixels));
    bumpPixels();
  };

  const undo = () => {
    const entry = past.at(-1);
    if (!entry) return;
    const reverse: HistoryEntry =
      entry.kind === 'document'
        ? { kind: 'document', value: documentSnapshot() }
        : {
            kind: 'pixels',
            value: {
              frameId: entry.value.frameId,
              pixels: clonePixels(
                pixelsRef.current.get(entry.value.frameId) || entry.value.pixels
              ),
            },
          };
    setFuture((current) => [reverse, ...current]);
    setPast((current) => current.slice(0, -1));
    restore(entry);
    setDirty(past.length > 1);
  };

  const redo = () => {
    const entry = future[0];
    if (!entry) return;
    const reverse: HistoryEntry =
      entry.kind === 'document'
        ? { kind: 'document', value: documentSnapshot() }
        : {
            kind: 'pixels',
            value: {
              frameId: entry.value.frameId,
              pixels: clonePixels(
                pixelsRef.current.get(entry.value.frameId) || entry.value.pixels
              ),
            },
          };
    setPast((current) => [...current, reverse]);
    setFuture((current) => current.slice(1));
    restore(entry);
    setDirty(true);
  };

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const timer = window.setInterval(() => {
      setPlayIndex((current) => (current + 1) % frames.length);
    }, 1000 / fps);
    return () => window.clearInterval(timer);
  }, [fps, frames, playing]);

  useEffect(() => {
    if (!playing) return;
    const frame = frames[playIndex % Math.max(frames.length, 1)];
    if (frame) setSelectedId(frame.id);
  }, [frames, playIndex, playing]);

  useEffect(() => {
    const frame = visible;
    const canvas = canvasRef.current;
    if (!frame || !canvas) return;
    const pixels = pixelsRef.current.get(frame.id);
    if (pixels) {
      paintEditorCanvas(canvas, pixels, width, height, cellSize);
      setPrimaryFrameReady(true);
      return;
    }
    paintEditorCanvas(canvas, undefined, width, height, cellSize);
    let cancelled = false;
    readFramePixels(frame, width, height)
      .then((nextPixels) => {
        if (cancelled || !nextPixels || dirtyPixelsRef.current.has(frame.id)) {
          return;
        }
        pixelsRef.current.set(frame.id, nextPixels);
        if (!playing && frame.id === selectedId) {
          setPalette(extractPalette(nextPixels));
        }
        setPrimaryFrameReady(true);
        paintEditorCanvas(
          canvasRef.current,
          nextPixels,
          width,
          height,
          cellSize
        );
        bumpPixels();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [cellSize, height, playing, selectedId, visible, width]);

  useEffect(() => {
    const frame = visible;
    const pixels = frame ? pixelsRef.current.get(frame.id) : undefined;
    if (!pixels) return;
    paintEditorCanvas(canvasRef.current, pixels, width, height, cellSize);
  }, [cellSize, height, pixelsVersion, visible, width]);

  useEffect(() => {
    if (!primaryFrameReady) return;
    const pendingFrames = frames.filter(
      (frame) => !pixelsRef.current.has(frame.id)
    );
    if (!pendingFrames.length) return;

    let cancelled = false;
    let cursor = 0;
    let cancelSchedule = () => {};

    const scheduleNextBatch = () => {
      cancelSchedule = scheduleIdleTask(() => {
        const batch = pendingFrames.slice(cursor, cursor + 3);
        cursor += batch.length;
        void Promise.all(
          batch.map(async (frame) => ({
            id: frame.id,
            pixels: await readFramePixels(frame, width, height),
          }))
        )
          .then((results) => {
            if (cancelled) return;
            let changed = false;
            results.forEach(({ id, pixels }) => {
              if (
                !pixels ||
                pixelsRef.current.has(id) ||
                dirtyPixelsRef.current.has(id)
              ) {
                return;
              }
              pixelsRef.current.set(id, pixels);
              changed = true;
            });
            if (changed) bumpPixels();
            if (cursor < pendingFrames.length) scheduleNextBatch();
          })
          .catch(() => {
            if (!cancelled && cursor < pendingFrames.length) {
              scheduleNextBatch();
            }
          });
      });
    };

    scheduleNextBatch();
    return () => {
      cancelled = true;
      cancelSchedule();
    };
  }, [frames, height, primaryFrameReady, width]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const direction = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoomPercent((current) => clampZoom(current + direction));
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const undoRef = useRef(undo);
  const redoRef = useRef(redo);
  undoRef.current = undo;
  redoRef.current = redo;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.tagName === 'INPUT') return;
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) redoRef.current();
        else undoRef.current();
        return;
      }
      if (!pixelArt) return;
      if (key === 'b') setTool('pencil');
      else if (key === 'e') setTool('eraser');
      else if (key === 'g') setTool('fill');
      else if (key === 'i') setTool('eyedropper');
      else if (key === 'l') setTool('line');
      else if (key === 'r') setTool('rect');
      else if (key === 'c') setTool('circle');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pixelArt]);

  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = frames.findIndex((frame) => frame.id === active.id);
    const newIndex = frames.findIndex((frame) => frame.id === over.id);
    commitDocument({ frames: arrayMove(frames, oldIndex, newIndex) });
  };

  const deleteFrame = (frameId: string) => {
    if (frames.length <= 1) return;
    const next = frames.filter((frame) => frame.id !== frameId);
    commitDocument({ frames: next });
    pixelsRef.current.delete(frameId);
    dirtyPixelsRef.current.delete(frameId);
    if (selectedId === frameId) {
      const fallbackIndex = Math.max(0, selectedIndex - 1);
      setSelectedId(next[fallbackIndex]?.id || next[0]?.id || '');
      setPlaying(false);
    }
  };

  const cellFromEvent = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * width);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * height);
    return {
      x: Math.max(0, Math.min(width - 1, x)),
      y: Math.max(0, Math.min(height - 1, y)),
    };
  };

  const paintAt = (
    pixels: Uint8ClampedArray,
    x: number,
    y: number,
    currentTool: PixelTool
  ) => {
    const paint = hexToRgba(color);
    if (currentTool === 'pencil')
      stampBrush(pixels, width, height, x, y, paint, brushSize);
    else if (currentTool === 'eraser')
      stampBrush(pixels, width, height, x, y, null, brushSize);
    else if (currentTool === 'fill')
      floodFill(pixels, width, height, x, y, paint);
    else if (currentTool === 'eyedropper') {
      const sampled = readPixel(pixels, width, height, x, y);
      if (sampled && sampled[3] > 8) {
        setColor(
          `#${[sampled[0], sampled[1], sampled[2]]
            .map((channel) => channel.toString(16).padStart(2, '0'))
            .join('')}`
        );
      }
    }
  };

  const clearPreview = () => {
    const preview = previewRef.current;
    if (!preview) return;
    preview.width = width * cellSize;
    preview.height = height * cellSize;
    preview.getContext('2d')?.clearRect(0, 0, preview.width, preview.height);
  };

  const drawPreview = (x: number, y: number) => {
    const start = drawStartRef.current;
    const preview = previewRef.current;
    if (
      !start ||
      !preview ||
      (tool !== 'line' && tool !== 'rect' && tool !== 'circle')
    ) {
      return;
    }
    preview.width = width * cellSize;
    preview.height = height * cellSize;
    const context = preview.getContext('2d');
    if (!context) return;
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, preview.width, preview.height);
    context.fillStyle = `${color}99`;
    collectShapePoints(tool, start.x, start.y, x, y).forEach(([px, py]) => {
      context.fillRect(px * cellSize, py * cellSize, cellSize, cellSize);
    });
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!pixelArt || playing || !selected) return;
    const cell = cellFromEvent(event);
    if (!cell) return;
    let pixels = pixelsRef.current.get(selected.id);
    if (!pixels) {
      pixels = new Uint8ClampedArray(width * height * 4);
      pixelsRef.current.set(selected.id, pixels);
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    drawStartRef.current = cell;
    lastPaintRef.current = cell;
    beginPixelEdit(selected.id);
    paintAt(pixels, cell.x, cell.y, tool);
    bumpPixels();
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !selected) return;
    const cell = cellFromEvent(event);
    const pixels = pixelsRef.current.get(selected.id);
    if (!cell || !pixels) return;
    if (tool === 'pencil' || tool === 'eraser') {
      const last = lastPaintRef.current;
      if (last && last.x === cell.x && last.y === cell.y) return;
      const paint = tool === 'eraser' ? null : hexToRgba(color);
      if (last) {
        drawLine(
          pixels,
          width,
          height,
          last.x,
          last.y,
          cell.x,
          cell.y,
          paint,
          brushSize
        );
      } else {
        paintAt(pixels, cell.x, cell.y, tool);
      }
      lastPaintRef.current = cell;
      bumpPixels();
      return;
    }
    drawPreview(cell.x, cell.y);
  };

  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !selected) return;
    drawingRef.current = false;
    const cell = cellFromEvent(event);
    const start = drawStartRef.current;
    const pixels = pixelsRef.current.get(selected.id);
    drawStartRef.current = null;
    lastPaintRef.current = null;
    clearPreview();
    if (!cell || !start || !pixels) return;
    const paint = hexToRgba(color);
    if (tool === 'line')
      drawLine(
        pixels,
        width,
        height,
        start.x,
        start.y,
        cell.x,
        cell.y,
        paint,
        brushSize
      );
    else if (tool === 'rect')
      drawRect(
        pixels,
        width,
        height,
        start.x,
        start.y,
        cell.x,
        cell.y,
        paint,
        brushSize
      );
    else if (tool === 'circle')
      drawCircle(
        pixels,
        width,
        height,
        start.x,
        start.y,
        cell.x,
        cell.y,
        paint,
        brushSize
      );
    if (tool === 'line' || tool === 'rect' || tool === 'circle') bumpPixels();
    const current = pixelsRef.current.get(selected.id);
    if (current) setPalette(extractPalette(current));
  };

  const transformCurrent = (mode: 'flip-h' | 'flip-v') => {
    if (!selected || !pixelArt) return;
    const pixels = pixelsRef.current.get(selected.id);
    if (!pixels) return;
    beginPixelEdit(selected.id);
    if (mode === 'flip-h') flipHorizontal(pixels, width, height);
    if (mode === 'flip-v') flipVertical(pixels, width, height);
    bumpPixels();
  };

  const rotateImage = () => {
    setImageRotation((current) => (current + 45) % 360);
  };

  const canvasFromPixels = async (pixels: Uint8ClampedArray) => {
    const { canvas, context } = makeCanvas(width, height);
    context.putImageData(
      new ImageData(clonePixels(pixels), width, height),
      0,
      0
    );
    return canvas;
  };

  const renderedFrames = async () => {
    const output: Array<{ name: string; blob: Blob }> = [];
    for (let index = 0; index < frames.length; index++) {
      const stored = pixelsRef.current.get(frames[index].id);
      const canvas = stored
        ? await canvasFromPixels(stored)
        : await renderFrame(frames[index], width, height);
      output.push({
        name: `frame-${String(index + 1).padStart(3, '0')}.png`,
        blob: await pngBlob(canvas),
      });
      canvas.width = 0;
      canvas.height = 0;
    }
    return output;
  };

  const exportFrames = async () => {
    const entries = await renderedFrames();
    const archive = await zipFiles(
      entries,
      new AbortController().signal,
      () => {}
    );
    download(archive, `${data.item.name}-${data.set.name}-frames.zip`);
  };

  const exportSheet = async () => {
    const entries = await renderedFrames();
    const columns = Math.min(frames.length, Math.max(1, frames.length));
    const { canvas, context } = makeCanvas(columns * width, height);
    for (let index = 0; index < entries.length; index++) {
      const image = await createImageBitmap(entries[index].blob);
      context.drawImage(image, index * width, 0);
      image.close();
    }
    const blob = await pngBlob(canvas);
    canvas.width = 0;
    canvas.height = 0;
    download(blob, `${data.item.name}-${data.set.name}-spritesheet.png`);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const payloadFrames = [];
      for (const frame of frames) {
        let fileId: string | undefined;
        if (dirtyPixelsRef.current.has(frame.id)) {
          const pixels = pixelsRef.current.get(frame.id);
          if (pixels) {
            const canvas = await canvasFromPixels(pixels);
            const blob = await pngBlob(canvas);
            canvas.width = 0;
            canvas.height = 0;
            fileId = await uploadProjectReferenceFile({
              projectId: data.set.projectId,
              file: new File([blob], `${frame.id}.png`, { type: 'image/png' }),
              role: 'animation_frame',
              itemId: data.set.itemId,
            });
          }
        }
        payloadFrames.push({
          frameId: frame.id,
          fileId,
          durationMs: frame.durationMs,
          offsetX: frame.offsetX,
          offsetY: frame.offsetY,
        });
      }
      const response = await fetch(`/api/animations/${data.clip.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentVersionId: data.version.id,
          fps: Number(data.version.fps) || 12,
          loop,
          frames: payloadFrames,
        }),
      });
      const payload = await readApiPayload(response);
      setDirty(false);
      dirtyPixelsRef.current.clear();
      router.replace(`/editor/animations/${payload.data.version.id}`);
    } catch (reason) {
      notifyApiError(reason);
      setError(t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  const toolIcons: Record<PixelTool, ReactNode> = {
    pencil: <Pencil className="size-4" />,
    eraser: <Eraser className="size-4" />,
    fill: <PaintBucket className="size-4" />,
    eyedropper: <Pipette className="size-4" />,
    line: <Minus className="size-4" />,
    rect: <Square className="size-4" />,
    circle: <Circle className="size-4" />,
  };

  return (
    <TooltipProvider>
      <main className="bg-background text-foreground flex h-dvh min-h-0 flex-col">
        <header className="bg-card/80 flex min-h-12 shrink-0 items-center gap-3 border-b px-3 py-2 sm:px-4">
          <Button asChild size="icon" variant="ghost">
            <Link
              aria-label={t('back')}
              href={characterWorkspacePath(
                data.set.projectId,
                data.set.itemId,
                'animations'
              )}
            >
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading truncate text-sm font-semibold">
              {data.item.name} · {title}
            </h1>
            <p className="text-muted-foreground font-mono text-[10px]">
              {t('version', { number: data.version.versionNo })}
            </p>
          </div>
          {dirty ? (
            <span className="text-primary text-xs">{t('unsaved')}</span>
          ) : null}
          {versions.length > 1 ? (
            <Select
              value={data.version.id}
              onValueChange={(versionId) => {
                if (versionId === data.version.id || dirty || saving) return;
                router.push(`/editor/animations/${versionId}`);
              }}
              disabled={dirty || saving}
            >
              <SelectTrigger
                size="sm"
                className="h-8 min-w-[5.5rem] rounded-md"
                aria-label={t('switchVersion')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {versions.map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    {t('version', { number: version.versionNo })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Button
            disabled={saving || !dirty || frames.length === 0}
            onClick={save}
          >
            {saving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? t('saving') : t('save')}
          </Button>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="bg-card/70 flex w-12 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r py-2">
            <ToolButton
              disabled={!past.length}
              label={t('undo')}
              onClick={undo}
            >
              <Undo2 className="size-4" />
            </ToolButton>
            <ToolButton
              disabled={!future.length}
              label={t('redo')}
              onClick={redo}
            >
              <Redo2 className="size-4" />
            </ToolButton>
            {pixelArt ? (
              <>
                <span className="bg-border my-1 h-px w-7" />
                {PIXEL_TOOLS.map((item) => (
                  <ToolButton
                    active={tool === item}
                    key={item}
                    label={t(`tools.${item}`)}
                    onClick={() => setTool(item)}
                  >
                    {toolIcons[item]}
                  </ToolButton>
                ))}
                <span className="bg-border my-1 h-px w-7" />
                <div className="mt-1 flex flex-col items-center gap-1">
                  <button
                    aria-label={t('brushSize')}
                    className="text-muted-foreground hover:text-primary"
                    onClick={() =>
                      setBrushSize((value) => Math.max(1, value - 1))
                    }
                    type="button"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="font-mono text-[10px]">{brushSize}px</span>
                  <button
                    aria-label={t('brushSize')}
                    className="text-muted-foreground hover:text-primary"
                    onClick={() =>
                      setBrushSize((value) => Math.min(8, value + 1))
                    }
                    type="button"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </>
            ) : null}
          </aside>

          <div
            className="relative flex min-w-0 flex-1 items-center justify-center overflow-auto"
            ref={stageRef}
          >
            <div
              className="bg-background relative overflow-hidden"
              style={{ width: canvasEdge, height: canvasEdge }}
            >
              {visible ? (
                <div
                  className="absolute"
                  style={{
                    width: imageWidth,
                    height: imageHeight,
                    left: (canvasEdge - imageWidth) / 2,
                    top: (canvasEdge - imageHeight) / 2,
                    transform: `rotate(${imageRotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                >
                  <canvas
                    className={cn(
                      'relative z-10 size-full bg-transparent [image-rendering:pixelated]',
                      pixelArt && !playing
                        ? 'cursor-crosshair'
                        : 'cursor-default'
                    )}
                    onPointerCancel={onPointerUp}
                    onPointerDown={onPointerDown}
                    onPointerLeave={clearPreview}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    ref={canvasRef}
                    style={{ width: imageWidth, height: imageHeight }}
                  />
                  <canvas
                    className="pointer-events-none absolute inset-0 z-20 [image-rendering:pixelated]"
                    ref={previewRef}
                  />
                </div>
              ) : null}
            </div>
            <div className="bg-card/80 absolute bottom-3 left-4 flex items-center gap-1 rounded-md border px-1.5 py-1">
              <button
                aria-label={t('zoomOut')}
                className="text-muted-foreground hover:text-primary flex size-6 items-center justify-center rounded-md"
                onClick={() =>
                  setZoomPercent((current) => clampZoom(current - ZOOM_STEP))
                }
                type="button"
              >
                <Minus className="size-3.5" />
              </button>
              <label className="text-muted-foreground flex items-center gap-2 font-mono text-xs">
                <span className="sr-only">{t('zoom')}</span>
                <input
                  aria-label={t('zoom')}
                  className="accent-primary h-1.5 w-20 cursor-pointer"
                  max={MAX_ZOOM}
                  min={MIN_ZOOM}
                  onChange={(event) =>
                    setZoomPercent(clampZoom(Number(event.target.value)))
                  }
                  step={ZOOM_STEP}
                  type="range"
                  value={zoomPercent}
                />
                <span className="w-10 text-right">{zoomPercent}%</span>
              </label>
              <button
                aria-label={t('zoomIn')}
                className="text-muted-foreground hover:text-primary flex size-6 items-center justify-center rounded-md"
                onClick={() =>
                  setZoomPercent((current) => clampZoom(current + ZOOM_STEP))
                }
                type="button"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>

          <aside className="bg-card/70 flex w-[260px] shrink-0 flex-col gap-4 overflow-y-auto border-l p-4">
            <div className="text-sm font-medium">
              {pixelArt ? t(`tools.${tool}`) : t('title')}
            </div>
            {pixelArt ? (
              <>
                <section className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="border-border size-12 overflow-hidden rounded-lg border">
                      <input
                        className="size-full cursor-pointer"
                        onChange={(event) => setColor(event.target.value)}
                        type="color"
                        value={color}
                      />
                    </label>
                    <span className="font-mono text-sm uppercase">{color}</span>
                  </div>
                  <div className="grid grid-cols-8 gap-1">
                    {palette.map((item) => (
                      <button
                        aria-label={item}
                        className={cn(
                          'border-border aspect-square rounded-sm border',
                          item === color && 'ring-primary ring-2'
                        )}
                        key={item}
                        onClick={() => setColor(item)}
                        style={{ background: item }}
                        type="button"
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <ToolButton
                      label={t('flipHorizontal')}
                      onClick={() => transformCurrent('flip-h')}
                    >
                      <FlipHorizontal className="size-4" />
                    </ToolButton>
                    <ToolButton
                      label={t('flipVertical')}
                      onClick={() => transformCurrent('flip-v')}
                    >
                      <FlipVertical className="size-4" />
                    </ToolButton>
                    <ToolButton label={t('rotate')} onClick={rotateImage}>
                      <RotateCw className="size-4" />
                    </ToolButton>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t('scale')}</span>
                      <span className="text-muted-foreground font-mono">
                        {t('scaleValue', {
                          value: Number(imageScale.toFixed(2)),
                        })}
                      </span>
                    </div>
                    <input
                      aria-label={t('scale')}
                      className="accent-primary h-1.5 w-full cursor-pointer"
                      max={MAX_IMAGE_SCALE}
                      min={MIN_IMAGE_SCALE}
                      onChange={(event) =>
                        setImageScale(
                          clampImageScale(Number(event.target.value))
                        )
                      }
                      step={IMAGE_SCALE_STEP}
                      type="range"
                      value={imageScale}
                    />
                  </div>
                </section>
              </>
            ) : null}
            <div className="mt-auto space-y-2">
              <Button
                className="w-full justify-start"
                onClick={exportSheet}
                variant="outline"
              >
                <Download className="size-4" />
                {t('downloadSheet')}
              </Button>
              <Button
                className="w-full justify-start"
                onClick={exportFrames}
                variant="outline"
              >
                <Download className="size-4" />
                {t('downloadFrames')}
              </Button>
            </div>
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
          </aside>
        </div>

        <section className="bg-card shrink-0 border-t p-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <Button
                aria-label={t('previousFrame')}
                disabled={!frames.length}
                onClick={() => {
                  const index = Math.max(0, selectedIndex - 1);
                  setSelectedId(frames[index]?.id || '');
                  setPlaying(false);
                }}
                size="icon-sm"
                variant="ghost"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                onClick={() => {
                  if (playing) {
                    const frame =
                      frames[playIndex % Math.max(frames.length, 1)];
                    if (frame) setSelectedId(frame.id);
                    setPlaying(false);
                    return;
                  }
                  setPlayIndex(Math.max(0, selectedIndex));
                  setPlaying(true);
                }}
                size="icon-sm"
                variant="ghost"
              >
                {playing ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
              </Button>
              <Button
                aria-label={t('nextFrame')}
                disabled={!frames.length}
                onClick={() => {
                  const index = Math.min(frames.length - 1, selectedIndex + 1);
                  setSelectedId(frames[index]?.id || '');
                  setPlaying(false);
                }}
                size="icon-sm"
                variant="ghost"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <span className="text-muted-foreground font-mono text-xs">
              {t('frameStatus', {
                current: playing
                  ? (playIndex % Math.max(frames.length, 1)) + 1
                  : Math.max(1, selectedIndex + 1),
                total: frames.length,
              })}
            </span>
            <label className="text-muted-foreground ml-auto flex items-center gap-2 text-xs">
              {t('fps')}
              <input
                className="border-input bg-background h-8 w-14 rounded-md border px-2 font-mono text-sm"
                max={60}
                min={1}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (!Number.isFinite(next)) return;
                  setFps(Math.min(60, Math.max(1, next)));
                }}
                type="number"
                value={fps}
              />
            </label>
          </div>
          <div className="bg-border my-2 h-px" />
          <DndContext
            id="animation-editor-frames"
            sensors={sensors}
            onDragEnd={dragEnd}
          >
            <SortableContext
              items={frames.map((frame) => frame.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex gap-3 overflow-x-auto px-2 pt-3 pb-1">
                {frames.map((frame, index) => (
                  <SortableFrame
                    key={frame.id}
                    canDelete={frames.length > 1}
                    deleteLabel={t('delete')}
                    frame={frame}
                    height={height}
                    label={String(index + 1)}
                    onDelete={() => deleteFrame(frame.id)}
                    onSelect={() => {
                      setSelectedId(frame.id);
                      setPlaying(false);
                      const pixels = pixelsRef.current.get(frame.id);
                      if (pixels) setPalette(extractPalette(pixels));
                    }}
                    pixels={pixelsRef.current.get(frame.id)}
                    selected={frame.id === (visible?.id || selectedId)}
                    width={width}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>
      </main>
    </TooltipProvider>
  );
}
