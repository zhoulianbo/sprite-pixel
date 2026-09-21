'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import {
  IconLoader2,
  IconPhotoAi,
  IconPlus,
  IconSparkles,
  IconX,
} from '@tabler/icons-react';
import { Folder } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { generationDefaults, mapGenerationOptions } from '@/config/generation';
import { getGenerationCredits } from '@/config/generation/model-routes';
import { CreditCostMark } from '@/shared/blocks/common/credit-cost';
import { useProjectConsole } from '@/shared/blocks/projects/project-console-header';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
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
import { uploadProjectReferenceFile } from '@/shared/lib/upload-project-file';
import { cn } from '@/shared/lib/utils';

const ctaClass =
  'bg-primary text-primary-foreground hover:bg-primary/90 inline-flex min-h-[42px] items-center justify-center gap-2.5 rounded-lg px-4 font-mono text-xs font-extrabold tracking-[0.04em] uppercase [&_svg]:size-4';

export function CharacterCreateDialog({
  projectId,
  trigger,
}: {
  projectId: string;
  trigger?: ReactNode;
}) {
  const t = useTranslations('workspace.characters.create');
  const tg = useTranslations('generation');
  const th = useTranslations('pages.index.messages');
  const notifyApiError = useProductApiFeedback();
  const { projectName } = useProjectConsole();
  const promptId = useId();
  const uploadId = useId();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<string>(generationDefaults.style);
  const [perspective, setPerspective] = useState<string>(
    generationDefaults.perspective
  );
  const [characterType, setCharacterType] = useState<string>(
    generationDefaults.characterType
  );
  const [reference, setReference] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!reference) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(reference);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [reference]);

  const optionList = (field: 'style' | 'perspective' | 'characterType') =>
    mapGenerationOptions(field, (key) => tg(key as never));

  const reset = () => {
    setPrompt('');
    setStyle(generationDefaults.style);
    setPerspective(generationDefaults.perspective);
    setCharacterType(generationDefaults.characterType);
    setReference(null);
    setResultUrl('');
    setStatus('');
    setError('');
  };

  const finish = (payload: any) => {
    setStatus(payload.data.status);
    const result = payload.data.items?.find((item: any) => item.file)?.file;
    if (result?.url) setResultUrl(result.url);
    if (['success', 'partial'].includes(payload.data.status)) {
      window.location.reload();
    }
  };

  const poll = async (generationId: string) => {
    const payload = await readApiPayload(
      await fetch(`/api/generations/${generationId}`)
    );
    if (['pending', 'processing'].includes(payload.data.status)) {
      setStatus(payload.data.status);
      window.setTimeout(() => poll(generationId).catch(handleError), 1800);
      return;
    }
    finish(payload);
  };

  const handleError = (reason: unknown) => {
    setStatus('failed');
    setError(notifyApiError(reason));
  };

  const generate = async () => {
    if (!prompt.trim()) {
      setError(t('promptRequired'));
      return;
    }
    setStatus('processing');
    setError('');
    setResultUrl('');
    try {
      const referenceFileId = reference
        ? await uploadProjectReferenceFile({
            projectId,
            file: reference,
            role: 'reference',
          })
        : undefined;
      const generationId = crypto.randomUUID();
      const payload = await readApiPayload(
        await fetch(`/api/projects/${projectId}/generations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: generationId,
            type: 'character',
            prompt: prompt.trim(),
            referenceFileId,
            style,
            perspective,
            characterType,
          }),
        })
      );
      if (['pending', 'processing'].includes(payload.data.status)) {
        setStatus(payload.data.status);
        window.setTimeout(() => poll(generationId).catch(handleError), 1800);
      } else {
        finish(payload);
      }
    } catch (reason) {
      handleError(reason);
    }
  };

  const inspirations = th.raw('inspirations') as string[];
  const surprise = () => {
    const next = inspirations[Math.floor(Math.random() * inspirations.length)];
    if (next) setPrompt(next);
  };
  const busy = ['pending', 'processing'].includes(status);
  const previewStatus =
    status === 'processing' || status === 'pending'
      ? t('generating')
      : status === 'failed'
        ? undefined
        : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <IconSparkles className="size-4" />
            {t('trigger')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="border-primary/65 w-[min(960px,calc(100vw-28px))] max-w-none gap-0 rounded-2xl bg-[#0b111b] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.42),0_0_32px_rgba(245,181,48,0.08)] sm:max-w-[960px] sm:p-5">
        <DialogHeader className="sr-only">
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <form
          className="grid grid-cols-[minmax(0,1fr)_minmax(220px,260px)] items-stretch gap-4 max-[760px]:grid-cols-1"
          onSubmit={(event) => {
            event.preventDefault();
            generate();
          }}
        >
          <div className="flex min-w-0 flex-col">
            <label
              className="text-foreground/85 mb-2 block text-xs font-semibold tracking-[0.02em]"
              htmlFor={promptId}
            >
              {t('promptLabel')}
            </label>
            <div className="bg-background focus-within:border-primary/40 focus-within:ring-primary/20 flex min-h-[248px] flex-1 flex-col overflow-hidden rounded-xl border border-white/12 transition-[border-color,box-shadow] focus-within:ring-2 focus-within:ring-inset">
              <div className="flex flex-wrap items-center justify-start gap-2 px-3 pt-2">
                <HeroOptionSelect
                  label={tg('fields.style')}
                  onValueChange={setStyle}
                  options={optionList('style')}
                  value={style}
                />
                <HeroOptionSelect
                  label={tg('fields.perspective')}
                  onValueChange={setPerspective}
                  options={optionList('perspective')}
                  value={perspective}
                />
                <HeroOptionSelect
                  label={tg('fields.characterType')}
                  onValueChange={setCharacterType}
                  options={optionList('characterType')}
                  value={characterType}
                />
                <button
                  className="text-foreground hover:border-primary hover:text-primary ml-auto inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/12 bg-white/4 px-2.5 font-mono text-[9px] font-bold tracking-[0.03em] whitespace-nowrap uppercase transition-colors [&_svg]:size-3.5"
                  onClick={surprise}
                  type="button"
                >
                  <IconSparkles aria-hidden="true" />
                  {th('surpriseMe')}
                </button>
              </div>
              <div className="flex min-h-0 flex-1 items-start gap-3 px-3 pt-1 pb-3">
                <textarea
                  className="text-foreground caret-primary placeholder:text-muted-foreground min-h-[120px] w-full flex-1 resize-none border-0 bg-transparent py-2 pr-1 text-sm leading-[1.6] outline-none"
                  id={promptId}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder={th('promptPlaceholder')}
                  rows={4}
                  value={prompt}
                />
                <span className="relative size-[72px] shrink-0">
                  {preview ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={reference?.name || tg('upload.reference')}
                        className="size-[72px] rounded-lg border border-white/16 object-cover"
                        src={preview}
                      />
                      <button
                        aria-label={tg('upload.remove')}
                        className="bg-background/90 text-foreground hover:bg-destructive hover:text-destructive-foreground absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border border-white/20 shadow-sm"
                        onClick={() => setReference(null)}
                        type="button"
                      >
                        <IconX aria-hidden="true" className="size-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <label
                        className="text-muted-foreground hover:border-primary/70 hover:bg-primary/5 hover:text-primary focus-within:border-primary/50 border-border flex size-[72px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-black/20 px-1 text-center transition-colors [&_svg]:size-5 [&_svg]:stroke-[1.5]"
                        htmlFor={uploadId}
                        title={tg('upload.reference')}
                      >
                        <IconPlus aria-hidden="true" />
                        <span className="max-w-full truncate text-[10px] leading-tight font-medium">
                          {tg('upload.reference')}
                        </span>
                      </label>
                      <input
                        accept="image/*"
                        className="sr-only"
                        id={uploadId}
                        onChange={(event) => {
                          setReference(event.target.files?.[0] || null);
                          event.target.value = '';
                        }}
                        type="file"
                      />
                    </>
                  )}
                </span>
              </div>
              <div className="bg-secondary/55 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 px-2.5 py-2">
                <span className="flex h-9 min-w-0 items-center gap-2 px-2 text-sm">
                  <Folder className="text-primary size-4 shrink-0" />
                  <span className="truncate">
                    {projectName || t('currentProject')}
                  </span>
                </span>
                <button
                  className={cn(
                    ctaClass,
                    'min-h-10 shrink-0 rounded-lg px-4 normal-case disabled:cursor-not-allowed disabled:opacity-55'
                  )}
                  disabled={busy}
                  type="submit"
                >
                  {busy ? (
                    <IconLoader2 aria-hidden="true" className="animate-spin" />
                  ) : (
                    <IconSparkles aria-hidden="true" />
                  )}
                  {busy ? th('startCreatingBusy') : th('startCreating')}
                  {busy ? null : (
                    <CreditCostMark
                      credits={getGenerationCredits('character')}
                    />
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="flex min-h-0 min-w-0 flex-col max-[760px]:min-h-[220px]">
            <span className="text-foreground/85 mb-2 block pr-8 text-xs font-semibold tracking-[0.02em]">
              {t('previewTitle')}
            </span>
            <div className="border-border bg-secondary/35 text-muted-foreground relative flex min-h-[220px] flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border p-3 text-center">
              {resultUrl ? (
                <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-lg bg-[linear-gradient(45deg,rgba(255,255,255,.04)_25%,transparent_25%),linear-gradient(-45deg,rgba(255,255,255,.04)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(255,255,255,.04)_75%),linear-gradient(-45deg,transparent_75%,rgba(255,255,255,.04)_75%)] bg-[size:16px_16px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resultUrl}
                    alt={prompt}
                    className="size-full object-contain [image-rendering:pixelated]"
                  />
                </div>
              ) : (
                <>
                  <IconPhotoAi
                    aria-hidden="true"
                    className="text-primary/75 size-12 stroke-[1.2]"
                  />
                  <span className="font-mono text-[9px] font-bold tracking-[0.08em] uppercase">
                    {previewStatus || t('previewEmpty')}
                  </span>
                </>
              )}
              {busy ? (
                <div className="bg-background/75 absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <IconLoader2
                    aria-hidden="true"
                    className="text-primary size-7 animate-spin"
                  />
                  <span className="text-muted-foreground text-xs">
                    {t('generating')}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </form>
        {error ? (
          <p className="text-destructive mt-3 text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function HeroOptionSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger
        aria-label={label}
        className="hover:bg-secondary/70 bg-secondary/55 data-[state=open]:bg-secondary/70 h-8 w-auto min-w-0 shrink-0 gap-1 rounded-lg border-0 px-3 text-[12px] shadow-none hover:border-transparent focus-visible:ring-0 data-[state=open]:border-transparent [&_svg]:size-3.5"
        size="sm"
      >
        <span className="text-muted-foreground shrink-0 pr-1 font-normal">
          {label}
        </span>
        <SelectValue>
          <span className="text-foreground font-medium">
            {options.find((option) => option.value === value)?.label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="min-w-[9.5rem]">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
