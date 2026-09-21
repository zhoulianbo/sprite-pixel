'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  Download,
  GripVertical,
  LoaderCircle,
  Pause,
  Play,
  Redo2,
  Save,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, useRouter } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import {
  download,
  makeCanvas,
  pngBlob,
  zipFiles,
} from '@/shared/lib/sprite-tools/browser';
import {
  readApiPayload,
  useProductApiFeedback,
} from '@/shared/lib/product-api-error';
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
  clip: { id: string; direction: string };
  set: {
    id: string;
    loop: boolean;
    projectId: string;
    itemId: string;
    name: string;
  };
  item: { id: string; name: string };
  frames: EditorFrame[];
};

type Snapshot = { frames: EditorFrame[]; fps: number; loop: boolean };

async function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function renderFrame(frame: EditorFrame, width: number, height: number) {
  const image = await loadImage(frame.file.url);
  const crop = frame.metadata.crop || {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  };
  const { canvas, context } = makeCanvas(width, height);
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
  return canvas;
}

function FrameCanvas({
  frame,
  width,
  height,
}: {
  frame: EditorFrame;
  width: number;
  height: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    renderFrame(frame, width, height).then((source) => {
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
    });
    return () => {
      cancelled = true;
    };
  }, [frame, height, width]);
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
  width,
  height,
  label,
}: {
  frame: EditorFrame;
  selected: boolean;
  onSelect: () => void;
  width: number;
  height: number;
  label: string;
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
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'bg-muted/40 relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border p-1.5',
        selected && 'border-primary ring-primary/20 ring-2',
        isDragging && 'z-10 opacity-60'
      )}
    >
      <FrameCanvas frame={frame} width={width} height={height} />
      <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1 font-mono text-[9px] text-white">
        {label}
      </span>
      <span
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 flex size-5 cursor-grab items-center justify-center rounded bg-black/65 text-white active:cursor-grabbing"
      >
        <GripVertical className="size-3" />
      </span>
    </button>
  );
}

export function AnimationEditor({ data }: { data: EditorData }) {
  const t = useTranslations('workspace.editor');
  const td = useTranslations('workspace.directions');
  const notifyApiError = useProductApiFeedback();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frames, setFrames] = useState(data.frames);
  const [selectedId, setSelectedId] = useState(data.frames[0]?.id || '');
  const [fps, setFps] = useState(Number(data.version.fps));
  const [loop, setLoop] = useState(Boolean(data.set.loop));
  const [zoom, setZoom] = useState(5);
  const [playing, setPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  const selected = frames.find((frame) => frame.id === selectedId) || frames[0];
  const visible = playing
    ? frames[playIndex % Math.max(frames.length, 1)]
    : selected;

  const snapshot = (): Snapshot => ({
    frames: frames.map((frame) => ({ ...frame })),
    fps,
    loop,
  });
  const commit = (next: Partial<Snapshot>) => {
    setPast((current) => [...current.slice(-29), snapshot()]);
    setFuture([]);
    if (next.frames) setFrames(next.frames);
    if (next.fps !== undefined) setFps(next.fps);
    if (next.loop !== undefined) setLoop(next.loop);
    setDirty(true);
  };
  const restore = (value: Snapshot, remainsDirty = true) => {
    setFrames(value.frames);
    setFps(value.fps);
    setLoop(value.loop);
    if (!value.frames.some((frame) => frame.id === selectedId)) {
      setSelectedId(value.frames[0]?.id || '');
    }
    setDirty(remainsDirty);
  };
  const undo = () => {
    const value = past.at(-1);
    if (!value) return;
    setFuture((current) => [snapshot(), ...current]);
    setPast((current) => current.slice(0, -1));
    restore(value, past.length > 1);
  };
  const redo = () => {
    const value = future[0];
    if (!value) return;
    setPast((current) => [...current, snapshot()]);
    setFuture((current) => current.slice(1));
    restore(value);
  };

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const timer = window.setInterval(() => {
      setPlayIndex((current) => {
        const next = current + 1;
        if (!loop && next >= frames.length) {
          setPlaying(false);
          return frames.length - 1;
        }
        return next % frames.length;
      });
    }, 1000 / fps);
    return () => window.clearInterval(timer);
  }, [fps, frames.length, loop, playing]);

  useEffect(() => {
    if (!visible || !canvasRef.current) return;
    let cancelled = false;
    renderFrame(
      visible,
      data.version.frameWidth,
      data.version.frameHeight
    ).then((source) => {
      if (cancelled || !canvasRef.current) return;
      const canvas = canvasRef.current;
      canvas.width = data.version.frameWidth;
      canvas.height = data.version.frameHeight;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(source, 0, 0);
      source.width = 0;
      source.height = 0;
    });
    return () => {
      cancelled = true;
    };
  }, [data.version.frameHeight, data.version.frameWidth, visible]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = frames.findIndex((frame) => frame.id === active.id);
    const newIndex = frames.findIndex((frame) => frame.id === over.id);
    commit({ frames: arrayMove(frames, oldIndex, newIndex) });
  };

  const updateSelected = (updates: Partial<EditorFrame>) => {
    if (!selected) return;
    commit({
      frames: frames.map((frame) =>
        frame.id === selected.id ? { ...frame, ...updates } : frame
      ),
    });
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/animations/${data.clip.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentVersionId: data.version.id,
          fps,
          loop,
          frames: frames.map((frame) => ({
            frameId: frame.id,
            durationMs: frame.durationMs,
            offsetX: frame.offsetX,
            offsetY: frame.offsetY,
          })),
        }),
      });
      const payload = await readApiPayload(response);
      setDirty(false);
      router.replace(`/editor/animations/${payload.data.version.id}`);
    } catch (error) {
      notifyApiError(error);
      setError(t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  const renderedFrames = async () => {
    const output: Array<{ name: string; blob: Blob }> = [];
    for (let index = 0; index < frames.length; index++) {
      const canvas = await renderFrame(
        frames[index],
        data.version.frameWidth,
        data.version.frameHeight
      );
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
    const columns = Math.min(4, entries.length);
    const rows = Math.ceil(entries.length / columns);
    const { canvas, context } = makeCanvas(
      columns * data.version.frameWidth,
      rows * data.version.frameHeight
    );
    for (let index = 0; index < entries.length; index++) {
      const image = await createImageBitmap(entries[index].blob);
      context.drawImage(
        image,
        (index % columns) * data.version.frameWidth,
        Math.floor(index / columns) * data.version.frameHeight
      );
      image.close();
    }
    const blob = await pngBlob(canvas);
    canvas.width = 0;
    canvas.height = 0;
    download(blob, `${data.item.name}-${data.set.name}-spritesheet.png`);
  };

  const selectedIndex = useMemo(
    () => frames.findIndex((frame) => frame.id === selectedId),
    [frames, selectedId]
  );

  return (
    <main className="text-foreground flex min-h-screen flex-col bg-[#15171c]">
      <header className="bg-card/80 flex min-h-14 flex-wrap items-center gap-3 border-b px-3 py-2 sm:px-5">
        <Button asChild size="icon" variant="ghost">
          <Link
            href={`/dashboard/projects/${data.set.projectId}/characters/${data.set.itemId}`}
            aria-label={t('back')}
          >
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading truncate text-sm font-semibold">
            {data.item.name} · {data.set.name}
          </h1>
          <p className="text-muted-foreground font-mono text-[10px]">
            v{data.version.versionNo} ·{' '}
            {td.has(data.clip.direction as never)
              ? td(data.clip.direction as never)
              : data.clip.direction}
          </p>
        </div>
        {dirty && <span className="text-primary text-xs">{t('unsaved')}</span>}
        <Button
          onClick={save}
          disabled={saving || !dirty || frames.length === 0}
        >
          {saving ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {saving ? t('saving') : t('save')}
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="flex min-h-[520px] min-w-0 items-center justify-center overflow-auto p-6">
          <div className="flex min-h-[420px] min-w-[min(100%,520px)] items-center justify-center rounded-xl border bg-[#e9e9e9] p-8 shadow-2xl shadow-black/35">
            {visible ? (
              <canvas
                ref={canvasRef}
                style={{
                  width: data.version.frameWidth * zoom,
                  height: data.version.frameHeight * zoom,
                  maxWidth: '100%',
                  maxHeight: '68vh',
                  imageRendering: 'pixelated',
                }}
              />
            ) : null}
          </div>
        </section>

        <aside className="bg-card/65 space-y-4 border-t p-4 lg:border-t-0 lg:border-l">
          <section className="bg-background/45 rounded-lg border p-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-mono text-[10px] font-bold tracking-[0.12em] uppercase">
                {t('history')}
              </h2>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={undo}
                  disabled={!past.length}
                  aria-label={t('undo')}
                >
                  <Undo2 className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={redo}
                  disabled={!future.length}
                  aria-label={t('redo')}
                >
                  <Redo2 className="size-4" />
                </Button>
              </div>
            </div>
          </section>
          <section className="bg-background/45 space-y-4 rounded-lg border p-3">
            <h2 className="font-mono text-[10px] font-bold tracking-[0.12em] uppercase">
              {t('controls')}
            </h2>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setPlayIndex(Math.max(0, selectedIndex));
                  setPlaying((value) => !value);
                }}
              >
                {playing ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
                {playing ? t('pause') : t('play')}
              </Button>
              <span className="font-mono text-xs">
                {selectedIndex + 1}/{frames.length}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="editor-fps">{t('fps')}</Label>
                <Input
                  id="editor-fps"
                  type="number"
                  min={1}
                  max={60}
                  value={fps}
                  onChange={(event) =>
                    commit({
                      fps: Math.min(
                        60,
                        Math.max(1, Number(event.target.value))
                      ),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editor-zoom">{t('zoom')}</Label>
                <Input
                  id="editor-zoom"
                  type="number"
                  min={1}
                  max={12}
                  value={zoom}
                  onChange={(event) =>
                    setZoom(
                      Math.min(12, Math.max(1, Number(event.target.value)))
                    )
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="editor-loop">{t('loop')}</Label>
              <Switch
                id="editor-loop"
                checked={loop}
                onCheckedChange={(value) => commit({ loop: value })}
              />
            </div>
          </section>
          {selected && (
            <section className="bg-background/45 space-y-3 rounded-lg border p-3">
              <h2 className="font-mono text-[10px] font-bold tracking-[0.12em] uppercase">
                {t('offset')}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t('offsetX')}</Label>
                  <Input
                    type="number"
                    value={selected.offsetX}
                    onChange={(event) =>
                      updateSelected({ offsetX: Number(event.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('offsetY')}</Label>
                  <Input
                    type="number"
                    value={selected.offsetY}
                    onChange={(event) =>
                      updateSelected({ offsetY: Number(event.target.value) })
                    }
                  />
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                disabled={frames.length <= 1}
                onClick={() =>
                  commit({
                    frames: frames.filter((frame) => frame.id !== selected.id),
                  })
                }
              >
                <Trash2 className="size-4" />
                {t('delete')}
              </Button>
            </section>
          )}
          <section className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={exportSheet}
            >
              <Download className="size-4" />
              {t('downloadSheet')}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={exportFrames}
            >
              <Download className="size-4" />
              {t('downloadFrames')}
            </Button>
          </section>
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
        </aside>
      </div>

      <section className="bg-card border-t px-3 py-3 sm:px-5">
        <DndContext sensors={sensors} onDragEnd={dragEnd}>
          <SortableContext
            items={frames.map((frame) => frame.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-2 overflow-x-auto pb-1">
              {frames.map((frame, index) => (
                <SortableFrame
                  key={frame.id}
                  frame={frame}
                  selected={frame.id === selectedId}
                  onSelect={() => {
                    setSelectedId(frame.id);
                    setPlaying(false);
                  }}
                  width={data.version.frameWidth}
                  height={data.version.frameHeight}
                  label={String(index + 1)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>
    </main>
  );
}
