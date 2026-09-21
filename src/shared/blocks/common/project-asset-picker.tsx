'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import type { ProjectFileKind } from '@/shared/lib/asset-file-kind';
import {
  readApiPayload,
  useProductApiFeedback,
} from '@/shared/lib/product-api-error';
import { cn } from '@/shared/lib/utils';

export type ProjectAssetPickerFile = {
  id: string;
  url: string;
  name?: string | null;
  itemId?: string | null;
};

export function ProjectAssetPicker({
  open,
  onOpenChange,
  projectId,
  kinds,
  selectedId,
  title,
  description,
  selectLabel,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  kinds: ProjectFileKind[];
  selectedId?: string;
  title: string;
  description: string;
  selectLabel: string;
  onSelect: (file: ProjectAssetPickerFile) => void;
}) {
  const t = useTranslations('workspace.filePicker');
  const notifyApiError = useProductApiFeedback();
  const notifyApiErrorRef = useRef(notifyApiError);
  notifyApiErrorRef.current = notifyApiError;
  const [kind, setKind] = useState<ProjectFileKind>(kinds[0] || 'character');
  const [state, setState] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [files, setFiles] = useState<ProjectAssetPickerFile[]>([]);
  const kindsKey = kinds.join(',');

  useEffect(() => {
    const nextKinds = kindsKey.split(',') as ProjectFileKind[];
    if (!nextKinds.includes(kind)) {
      setKind(nextKinds[0] || 'character');
    }
  }, [kind, kindsKey]);

  useEffect(() => {
    if (!open || !projectId) return;
    let cancelled = false;
    setState('loading');
    void (async () => {
      try {
        const payload = await readApiPayload(
          await fetch(`/api/projects/${projectId}/files?kind=${kind}`)
        );
        if (cancelled) return;
        setFiles(payload.data.files || []);
        setState('ready');
      } catch (reason) {
        if (cancelled) return;
        setState('ready');
        setFiles([]);
        notifyApiErrorRef.current(reason);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, open, projectId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {kinds.length > 1 ? (
          <div
            className="bg-muted grid grid-cols-3 rounded-lg p-1"
            role="tablist"
            aria-label={t('kindLabel')}
          >
            {kinds.map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={kind === option}
                className={cn(
                  'h-9 rounded-md text-sm font-medium transition-colors',
                  kind === option
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                )}
                onClick={() => setKind(option)}
              >
                {t(`kinds.${option}`)}
              </button>
            ))}
          </div>
        ) : null}
        <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
          {state === 'loading' ? (
            <div className="text-muted-foreground col-span-full flex min-h-48 items-center justify-center text-sm">
              <LoaderCircle className="mr-2 size-4 animate-spin" />
              {t('loading')}
            </div>
          ) : null}
          {state === 'ready'
            ? files.map((file) => (
                <button
                  type="button"
                  key={file.id}
                  onClick={() => {
                    onSelect(file);
                    onOpenChange(false);
                  }}
                  className={cn(
                    'bg-secondary/45 relative aspect-square overflow-hidden rounded-lg border p-2',
                    selectedId === file.id &&
                      'border-primary ring-primary/20 ring-2'
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={file.url}
                    alt={file.name || selectLabel}
                    className="size-full object-contain [image-rendering:pixelated]"
                  />
                  {selectedId === file.id ? (
                    <Check className="text-primary absolute right-2 bottom-2 size-4" />
                  ) : null}
                </button>
              ))
            : null}
          {state === 'ready' && !files.length ? (
            <div className="text-muted-foreground col-span-full flex min-h-48 flex-col items-center justify-center gap-3 text-sm">
              <ImagePlus className="size-7" />
              {t('empty')}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
