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
  projectId?: string;
  projectName?: string | null;
  projectSettingsJson?: string;
};

function displayPickerProjectName(
  file: ProjectAssetPickerFile,
  defaultLabel: string
) {
  try {
    const settings = JSON.parse(file.projectSettingsJson || '{}');
    if (settings.systemDefault && file.projectName === 'Default Project') {
      return defaultLabel;
    }
  } catch {
    // keep stored name
  }
  return file.projectName || defaultLabel;
}

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
  const tProjects = useTranslations('workspace.projects');
  const notifyApiError = useProductApiFeedback();
  const notifyApiErrorRef = useRef(notifyApiError);
  notifyApiErrorRef.current = notifyApiError;
  const [kind, setKind] = useState<ProjectFileKind>(kinds[0] || 'character');
  const [state, setState] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [files, setFiles] = useState<ProjectAssetPickerFile[]>([]);
  const kindsKey = kinds.join(',');
  const showProjectLabels = !projectId;

  useEffect(() => {
    const nextKinds = kindsKey.split(',') as ProjectFileKind[];
    if (!nextKinds.includes(kind)) {
      setKind(nextKinds[0] || 'character');
    }
  }, [kind, kindsKey]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState('loading');
    const url = projectId
      ? `/api/projects/${projectId}/files?kind=${kind}`
      : `/api/files?kind=${kind}`;
    void (async () => {
      try {
        const payload = await readApiPayload(await fetch(url));
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
                  {showProjectLabels ? (
                    <span className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1.5 text-left text-xs text-white">
                      {t('projectOverlay', {
                        name: displayPickerProjectName(
                          file,
                          tProjects('default')
                        ),
                      })}
                    </span>
                  ) : null}
                  {selectedId === file.id ? (
                    <Check className="text-primary absolute top-2 right-2 size-4" />
                  ) : null}
                </button>
              ))
            : null}
          {state === 'ready' && !files.length ? (
            <div className="text-muted-foreground col-span-full flex min-h-48 flex-col items-center justify-center gap-3 text-sm">
              <ImagePlus className="size-7" />
              {showProjectLabels ? t('emptyAll') : t('empty')}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
