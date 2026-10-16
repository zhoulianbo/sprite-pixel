'use client';

import { useEffect, useRef, useState } from 'react';
import { Clock, Download, Film, Infinity, UserRoundCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  FRAME_SIZES,
  VIDEO_DEFAULTS,
  VIDEO_LIMIT,
  type VideoOptions,
} from '@/config/tools/free-tools';
import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { readImages } from '@/shared/lib/sprite-tools/browser';
import { defaultSlice } from '@/shared/lib/sprite-tools/core';
import {
  videoMime,
  videoOptionsSchema,
} from '@/shared/lib/sprite-tools/video-contract';
import { cn } from '@/shared/lib/utils';
import type { SpriteMediaResult } from '@/shared/services/sprite-media-processor';

import { useBlobUrl } from './previews';
import { SpriteWorkbench, type SheetInput } from './workbench';

async function api(path: string, body: unknown, signal: AbortSignal) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const data = await response.json();
  if (!response.ok || data.code !== 0)
    throw new Error(
      response.status === 429
        ? 'RATE_LIMIT'
        : data.message || 'PROCESSING_FAILED'
    );
  return data.data;
}
export function VideoWorkbench() {
  const t = useTranslations('tools.sprites.ui.freeTools');
  const ui = useTranslations('tools.sprites.ui');
  const [file, setFile] = useState<File>();
  const [options, setOptions] = useState<VideoOptions>(VIDEO_DEFAULTS);
  const [result, setResult] = useState<SheetInput>();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>();
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [workspace, setWorkspace] = useState(false);
  const uploaded = useRef<{ file: File; token: string } | undefined>(undefined);
  const operation = useRef<AbortController | undefined>(undefined);
  const picker = useRef<HTMLInputElement>(null);
  const videoUrl = useBlobUrl(file);
  useEffect(() => () => operation.current?.abort(), []);
  function choose(next?: File) {
    if (!next || operation.current) return;
    if (!next.size || next.size > VIDEO_LIMIT) {
      setError(t('errors.FILE_TOO_LARGE'));
      return;
    }
    setFile(next);
    uploaded.current = undefined;
    setResult(undefined);
    setError('');
  }
  async function process() {
    if (!file || operation.current) return;
    if (!videoOptionsSchema.safeParse(options).success) {
      setError(t('errors.INVALID_PARAMETERS'));
      return;
    }
    setWorkspace(true);
    const controller = new AbortController();
    operation.current = controller;
    const { signal } = controller;
    setBusy(true);
    setError('');
    setProgress(undefined);
    try {
      if (uploaded.current?.file !== file) {
        const contentType = videoMime(
          new Uint8Array(await file.slice(0, 4096).arrayBuffer())
        );
        const signed = await api(
          '/api/tools/video-to-sprite-sheet/upload',
          { filename: file.name, size: file.size, contentType },
          signal
        );
        setProgress(0);
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const abort = () => xhr.abort();
          const cleanup = () => signal.removeEventListener('abort', abort);
          xhr.open('PUT', signed.uploadUrl);
          Object.entries(signed.headers as Record<string, string>).forEach(
            ([key, value]) => xhr.setRequestHeader(key, value)
          );
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable)
              setProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () => {
            cleanup();
            xhr.status >= 200 && xhr.status < 300
              ? resolve()
              : reject(new Error('UPLOAD_FAILED'));
          };
          xhr.onerror = () => {
            cleanup();
            reject(new Error('UPLOAD_FAILED'));
          };
          xhr.onabort = () => {
            cleanup();
            reject(new DOMException('Aborted', 'AbortError'));
          };
          signal.addEventListener('abort', abort, { once: true });
          if (signal.aborted) {
            cleanup();
            reject(new DOMException('Aborted', 'AbortError'));
            return;
          }
          xhr.send(file);
        });
        uploaded.current = { file, token: signed.token };
      }
      setProgress(undefined);
      const data: SpriteMediaResult = await api(
        '/api/tools/video-to-sprite-sheet/process',
        { token: uploaded.current!.token, options },
        signal
      );
      const response = await fetch('/api/tools/video-to-sprite-sheet/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: uploaded.current!.token,
          options,
        }),
        signal,
      });
      if (!response.ok) throw new Error('RESULT_FAILED');
      const [sheet] = await readImages(
        [
          new File([await response.blob()], 'sprite-sheet.png', {
            type: 'image/png',
          }),
        ],
        [],
        signal,
        () => {}
      );
      signal.throwIfAborted();
      setResult({
        sheet,
        slice: {
          ...defaultSlice,
          columns: data.columns,
          rows: data.rows,
          width: data.frame_size,
          height: data.frame_size,
        },
        fps: data.fps,
        frameCount: data.frame_count,
      });
    } catch (e) {
      if (!signal.aborted) {
        const code = e instanceof Error ? e.message : '';
        if (code === 'UPLOAD_EXPIRED') uploaded.current = undefined;
        setError(
          t(
            t.has(`errors.${code}`)
              ? `errors.${code}`
              : 'errors.PROCESSING_FAILED'
          )
        );
      }
    } finally {
      if (!signal.aborted) {
        setBusy(false);
        setProgress(undefined);
      }
      if (operation.current === controller) operation.current = undefined;
    }
  }
  const controls = (compact: boolean) => (
    <div className={compact ? 'space-y-2' : 'mt-5'}>
      <div className="flex flex-wrap items-end gap-3">
        <fieldset
          disabled={busy}
          className={
            compact
              ? 'flex min-w-0 flex-1 flex-wrap items-end gap-3'
              : 'grid min-w-[min(100%,36rem)] flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'
          }
        >
          <label
            className={compact ? 'w-24 space-y-1 text-xs' : 'space-y-2 text-sm'}
          >
            <span>{t('frameCount')}</span>
            <input
              type="number"
              min={2}
              max={32}
              step={1}
              value={
                Number.isNaN(options.frame_count) ? '' : options.frame_count
              }
              onChange={(e) =>
                setOptions({ ...options, frame_count: e.target.valueAsNumber })
              }
              className={
                compact
                  ? 'bg-background h-8 w-full rounded-md border px-2 text-sm'
                  : 'bg-background h-10 w-full rounded-md border px-3'
              }
            />
          </label>
          <div
            className={compact ? 'w-36 space-y-1 text-xs' : 'space-y-2 text-sm'}
          >
            <label htmlFor="video-frame-size">{t('frameSize')}</label>
            <Select
              value={String(options.frame_size)}
              onValueChange={(value) =>
                setOptions({ ...options, frame_size: Number(value) })
              }
              disabled={busy}
            >
              <SelectTrigger
                id="video-frame-size"
                size={compact ? 'sm' : 'default'}
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FRAME_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} × {size} px
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label
            className={compact ? 'w-24 space-y-1 text-xs' : 'space-y-2 text-sm'}
            title={t('fpsHelp')}
          >
            <span>{t('fps')}</span>
            <input
              type="number"
              min={1}
              max={60}
              step={1}
              value={Number.isNaN(options.fps) ? '' : options.fps}
              onChange={(e) =>
                setOptions({ ...options, fps: e.target.valueAsNumber })
              }
              className={
                compact
                  ? 'bg-background h-8 w-full rounded-md border px-2 text-sm'
                  : 'bg-background h-10 w-full rounded-md border px-3'
              }
            />
          </label>
          <label
            className={
              compact
                ? 'flex h-8 items-center gap-2 self-end text-xs'
                : 'flex h-10 items-center gap-3 self-end text-sm'
            }
            title={t('loopHelp')}
          >
            <input
              type="checkbox"
              checked={options.loop}
              onChange={(e) =>
                setOptions({ ...options, loop: e.target.checked })
              }
              className="accent-primary size-4"
            />
            {t('loop')}
          </label>
        </fieldset>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
          {busy && (
            <Button
              variant="outline"
              onClick={() => {
                operation.current?.abort();
                operation.current = undefined;
                setBusy(false);
                setProgress(undefined);
              }}
            >
              {t('cancel')}
            </Button>
          )}
          <Button disabled={!file || busy} onClick={process}>
            {busy ? t('processing') : result ? t('extractAgain') : t('extract')}
          </Button>
        </div>
      </div>
      {busy && (
        <div role="status" className="text-sm">
          {progress === undefined
            ? t('serverProcessing')
            : t('uploadProgress', { progress })}
          {progress !== undefined && (
            <progress value={progress} max={100} className="mt-2 w-full" />
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
  const sourceSlot = (
    <div
      className={cn(
        'rounded-lg border-2 border-dashed p-2',
        dragging
          ? 'border-accent-foreground/30! bg-accent-foreground/15'
          : 'border-accent-foreground/30! bg-accent/40'
      )}
      onDragOver={(event) => {
        event.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!busy) choose(event.dataTransfer.files?.[0]);
      }}
    >
      {videoUrl && (
        <video
          src={videoUrl}
          controls
          preload="metadata"
          className="bg-background block h-28 w-full object-contain"
        />
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => picker.current?.click()}
        className="text-accent-foreground focus-visible:outline-ring mt-2 w-full text-sm focus-visible:outline-2"
      >
        {ui('replaceSource')}
      </button>
    </div>
  );
  const promises = [
    { icon: Infinity, label: t('promiseFree') },
    { icon: UserRoundCheck, label: t('promiseNoLogin') },
    { icon: Clock, label: t('promiseServer') },
    { icon: Download, label: t('promiseDownload') },
  ];
  return (
    <div id="workbench" className="scroll-mt-24 space-y-5">
      <input
        ref={picker}
        aria-label={t('chooseVideo')}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
        disabled={busy}
        onChange={(e) => {
          choose(e.target.files?.[0]);
          e.target.value = '';
        }}
        className="sr-only"
      />
      {workspace ? (
        <SpriteWorkbench
          key={
            busy
              ? 'extracting'
              : (result?.sheet.id ?? `${file?.name}-${file?.lastModified}`)
          }
          tool="splitter"
          input={busy ? undefined : result}
          remoteSource
          sourceSlot={sourceSlot}
          toolbar={controls(true)}
          notice={
            busy
              ? progress === undefined
                ? t('serverProcessing')
                : t('uploadProgress', { progress })
              : undefined
          }
        />
      ) : (
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
              onDragOver={(event) => {
                event.preventDefault();
                if (!busy) setDragging(true);
              }}
              onDragLeave={(event) => {
                if (
                  !(event.relatedTarget instanceof Node) ||
                  !event.currentTarget.contains(event.relatedTarget)
                )
                  setDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                if (!busy) choose(event.dataTransfer.files?.[0]);
              }}
              className={cn(
                'group focus-visible:outline-ring flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-5 py-9 text-center transition-[background-color,border-color,transform] duration-200 focus-visible:outline-2 active:translate-y-px',
                dragging
                  ? 'border-primary bg-primary/10'
                  : 'border-muted-foreground/40 bg-vault-navy/50 hover:border-primary/70 hover:bg-primary/5'
              )}
            >
              <span className="border-primary/20 bg-primary/5 text-primary group-hover:bg-primary/10 mb-5 flex h-16 w-16 items-center justify-center rounded-lg border transition-colors">
                <Film size={29} strokeWidth={1.5} />
              </span>
              <span className="text-base font-medium sm:text-lg">
                {file ? file.name : t('chooseVideo')}
              </span>
              <span className="text-muted-foreground mt-6 font-mono text-[11px]">
                {t('videoLimits')}
              </span>
            </button>
            {videoUrl && (
              <video
                src={videoUrl}
                controls
                preload="metadata"
                className="mx-auto mt-4 max-h-52 max-w-full"
              />
            )}
            {controls(false)}
          </div>
        </section>
      )}
      <ul
        aria-label={ui('promisesLabel')}
        className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
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
    </div>
  );
}
