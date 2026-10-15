'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [file, setFile] = useState<File>();
  const [options, setOptions] = useState<VideoOptions>(VIDEO_DEFAULTS);
  const [result, setResult] = useState<SheetInput>();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>();
  const [error, setError] = useState('');
  const uploaded = useRef<{ file: File; token: string } | undefined>(undefined);
  const operation = useRef<AbortController | undefined>(undefined);
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
      const response = await fetch(data.spritesheet.url, {
        signal,
        mode: 'cors',
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
  return (
    <div id="workbench" className="scroll-mt-24 space-y-5">
      <div className="bg-card rounded-xl border p-5 sm:p-6">
        <p className="text-muted-foreground mb-4 text-sm">
          {t('videoPrivacy')}
        </p>
        <label className="bg-background flex min-h-28 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-5 text-center">
          <span>{file ? file.name : t('chooseVideo')}</span>
          <span className="text-muted-foreground text-sm">
            {t('videoLimits')}
          </span>
          <input
            aria-label={t('chooseVideo')}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            disabled={busy}
            onChange={(e) => {
              choose(e.target.files?.[0]);
              e.target.value = '';
            }}
            className="max-w-full text-sm"
          />
        </label>
        {videoUrl && (
          <video
            src={videoUrl}
            controls
            preload="metadata"
            className="mx-auto mt-4 max-h-52 max-w-full rounded-lg"
          />
        )}
        <fieldset
          disabled={busy}
          className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="space-y-2 text-sm">
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
              className="bg-background h-10 w-full rounded-md border px-3"
            />
          </label>
          <div className="space-y-2 text-sm">
            <label htmlFor="video-frame-size">{t('frameSize')}</label>
            <Select
              value={String(options.frame_size)}
              onValueChange={(value) =>
                setOptions({ ...options, frame_size: Number(value) })
              }
              disabled={busy}
            >
              <SelectTrigger id="video-frame-size" className="w-full">
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
          <label className="space-y-2 text-sm">
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
              className="bg-background h-10 w-full rounded-md border px-3"
            />
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
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
        <p className="text-muted-foreground mt-3 text-sm">{t('loopHelp')}</p>
        <p className="text-muted-foreground mt-2 text-sm">{t('fpsHelp')}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button disabled={!file || busy} onClick={process}>
            {busy ? t('processing') : result ? t('extractAgain') : t('extract')}
          </Button>
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
        </div>
        {busy && (
          <div role="status" className="mt-4 text-sm">
            {progress === undefined
              ? t('serverProcessing')
              : t('uploadProgress', { progress })}
            {progress !== undefined && (
              <progress value={progress} max={100} className="mt-2 w-full" />
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="text-destructive mt-4 text-sm">
            {error}
          </p>
        )}
      </div>
      {result && (
        <SpriteWorkbench
          key={result.sheet.id}
          tool="splitter"
          input={result}
          remoteSource
        />
      )}
    </div>
  );
}
