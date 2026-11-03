'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ChevronsLeftRight,
  LoaderCircle,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import {
  characterImageEndpoint,
  prepareCharacterPixels,
  type CharacterImageMetadata,
  type CharacterPixelDraft,
} from '@/shared/lib/character-image-client';
import type { CharacterImageTarget } from '@/shared/services/character-image-repair';

export type CharacterImageSaved = {
  fileId: string;
  url: string;
  revision: string;
  cleanupPending: boolean;
};
export { characterImageEndpoint } from '@/shared/lib/character-image-client';

export function CharacterImageDialog({
  url,
  alt,
  title,
  target,
  onSaved,
  children,
}: {
  url: string;
  alt: string;
  title: string;
  target?: CharacterImageTarget;
  onSaved?: (result: CharacterImageSaved) => void;
  children: ReactNode;
}) {
  const t = useTranslations('workspace.pixelRepair');
  const [open, setOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [metadata, setMetadata] = useState<CharacterImageMetadata | null>(null);
  const [draft, setDraft] = useState<CharacterPixelDraft | null>(null);
  const [comparisonPosition, setComparisonPosition] = useState(50);
  const [busy, setBusy] = useState<'repair' | 'save' | ''>('');
  const [error, setError] = useState('');
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
  const controller = useRef<AbortController | null>(null);
  const endpoint = target ? characterImageEndpoint(target) : '';
  useEffect(() => setCurrentUrl(url), [url]);
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
  const displayWidth = imageSize.width * fitScale * zoom;
  const displayHeight = imageSize.height * fitScale * zoom;
  const canPan =
    displayWidth + 32 > viewportSize.width + 1 ||
    displayHeight + 32 > viewportSize.height + 1;
  useEffect(() => {
    const node = viewport;
    if (!node) return;
    node.scrollLeft = (node.scrollWidth - node.clientWidth) / 2;
    node.scrollTop = (node.scrollHeight - node.clientHeight) / 2;
  }, [zoom, displayWidth, displayHeight, viewport]);
  useEffect(
    () => () => {
      controller.current?.abort();
    },
    []
  );
  useEffect(
    () => () => {
      if (draft) URL.revokeObjectURL(draft.url);
    },
    [draft]
  );
  useEffect(() => {
    if (!open || !endpoint) return;
    const abort = new AbortController();
    setMetadata(null);
    fetch(`${endpoint}&info=1`, { signal: abort.signal })
      .then(async (response) => {
        // Uploaded/untyped assets retain ordinary zoom; do not infer style from their appearance.
        if (response.status === 404) return;
        if (!response.ok) throw new Error('IMAGE_READ_FAILED');
        const payload = await response.json();
        setMetadata(payload.data);
      })
      .catch(() => {
        if (!abort.signal.aborted) setError(t('loadError'));
      });
    return () => abort.abort();
  }, [open, endpoint, t]);

  const close = (value: boolean) => {
    if (busy === 'save') return;
    controller.current?.abort();
    setBusy('');
    setDraft(null);
    setError('');
    setComparisonPosition(50);
    setZoom(1);
    pan.current = null;
    setPanning(false);
    setOpen(value);
  };
  const repair = async () => {
    if (!metadata || busy) return;
    const abort = new AbortController();
    controller.current = abort;
    setBusy('repair');
    setError('');
    try {
      const result = await prepareCharacterPixels(
        target!,
        metadata,
        abort.signal
      );
      if (!abort.signal.aborted) {
        setDraft(result);
        setComparisonPosition(50);
      } else URL.revokeObjectURL(result.url);
    } catch (cause) {
      if (!abort.signal.aborted)
        setError(
          t(
            cause instanceof Error && cause.message === 'IMAGE_CHANGED'
              ? 'changed'
              : 'repairError'
          )
        );
    } finally {
      if (controller.current === abort) {
        if (!abort.signal.aborted) setBusy('');
      }
    }
  };
  const save = async (cleanupOnly = false) => {
    if (!target || !metadata || busy || (!cleanupOnly && !draft)) return;
    setBusy('save');
    setError('');
    try {
      const form = new FormData();
      if (target.fileId) form.set('fileId', target.fileId);
      else form.set('generationId', target.generationId!);
      form.set('revision', metadata.revision);
      if (cleanupOnly) form.set('action', 'cleanup');
      else form.set('image', draft!.blob, 'character.png');
      const response = await fetch('/api/character-images', {
        method: 'POST',
        body: form,
      });
      const payload = await response.json();
      if (!response.ok || payload.code !== 0) throw new Error(payload.message);
      const result = payload.data as CharacterImageSaved;
      setCurrentUrl(result.url);
      setMetadata({
        ...metadata,
        revision: result.revision,
        cleanupPending: result.cleanupPending,
      });
      setDraft(null);
      setComparisonPosition(50);
      onSaved?.(result);
      if (!cleanupOnly) {
        setZoom(1);
        setOpen(false);
      }
    } catch (cause) {
      setError(
        t(
          cause instanceof Error && cause.message === 'IMAGE_CHANGED'
            ? 'changed'
            : 'saveError'
        )
      );
    } finally {
      setBusy('');
    }
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="w-[calc(100%-2.5rem)] max-w-4xl rounded-xl p-4"
        showCloseButton={false}
        onInteractOutside={(event) => {
          if (busy === 'save') event.preventDefault();
        }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          {alt || title}
        </DialogDescription>
        <DialogClose asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={busy === 'save'}
            aria-label={t('close')}
            className="bg-background absolute top-0 right-0 z-50 size-9 translate-x-1/2 -translate-y-1/2 rounded-full border shadow-md"
          >
            <X className="size-4" />
          </Button>
        </DialogClose>
        <div className="bg-secondary/45 relative h-[65vh] min-h-48 overflow-hidden rounded-lg border">
          <div
            ref={setViewport}
            className={`size-full overflow-auto ${canPan && !busy ? (panning ? 'cursor-grabbing touch-none select-none' : 'cursor-grab touch-none select-none') : ''}`}
            onPointerDown={(event) => {
              if (!canPan || busy || event.button !== 0 || !event.isPrimary)
                return;
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
              event.currentTarget.scrollTop =
                start.top - (event.clientY - start.y);
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
                width: Math.max(viewportSize.width, displayWidth + 32),
                height: Math.max(viewportSize.height, displayHeight + 32),
              }}
            >
              <div
                className="focus-within:ring-ring relative shrink-0 overflow-hidden rounded-md leading-none focus-within:ring-2 focus-within:ring-offset-2"
                style={{
                  width: displayWidth || undefined,
                  height: displayHeight || undefined,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentUrl}
                  alt={alt}
                  draggable={false}
                  onLoad={(event) =>
                    setImageSize({
                      width: event.currentTarget.naturalWidth,
                      height: event.currentTarget.naturalHeight,
                    })
                  }
                  className="block size-full object-contain [image-rendering:pixelated]"
                />
                {draft ? (
                  <>
                    <div
                      className="pointer-events-none absolute inset-0 overflow-hidden"
                      style={{
                        clipPath: `inset(0 ${100 - comparisonPosition}% 0 0)`,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={draft.url}
                        alt=""
                        draggable={false}
                        className="size-full object-contain [image-rendering:pixelated]"
                      />
                    </div>
                    <span className="pointer-events-none absolute top-2 left-2 z-20 rounded-md bg-black/65 px-2 py-1 text-xs leading-none text-white">
                      {t('resultLabel')}
                    </span>
                    <span className="pointer-events-none absolute top-2 right-2 z-20 rounded-md bg-black/65 px-2 py-1 text-xs leading-none text-white">
                      {t('originalLabel')}
                    </span>
                    <div
                      className="pointer-events-none absolute inset-y-0 z-20 w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
                      style={{ left: `${comparisonPosition}%` }}
                    >
                      <span className="bg-background text-foreground absolute top-1/2 left-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border shadow-md">
                        <ChevronsLeftRight className="size-4" />
                      </span>
                    </div>
                    <div
                      role="slider"
                      tabIndex={busy ? -1 : 0}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(comparisonPosition)}
                      aria-disabled={!!busy}
                      aria-label={t('comparisonLabel')}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        if (busy || event.button !== 0) return;
                        event.preventDefault();
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                      onPointerMove={(event) => {
                        if (
                          !event.currentTarget.hasPointerCapture(
                            event.pointerId
                          )
                        )
                          return;
                        const rect =
                          event.currentTarget.parentElement!.getBoundingClientRect();
                        setComparisonPosition(
                          Math.max(
                            0,
                            Math.min(
                              100,
                              ((event.clientX - rect.left) / rect.width) * 100
                            )
                          )
                        );
                      }}
                      onPointerUp={(event) => {
                        if (
                          event.currentTarget.hasPointerCapture(event.pointerId)
                        )
                          event.currentTarget.releasePointerCapture(
                            event.pointerId
                          );
                      }}
                      onKeyDown={(event) => {
                        if (
                          busy ||
                          !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(
                            event.key
                          )
                        )
                          return;
                        event.preventDefault();
                        setComparisonPosition((value) =>
                          event.key === 'Home'
                            ? 0
                            : event.key === 'End'
                              ? 100
                              : Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    value +
                                      (event.key === 'ArrowRight' ? 5 : -5)
                                  )
                                )
                        );
                      }}
                      style={{ left: `${comparisonPosition}%` }}
                      className="absolute inset-y-0 z-30 w-9 -translate-x-1/2 cursor-ew-resize touch-none"
                    />
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <div
            className="bg-background/90 absolute bottom-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-lg border p-1 shadow-md backdrop-blur-sm"
            role="group"
            aria-label={t('zoom')}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('zoomOut')}
              title={t('zoomOut')}
              disabled={!!busy || zoom <= 0.5}
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
              disabled={!!busy}
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
              disabled={!!busy || zoom >= 8}
              onClick={() => setZoom((value) => Math.min(8, value * 1.5))}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          {busy ? (
            <div
              className="bg-background/75 absolute inset-0 z-50 flex items-center justify-center gap-2"
              role="status"
            >
              <LoaderCircle className="size-5 animate-spin" />
              {t(busy === 'save' ? 'saving' : 'repairing')}
            </div>
          ) : null}
        </div>
        {metadata?.style === 'pixel-art' ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {draft ? (
              <>
                <Button
                  variant="ghost"
                  disabled={!!busy}
                  onClick={() => {
                    setDraft(null);
                    setComparisonPosition(50);
                  }}
                >
                  {t('discard')}
                </Button>
                <Button disabled={!!busy} onClick={() => save()}>
                  {t('save')}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                disabled={!!busy || metadata.cleanupPending}
                onClick={repair}
              >
                <Sparkles className="size-4" />
                {t('repair')}
              </Button>
            )}
          </div>
        ) : null}
        {metadata?.cleanupPending ? (
          <div className="text-center text-sm">
            <p>{t('cleanupPending')}</p>
            <Button
              variant="ghost"
              disabled={!!busy}
              onClick={() => save(true)}
            >
              {t('retryCleanup')}
            </Button>
          </div>
        ) : null}
        {error ? (
          <p className="text-destructive text-center text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
