'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  BACKGROUND_BATCH_LIMIT,
  BACKGROUND_LIMIT,
} from '@/config/tools/free-tools';
import { Button } from '@/shared/components/ui/button';
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
  renderSheet,
  zipFiles,
} from '@/shared/lib/sprite-tools/browser';
import {
  defaultMaker,
  suggestMakerGridColumns,
  type Frame,
} from '@/shared/lib/sprite-tools/core';

import { BeforeAfter } from './before-after';
import { BlobImage } from './previews';

type Item = {
  original: Frame;
  result?: Frame;
  status: 'waiting' | 'processing' | 'success' | 'failed';
  error?: string;
};
export function BackgroundWorkbench({ gif = false }: { gif?: boolean }) {
  const t = useTranslations('tools.sprites.ui.freeTools');
  const mediaErrors = useTranslations('tools.sprites.ui.errors');
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<ModelProgress>();
  const [count, setCount] = useState({ done: 0, total: 0 });
  const [error, setError] = useState('');
  const [cacheWarning, setCacheWarning] = useState(false);
  const client = useRef<BackgroundClient | undefined>(undefined);
  const operation = useRef<AbortController | undefined>(undefined);
  const picker = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      operation.current?.abort();
      client.current?.dispose();
    },
    []
  );
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
    });
  }
  async function process(only?: number) {
    const targets = items.flatMap((item, index) =>
      !item.result && (only === undefined || only === index) ? [index] : []
    );
    if (!targets.length) return;
    await run(async (signal) => {
      client.current ||= new BackgroundClient((progress) => {
        if (progress.phase === 'cacheUnavailable') setCacheWarning(true);
        else setStage(progress);
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
        try {
          const original = items[index].original;
          const blob = await client.current.remove(original.blob, signal);
          signal.throwIfAborted();
          const result = {
            ...original,
            id: crypto.randomUUID(),
            name: `${original.name.replace(/\.[^.]+$/, '')}.png`,
            blob,
          };
          setItems((current) =>
            current.map((item, n) =>
              n === index ? { ...item, result, status: 'success' } : item
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
          // A model initialization failure affects every remaining file. Stop the batch so retry is explicit.
          if (
            e instanceof Error &&
            [
              'MODEL_DOWNLOAD_FAILED',
              'MODEL_INVALID',
              'MODEL_INITIALIZATION_FAILED',
              'BROWSER_UNSUPPORTED',
            ].includes(e.message)
          )
            throw e;
        }
        setCount({ done: step + 1, total: targets.length });
      }
    });
  }
  function save(format: 'zip' | 'sheet' | 'gif') {
    const frames = items.flatMap((item) => (item.result ? [item.result] : []));
    if (!frames.length || (gif && frames.length !== items.length)) return;
    void run(async (signal) => {
      setStage({ phase: 'exporting', loaded: 0, total: 0 });
      const progress = (done: number, total: number) =>
        setCount({ done, total });
      const blob =
        format === 'zip'
          ? await zipFiles(frameEntries(frames), signal, progress)
          : format === 'gif'
            ? await encodeFramesGif(
                frames,
                { align: 'top-left', background: '', fps: null },
                signal,
                progress
              )
            : (
                await renderSheet(
                  frames,
                  {
                    ...defaultMaker,
                    columns: suggestMakerGridColumns(frames.length),
                  },
                  signal,
                  progress
                )
              ).blob;
      signal.throwIfAborted();
      download(
        blob,
        format === 'zip'
          ? 'transparent-frames.zip'
          : format === 'gif'
            ? 'transparent-animation.gif'
            : 'transparent-sprite-sheet.png'
      );
    });
  }
  const completed = items.filter((item) => item.result).length;
  const active = items[Math.min(selected, items.length - 1)];
  const exportReady = completed > 0 && (!gif || completed === items.length);
  return (
    <div id="workbench" className="scroll-mt-24 space-y-5">
      <div className="bg-card rounded-xl border p-5 sm:p-6">
        <p className="text-primary text-sm font-medium">{t('localPrivacy')}</p>
        <p className="text-muted-foreground mt-2 text-sm">{t('modelNotice')}</p>
        <input
          ref={picker}
          type="file"
          multiple={!gif}
          accept={gif ? 'image/gif,.gif' : 'image/png,image/jpeg,image/webp'}
          className="sr-only"
          aria-label={t(gif ? 'chooseGif' : 'chooseImages')}
          disabled={busy}
          onChange={(e) => {
            void importFiles(Array.from(e.target.files || []));
            e.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => picker.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!busy) void importFiles(Array.from(e.dataTransfer.files));
          }}
          className="bg-background hover:border-primary focus-visible:outline-ring mt-5 flex min-h-32 w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-5 text-center"
        >
          <span>{t(gif ? 'chooseGif' : 'chooseImages')}</span>
          <span className="text-muted-foreground text-sm">
            {t(gif ? 'gifLimits' : 'imageLimits')}
          </span>
        </button>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            disabled={!items.length || busy || completed === items.length}
            onClick={() => process()}
          >
            {t('removeBackground')}
          </Button>
          {busy && (
            <Button variant="outline" onClick={cancel}>
              {t('cancel')}
            </Button>
          )}
          {!!items.length && (
            <Button
              disabled={busy}
              variant="ghost"
              onClick={() => {
                setItems([]);
                setSelected(0);
                setError('');
              }}
            >
              {t('clear')}
            </Button>
          )}
        </div>
        {busy && (
          <div role="status" className="mt-4 space-y-2 text-sm">
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
                    progress: Math.round((stage.loaded / stage.total) * 100),
                  })}
                </p>
              </>
            ) : (
              <p>{t('batchProgress', count)}</p>
            )}
          </div>
        )}
        {cacheWarning && (
          <p className="text-muted-foreground mt-3 text-sm">
            {t('model.cacheUnavailable')}
          </p>
        )}
        {error && (
          <p role="alert" className="text-destructive mt-3 text-sm">
            {error}
          </p>
        )}
      </div>
      {!!items.length && (
        <div className="bg-card grid gap-5 rounded-xl border p-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div
            className="order-2 max-h-[480px] space-y-2 overflow-auto lg:order-1"
            aria-label={t('files')}
          >
            {items.map((item, index) => (
              <div
                key={item.original.id}
                className={`rounded-lg border p-2 ${index === selected ? 'border-primary' : 'border-border'}`}
              >
                <button
                  className="flex w-full items-center gap-2 text-left"
                  onClick={() => setSelected(index)}
                  aria-pressed={index === selected}
                >
                  <BlobImage
                    frame={item.result || item.original}
                    className="h-12 w-12 shrink-0 object-contain"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm">
                      {item.original.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {t(`status.${item.status}`)}
                    </span>
                  </span>
                </button>
                {item.error && (
                  <p className="text-destructive mt-2 text-sm">{item.error}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.result && !gif && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        download(item.result!.blob, item.result!.name)
                      }
                    >
                      {t('downloadPng')}
                    </Button>
                  )}
                  {item.status === 'failed' && (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => process(index)}
                    >
                      {t('retry')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="order-1 min-w-0 lg:order-2">
            {active && (
              <BeforeAfter
                key={gif ? 'gif' : active.original.id}
                before={
                  gif ? items.map((item) => item.original) : [active.original]
                }
                after={gif ? items.map((item) => item.result) : [active.result]}
              />
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                disabled={!exportReady || busy}
                onClick={() => save('zip')}
              >
                {t('downloadZip', { count: completed })}
              </Button>
              {gif && (
                <>
                  <Button
                    variant="outline"
                    disabled={!exportReady || busy}
                    onClick={() => save('sheet')}
                  >
                    {t('downloadSheet')}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!exportReady || busy}
                    onClick={() => save('gif')}
                  >
                    {t('downloadGif')}
                  </Button>
                </>
              )}
            </div>
            {gif && (
              <p className="text-muted-foreground mt-3 text-sm">
                {t('gifAlpha')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
