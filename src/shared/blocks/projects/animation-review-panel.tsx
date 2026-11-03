'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  readApiPayload,
  useProductApiFeedback,
} from '@/shared/lib/product-api-error';
import { cn } from '@/shared/lib/utils';

export type AnimationReviewGeneration = {
  id: string;
  projectId?: string;
  prompt?: string | null;
  status: string;
  items: Array<{
    id: string;
    video?: { url: string; saved: boolean; test: boolean };
    extraction?: {
      id: string;
      frame_count: number;
      frame_size: number;
      columns: number;
      rows: number;
      fps: number;
      loop?: boolean;
      spritesheet: { url: string };
      savedVersionId?: string;
      selected?: number[];
    };
  }>;
};

export function AnimationRegenerateDialog({
  open,
  onOpenChange,
  onConfirm,
  credits,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  onConfirm(): void;
  credits: number;
}) {
  const t = useTranslations('workspace.animationFlow');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>{t('regenerate')}</DialogTitle>
        <DialogDescription>
          {t('regenerateConfirm', { credits })}
        </DialogDescription>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            {t('confirmGenerate')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AnimationReviewPanel({
  generation,
  busy = false,
  onChange,
  onBusyChange,
}: {
  generation: AnimationReviewGeneration | null;
  busy?: boolean;
  onChange(value: AnimationReviewGeneration): void;
  onBusyChange?(value: boolean): void;
}) {
  const t = useTranslations('workspace.animationFlow');
  const notify = useProductApiFeedback();
  const [operation, setOperation] = useState('');
  const operationRef = useRef(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState(16);
  const [size, setSize] = useState('128');
  const [fps, setFps] = useState(12);
  const [loop, setLoop] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [playing, setPlaying] = useState(true);
  const [index, setIndex] = useState(0);
  const [duration, setDuration] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const task = generation?.items.find((item) => item.video);
  const draft = task?.extraction;
  const disabled = busy || Boolean(operation);
  const historyKey = generation?.projectId
    ? `sv_animation_history:${generation.projectId}`
    : '';
  useEffect(() => {
    if (!generation?.id || !task?.video || !historyKey) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(historyKey) || '[]');
      const ids = [generation.id, ...(Array.isArray(saved) ? saved : [])]
        .filter((id, i, all) => typeof id === 'string' && all.indexOf(id) === i)
        .slice(0, 12);
      // Keep creation order stable when revisiting a previous video.
      const ordered =
        Array.isArray(saved) && saved.includes(generation.id) ? saved : ids;
      setHistory(ordered);
      sessionStorage.setItem(historyKey, JSON.stringify(ordered));
    } catch {
      setHistory([generation.id]);
    }
  }, [generation?.id, historyKey, task?.video?.url]);
  useEffect(() => {
    setError('');
    setDuration(0);
  }, [generation?.id]);
  useEffect(() => {
    if (!draft) {
      setSelected([]);
      return;
    }
    setSelected(
      draft.selected || Array.from({ length: draft.frame_count }, (_, i) => i)
    );
    setFps(draft.fps);
    setCount(draft.frame_count);
    setSize(String(draft.frame_size));
    setLoop(draft.loop ?? true);
    setIndex(0);
  }, [draft?.id, draft?.savedVersionId]);
  useEffect(() => {
    if (!playing || selected.length < 2) return;
    const timer = setInterval(
      () => setIndex((v) => (v + 1) % selected.length),
      1000 / Math.max(1, fps)
    );
    return () => clearInterval(timer);
  }, [playing, selected.length, fps]);

  async function run(action: string) {
    if (!generation || !task || operationRef.current) return;
    operationRef.current = true;
    setOperation(action);
    setError('');
    onBusyChange?.(true);
    try {
      const fields =
        action === 'extract'
          ? {
              requestId: crypto.randomUUID(),
              frameCount: count,
              frameSize: Number(size),
              fps,
              loop,
            }
          : action === 'save-sheet'
            ? { extractionId: draft?.id, selected, fps }
            : {};
      const payload = await readApiPayload(
        await fetch(`/api/generations/${generation.id}/animation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, taskId: task.id, ...fields }),
        })
      );
      onChange(payload.data);
    } catch (reason) {
      setError(notify(reason));
    } finally {
      operationRef.current = false;
      setOperation('');
      onBusyChange?.(false);
    }
  }
  const frameStyle = (frame: number) =>
    draft
      ? {
          backgroundImage: `url("${draft.spritesheet.url}")`,
          backgroundSize: `${draft.columns * 100}% ${draft.rows * 100}%`,
          backgroundPosition: `${draft.columns > 1 ? ((frame % draft.columns) / (draft.columns - 1)) * 100 : 0}% ${draft.rows > 1 ? (Math.floor(frame / draft.columns) / (draft.rows - 1)) * 100 : 0}%`,
        }
      : {};
  if (!task?.video)
    return busy ? (
      <div
        className="border-border flex min-h-40 items-center justify-center gap-2 rounded-xl border"
        role="status"
      >
        <LoaderCircle className="size-5 animate-spin" />
        {t('generating')}
      </div>
    ) : null;
  return (
    <section
      className="border-border bg-background/40 min-w-0 space-y-3 rounded-xl border p-3"
      aria-label={t('preview')}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t('preview')}</h3>
        {history.length > 1 && (
          <Select
            value={generation!.id}
            disabled={disabled}
            onValueChange={async (id) => {
              if (operationRef.current) return;
              operationRef.current = true;
              setOperation('history');
              onBusyChange?.(true);
              try {
                const payload = await readApiPayload(
                  await fetch(`/api/generations/${id}`)
                );
                onChange(payload.data);
              } catch (reason) {
                setError(notify(reason));
              } finally {
                operationRef.current = false;
                setOperation('');
                onBusyChange?.(false);
              }
            }}
          >
            <SelectTrigger className="h-8 w-32" aria-label={t('versions')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {history.map((id, i) => (
                <SelectItem key={id} value={id}>
                  {t('version', { number: history.length - i })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {task.video.test && (
        <p className="text-primary text-sm">{t('testNotice')}</p>
      )}
      <video
        key={generation!.id}
        src={task.video.url}
        controls
        playsInline
        preload="metadata"
        className="bg-background max-h-72 w-full rounded-lg"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onError={() => setError(t('videoError'))}
      />
      {duration > 0 && Number.isFinite(duration) && (
        <p className="text-muted-foreground text-xs">
          {t('duration', { seconds: duration.toFixed(2) })}
        </p>
      )}
      {generation?.prompt && (
        <details className="text-muted-foreground text-sm">
          <summary className="cursor-pointer">{t('usedPrompt')}</summary>
          <p className="mt-2 whitespace-pre-wrap">{generation.prompt}</p>
        </details>
      )}
      <p className="text-muted-foreground text-sm">{t('regenerateHint')}</p>
      {!task.video.saved ? (
        <Button
          type="button"
          disabled={disabled}
          onClick={() => run('save-video')}
        >
          {operation === 'save-video' && (
            <LoaderCircle className="size-4 animate-spin" />
          )}
          {t('saveVideo')}
        </Button>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-sm">
              {t('frameCount')}
              <Input
                aria-label={t('frameCount')}
                className="h-9 w-20"
                type="number"
                min={2}
                max={32}
                value={count}
                disabled={disabled}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </label>
            <label className="space-y-1 text-sm">
              {t('frameSize')}
              <Select value={size} onValueChange={setSize} disabled={disabled}>
                <SelectTrigger className="h-9 w-24" aria-label={t('frameSize')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['64', '128', '256', '512'].map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}px
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-1 text-sm">
              {t('fps')}
              <Input
                aria-label={t('fps')}
                className="h-9 w-20"
                type="number"
                min={1}
                max={60}
                value={fps}
                disabled={disabled}
                onChange={(e) => setFps(Number(e.target.value))}
              />
            </label>
            <label className="flex h-9 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={loop}
                disabled={disabled}
                onChange={(e) => setLoop(e.target.checked)}
              />
              {t('loop')}
            </label>
            <Button
              type="button"
              disabled={
                disabled ||
                !Number.isInteger(count) ||
                count < 2 ||
                count > 32 ||
                !Number.isInteger(fps) ||
                fps < 1 ||
                fps > 60
              }
              onClick={() => run('extract')}
            >
              {operation === 'extract' && (
                <LoaderCircle className="size-4 animate-spin" />
              )}
              {draft ? t('reextract') : t('extract')}
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">{t('extractHint')}</p>
          {draft && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="bg-secondary size-28 shrink-0 rounded-lg [image-rendering:pixelated]"
                  role="img"
                  aria-label={t('framePreview')}
                  style={
                    selected.length
                      ? frameStyle(selected[index % selected.length])
                      : {}
                  }
                />
                <div className="space-y-2">
                  <p className="text-sm">
                    {t('selected', {
                      count: selected.length,
                      total: draft.frame_count,
                    })}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={selected.length === 0}
                    onClick={() => setPlaying(!playing)}
                  >
                    {playing ? (
                      <Pause className="size-4" />
                    ) : (
                      <Play className="size-4" />
                    )}
                    {playing ? t('pause') : t('play')}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-8 gap-1 max-[560px]:grid-cols-4">
                {Array.from({ length: draft.frame_count }, (_, i) => (
                  <button
                    type="button"
                    key={i}
                    aria-label={t('frame', { number: i + 1 })}
                    aria-pressed={selected.includes(i)}
                    disabled={disabled || Boolean(draft.savedVersionId)}
                    onClick={() =>
                      setSelected((values) =>
                        values.includes(i)
                          ? values.filter((v) => v !== i)
                          : [...values, i].sort((a, b) => a - b)
                      )
                    }
                    className={cn(
                      'bg-secondary relative aspect-square rounded-md border-2 [image-rendering:pixelated]',
                      selected.includes(i)
                        ? 'border-primary'
                        : 'border-transparent opacity-40'
                    )}
                    style={frameStyle(i)}
                  >
                    <span className="bg-background/80 absolute right-0 bottom-0 px-1 text-xs">
                      {i + 1}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={
                    disabled ||
                    !selected.length ||
                    !Number.isInteger(fps) ||
                    fps < 1 ||
                    fps > 60 ||
                    Boolean(draft.savedVersionId)
                  }
                  onClick={() => run('save-sheet')}
                >
                  {operation === 'save-sheet' && (
                    <LoaderCircle className="size-4 animate-spin" />
                  )}
                  {draft.savedVersionId ? t('saved') : t('saveSheet')}
                </Button>
                {draft.savedVersionId && (
                  <Button type="button" variant="outline" asChild>
                    <Link href={`/editor/animations/${draft.savedVersionId}`}>
                      {t('editDownload')}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
