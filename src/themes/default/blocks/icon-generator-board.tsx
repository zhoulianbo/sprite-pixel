'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FolderOpen,
  ImageIcon,
  LoaderCircle,
  RefreshCw,
  Upload,
  WandSparkles,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import {
  appendIconLine,
  capIconInput,
  generationDefaults,
  getIconStylePreviewImage,
  ICON_ITEM_PRESET_IDS,
  ICON_LIST_MAX,
  mapIconStyleOptions,
  parseIconList,
  serializeIconList,
  type IconListItem,
} from '@/config/generation';
import { getGenerationCredits } from '@/config/generation/model-routes';
import { CreditCostMark } from '@/shared/blocks/common/credit-cost';
import { ProjectAssetPicker } from '@/shared/blocks/common/project-asset-picker';
import type { ProjectSummary } from '@/shared/blocks/projects/project-create-dialog';
import { ProjectSelector } from '@/shared/blocks/projects/project-selector';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { useAppContext } from '@/shared/contexts/app';
import {
  readApiPayload,
  useProductApiFeedback,
} from '@/shared/lib/product-api-error';
import { uploadProjectReferenceFile } from '@/shared/lib/upload-project-file';
import { cn } from '@/shared/lib/utils';

type StyleSource = 'preset' | 'reference';
type IconSheetResult = { status: string; fileUrl?: string };

function StylePreview({ style }: { style: string }) {
  return (
    // The visible option label provides the accessible style name.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getIconStylePreviewImage(style)}
      alt=""
      aria-hidden="true"
      className="size-full object-contain"
    />
  );
}

function CornerMarks() {
  return (
    <>
      <span
        className="bg-primary absolute -top-px -left-px h-6 w-px"
        aria-hidden="true"
      />
      <span
        className="bg-primary absolute -top-px -left-px h-px w-6"
        aria-hidden="true"
      />
    </>
  );
}

function ExpandBar({
  expanded,
  expandLabel,
  collapseLabel,
  onToggle,
}: {
  expanded: boolean;
  expandLabel: string;
  collapseLabel: string;
  onToggle: () => void;
}) {
  const Icon = expanded ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-label={expanded ? collapseLabel : expandLabel}
      className="group hover:bg-primary/10 mt-2 flex h-8 w-full items-center gap-2 rounded-md px-2 transition-colors"
      onClick={onToggle}
    >
      <span className="bg-border group-hover:bg-primary/40 h-px flex-1" />
      <Icon className="text-muted-foreground group-hover:text-primary size-4 shrink-0" />
      <span className="bg-border group-hover:bg-primary/40 h-px flex-1" />
    </button>
  );
}

export function IconGeneratorBoard() {
  const t = useTranslations('workspace.icons');
  const tg = useTranslations('workspace.generation');
  const to = useTranslations('generation');
  const notifyApiError = useProductApiFeedback();
  const { user } = useAppContext();
  const fileInput = useRef<HTMLInputElement>(null);
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [input, setInput] = useState('');
  const [items, setItems] = useState<IconListItem[]>([]);
  const [styleSource, setStyleSource] = useState<StyleSource>('preset');
  const [style, setStyle] = useState<string>(generationDefaults.style);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceFileId, setReferenceFileId] = useState('');
  const [referencePreview, setReferencePreview] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [generationId, setGenerationId] = useState('');
  const [batchStatus, setBatchStatus] = useState('idle');
  const [sheetResult, setSheetResult] = useState<IconSheetResult | null>(null);
  const [error, setError] = useState('');
  const [hasGenerated, setHasGenerated] = useState(false);
  const [stylesExpanded, setStylesExpanded] = useState(false);
  const [presetsExpanded, setPresetsExpanded] = useState(false);

  useEffect(() => {
    const saved = window.sessionStorage.getItem('sv_pending_icons');
    if (!saved) return;
    setInput(saved);
    setItems(parseIconList(saved, []));
    window.sessionStorage.removeItem('sv_pending_icons');
  }, []);

  useEffect(() => {
    if (!referenceFile) return;
    const url = URL.createObjectURL(referenceFile);
    setReferencePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [referenceFile]);

  const styles = useMemo(
    () => mapIconStyleOptions((path) => to(path as never)),
    [to]
  );
  const filledCount = items.length;
  const retryCount =
    sheetResult &&
    ['failed', 'canceled', 'postprocessing_failed'].includes(sheetResult.status)
      ? 1
      : 0;
  const hasSuccessfulSheet = Boolean(sheetResult?.fileUrl);
  const generateCredits = getGenerationCredits('icon');
  const retryCredits = getGenerationCredits('icon', {
    taskCount: Math.max(retryCount, 1),
    retry: true,
  });
  const hasReference = Boolean(referencePreview || referenceFileId);
  const canGenerate =
    filledCount > 0 && (styleSource === 'preset' || hasReference) && !busy;

  const applyResult = (data: any) => {
    setBatchStatus(data.status);
    const result = data.items?.[0];
    if (result) {
      setSheetResult((current) => ({
        status: result.status,
        fileUrl: result.file?.url || current?.fileUrl,
      }));
    }
    setItems((current) => {
      const next = current.map((item) => {
        const expandedItem = result?.metadata?.items?.find(
          (entry: any) => entry.clientItemId === item.id
        );
        if (!expandedItem) return item;
        const description =
          typeof expandedItem.description === 'string' &&
          expandedItem.description.trim()
            ? expandedItem.description
            : item.description;
        return {
          ...item,
          status: result.status,
          description,
        };
      });
      const expanded = next.some(
        (item, index) =>
          Boolean(item.description) &&
          item.description !== current[index]?.description
      );
      if (expanded) {
        queueMicrotask(() => setInput(serializeIconList(next)));
      }
      return next;
    });
  };

  const fail = (reason?: unknown) => {
    setBusy(false);
    setBatchStatus('failed');
    setSheetResult((current) => ({
      status: 'failed',
      fileUrl: current?.fileUrl,
    }));
    setError(notifyApiError(reason));
  };

  const poll = async (id: string) => {
    const response = await fetch(`/api/generations/${id}`);
    const payload = await readApiPayload(response);
    applyResult(payload.data);
    if (['pending', 'processing'].includes(payload.data.status)) {
      window.setTimeout(() => poll(id).catch(fail), 1800);
    } else {
      setBusy(false);
    }
  };

  const uploadReference = async () => {
    if (styleSource !== 'reference') return undefined;
    if (referenceFileId) return referenceFileId;
    if (!referenceFile || !project) return undefined;
    return uploadProjectReferenceFile({
      projectId: project.id,
      file: referenceFile,
      role: 'reference',
    });
  };

  const generate = async () => {
    if (!user) {
      notifyApiError('UNAUTHORIZED');
      return;
    }
    if (!project) {
      notifyApiError('PROJECT_NOT_FOUND');
      return;
    }
    if (!canGenerate) return;
    setBusy(true);
    setError('');
    setHasGenerated(true);
    setBatchStatus('queued');
    setSheetResult({ status: 'queued' });
    try {
      const requestedItems = items.map((item) => ({ ...item, selected: true }));
      const uploadedReferenceId = await uploadReference();
      const id = crypto.randomUUID();
      const response = await fetch(`/api/projects/${project.id}/generations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          type: 'icon_batch',
          name: t('defaultSetName'),
          referenceFileId: uploadedReferenceId,
          items: requestedItems,
          style: styleSource === 'preset' ? style : project.artStyle,
          perspective: generationDefaults.perspective,
          quality: generationDefaults.quality,
          background: 'transparent',
        }),
      });
      const payload = await readApiPayload(response);
      setGenerationId(id);
      applyResult(payload.data);
      if (['pending', 'processing'].includes(payload.data.status)) {
        window.setTimeout(() => poll(id).catch(fail), 1800);
      } else {
        setBusy(false);
      }
    } catch (reason) {
      fail(reason);
    }
  };

  const retry = async () => {
    if (!generationId) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/generations/${generationId}/retry`, {
        method: 'POST',
      });
      const payload = await readApiPayload(response);
      applyResult(payload.data);
      window.setTimeout(() => poll(generationId).catch(fail), 1200);
    } catch (reason) {
      fail(reason);
    }
  };

  const setListValue = (value: string) => {
    const next = capIconInput(value);
    setInput(next);
    setItems((current) => parseIconList(next, current));
  };

  const insertPreset = (name: string) => {
    setListValue(appendIconLine(input, `${name}:`));
  };

  const clearReference = () => {
    setReferenceFile(null);
    setReferenceFileId('');
    setReferencePreview('');
  };

  const openAssetPicker = () => {
    if (!user) {
      notifyApiError('UNAUTHORIZED');
      return;
    }
    if (!project) {
      notifyApiError('PROJECT_NOT_FOUND');
      return;
    }
    setPickerOpen(true);
  };

  const statusText =
    batchStatus === 'partial'
      ? tg('partial')
      : batchStatus === 'failed'
        ? tg('failed')
        : ['queued', 'pending'].includes(batchStatus)
          ? tg('queued')
          : batchStatus === 'processing'
            ? tg('processing')
            : batchStatus === 'success'
              ? tg('success')
              : '';

  const sourceTabs: Array<{ id: StyleSource; label: string }> = [
    { id: 'preset', label: t('stylePresets') },
    { id: 'reference', label: t('uploadReference') },
  ];
  const visibleStyles = useMemo(() => {
    if (stylesExpanded) return styles;
    const index = styles.findIndex((option) => option.value === style);
    if (index <= 1) return styles.slice(0, 2);
    const start = Math.min(index, Math.max(styles.length - 2, 0));
    return styles.slice(start, start + 2);
  }, [style, styles, stylesExpanded]);

  return (
    <div className="border-border bg-card/90 relative border p-4 shadow-[0_40px_120px_-64px_#35c2ff55] sm:p-5">
      <CornerMarks />
      <div className="grid gap-4 lg:grid-cols-[minmax(280px,400px)_minmax(0,1fr)]">
        <section className="bg-background/70 space-y-5 rounded-xl border p-4">
          <div>
            <h2 className="text-sm font-semibold">{t('styleSource')}</h2>
            <div
              className="bg-muted mt-3 grid grid-cols-2 rounded-lg p-1"
              role="tablist"
              aria-label={t('styleSource')}
            >
              {sourceTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={styleSource === tab.id}
                  className={cn(
                    'h-10 rounded-md text-sm font-medium transition-colors',
                    styleSource === tab.id
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setStyleSource(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {styleSource === 'preset' ? (
              <div className="mt-3">
                <div className="grid grid-cols-2 gap-2">
                  {visibleStyles.map((option) => {
                    const selected = style === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        className={cn(
                          'bg-card overflow-hidden rounded-lg border-2 text-left transition-colors',
                          selected
                            ? 'border-primary bg-primary/5 ring-primary ring-2'
                            : 'border-border hover:ring-primary/50 hover:ring-1'
                        )}
                        onClick={() => setStyle(option.value)}
                      >
                        <div className="bg-vault-navy aspect-[2.6/1] px-2 py-1.5">
                          <StylePreview style={option.value} />
                        </div>
                        <div className="px-2.5 py-1.5">
                          <div className="truncate text-sm font-medium">
                            {option.label}
                          </div>
                          <div className="text-muted-foreground mt-0.5 truncate text-[11px] leading-4">
                            {t(`styleHints.${option.value}`)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <ExpandBar
                  expanded={stylesExpanded}
                  expandLabel={t('expandAll')}
                  collapseLabel={t('collapse')}
                  onToggle={() => setStylesExpanded((current) => !current)}
                />
              </div>
            ) : hasReference ? (
              <div className="mt-3 flex items-center gap-3 rounded-xl border p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={t('reference')}
                  className="size-14 rounded-md border object-cover"
                  src={referencePreview}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{t('reference')}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {referenceFile?.name || t('selectedAsset')}
                  </div>
                </div>
                <Button
                  aria-label={to('upload.remove')}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                  onClick={clearReference}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="border-muted-foreground/40 mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-dashed">
                <button
                  type="button"
                  className="hover:bg-primary/5 hover:text-primary flex min-h-[132px] flex-col items-center justify-center gap-2 px-3 py-6 text-sm"
                  onClick={() => fileInput.current?.click()}
                >
                  <Upload className="size-5" />
                  {t('uploadFile')}
                </button>
                <button
                  type="button"
                  className="hover:bg-primary/5 hover:text-primary border-border flex min-h-[132px] flex-col items-center justify-center gap-2 border-l px-3 py-6 text-sm"
                  onClick={openAssetPicker}
                >
                  <FolderOpen className="size-5" />
                  {t('chooseAsset')}
                </button>
              </div>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setReferenceFile(file);
                setReferenceFileId('');
                if (!file) setReferencePreview('');
                event.target.value = '';
              }}
            />
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <h2 className="shrink-0 text-sm font-semibold">
                {t('itemList')}
              </h2>
              <p className="text-muted-foreground min-w-0 flex-1 text-xs leading-5">
                {t('listHint')}
              </p>
            </div>
            <div className="mt-3">
              <div
                className={cn(
                  'flex flex-wrap content-start gap-1.5',
                  !presetsExpanded && 'max-h-[3.625rem] overflow-hidden'
                )}
              >
                {ICON_ITEM_PRESET_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    disabled={filledCount >= ICON_LIST_MAX}
                    className="bg-secondary/80 hover:border-primary/50 hover:text-primary disabled:text-muted-foreground rounded-md border px-2 py-1 text-[11px] leading-4 disabled:opacity-50"
                    onClick={() => insertPreset(t(`itemPresets.${id}`))}
                  >
                    {t(`itemPresets.${id}`)}
                  </button>
                ))}
              </div>
              <ExpandBar
                expanded={presetsExpanded}
                expandLabel={t('expandAll')}
                collapseLabel={t('collapse')}
                onToggle={() => setPresetsExpanded((current) => !current)}
              />
            </div>
            <Textarea
              value={input}
              onChange={(event) => setListValue(event.target.value)}
              placeholder={t('inputPlaceholder')}
              className="mt-3 min-h-40 resize-y rounded-xl"
            />
            <p className="text-muted-foreground mt-2 text-[11px]">
              {t('filled', { count: filledCount, max: ICON_LIST_MAX })}
            </p>
          </div>

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <ProjectSelector
              onChange={setProject}
              value={project?.id}
              className="min-w-0 flex-1"
            />
            <Button
              className="min-h-10 shrink-0 rounded-lg px-4"
              onClick={generate}
              disabled={!canGenerate}
            >
              {busy ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <WandSparkles className="size-4" />
              )}
              {busy ? tg('processing') : t('generate')}
              {busy || filledCount < 1 ? null : (
                <CreditCostMark credits={generateCredits} />
              )}
            </Button>
          </div>
        </section>

        <section className="bg-background/70 flex min-h-[520px] flex-col rounded-xl border p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">{t('preview')}</h2>
            <div className="flex items-center gap-2">
              {statusText ? (
                <span className="text-muted-foreground text-xs">
                  {statusText}
                </span>
              ) : null}
              {['partial', 'failed'].includes(batchStatus) ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={retry}
                  disabled={busy}
                >
                  <RefreshCw className="size-4" />
                  {tg('retry')}
                  <CreditCostMark credits={retryCredits} />
                </Button>
              ) : null}
            </div>
          </div>
          {hasGenerated && items.length ? (
            <article className="bg-card mx-auto w-full max-w-xl overflow-hidden rounded-lg border">
              <div className="bg-muted/30 relative aspect-square border-b p-3">
                {sheetResult?.fileUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sheetResult.fileUrl}
                    alt={t('defaultSetName')}
                    className="size-full object-contain [image-rendering:pixelated]"
                  />
                ) : (
                  <div className="text-muted-foreground flex size-full items-center justify-center">
                    {['pending', 'processing', 'queued'].includes(
                      sheetResult?.status || batchStatus
                    ) ? (
                      <LoaderCircle className="size-5 animate-spin" />
                    ) : (
                      <ImageIcon className="stroke-1.5 size-5" />
                    )}
                  </div>
                )}
                {sheetResult?.status === 'success' ? (
                  <span className="bg-primary text-primary-foreground absolute top-2 right-2 flex size-5 items-center justify-center rounded-full">
                    <Check className="size-3" />
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-1 p-2.5">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium">
                    {t('defaultSetName')}
                  </h3>
                  <p className="text-muted-foreground truncate font-mono text-[9px]">
                    {['pending', 'queued'].includes(
                      sheetResult?.status || batchStatus
                    )
                      ? tg('queued')
                      : (sheetResult?.status || batchStatus) === 'processing'
                        ? tg('processing')
                        : sheetResult?.status === 'success'
                          ? tg('success')
                          : tg('failed')}
                  </p>
                </div>
                {sheetResult?.fileUrl ? (
                  <Button
                    asChild
                    size="icon"
                    variant="ghost"
                    className="size-8"
                  >
                    <a
                      href={`${sheetResult.fileUrl}?download=1`}
                      aria-label={t('downloadSheet')}
                    >
                      <Download className="size-4" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </article>
          ) : (
            <div className="flex min-h-[440px] flex-1 flex-col items-center justify-center gap-3 rounded-xl text-sm">
              <span className="border-primary/40 flex size-14 items-center justify-center rounded-full border">
                <ImageIcon className="text-primary size-6" />
              </span>
              <span className="text-muted-foreground">{t('empty')}</span>
            </div>
          )}
          {project && hasSuccessfulSheet ? (
            <div className="mt-auto flex justify-end pt-4">
              <Button asChild variant="ghost">
                <Link href={`/dashboard/projects/${project.id}/icons`}>
                  {t('openProject')}
                </Link>
              </Button>
            </div>
          ) : null}
        </section>
      </div>

      <ProjectAssetPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        projectId={project?.id}
        kinds={['icon']}
        selectedId={referenceFileId}
        title={t('pickerTitle')}
        description={t('pickerDescription')}
        selectLabel={t('chooseAsset')}
        onSelect={(file) => {
          setReferenceFile(null);
          setReferenceFileId(file.id);
          setReferencePreview(file.url);
        }}
      />
    </div>
  );
}
