'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Film,
  ImageIcon,
  ImagePlus,
  Layers3,
  LoaderCircle,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, usePathname, useRouter } from '@/core/i18n/navigation';
import { generationDefaults, mapGenerationOptions } from '@/config/generation';
import { getGenerationCredits } from '@/config/generation/model-routes';
import {
  directionGenerateSource,
  SPRITE_DIRECTIONS,
  toggleLinkedDirections,
  uniqueDirectionSources,
} from '@/config/generation/sprite';
import { CreditCostMark } from '@/shared/blocks/common/credit-cost';
import { CharacterCreateDialog } from '@/shared/blocks/projects/character-create-dialog';
import {
  CharacterImageDeleteDialog,
  CharacterImageRenameDialog,
} from '@/shared/blocks/projects/character-item-dialogs';
import {
  AnimationCard,
  CharacterAssetCard,
  DirectionGrid,
  DirectionPreviewGrid,
  DirectionSelectPad,
  ReferenceImagePicker,
} from '@/shared/blocks/projects/character-workspace-media';
import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  characterAssetGridClass,
  characterWorkspacePath,
  characterWorkspaceStage,
  findActiveBaseFile,
  generationDirectionValue,
  groupAnimationSets,
  groupDirectionFiles,
  normalizeDirection,
  parseAssetMetadata,
  type CharacterWorkflowStage,
  type CharacterWorkspaceAnimation,
  type CharacterWorkspaceFile,
} from '@/shared/lib/character-workspace';
import {
  readApiPayload,
  useProductApiFeedback,
} from '@/shared/lib/product-api-error';
import { cn } from '@/shared/lib/utils';

type Workspace = {
  item: { id: string; name: string; description?: string | null };
  variants: Array<{
    id: string;
    name: string;
    variantType: string;
    prompt?: string | null;
  }>;
  files: CharacterWorkspaceFile[];
  animations: CharacterWorkspaceAnimation[];
};

type Character = { id: string; name: string; preview?: { url: string } | null };
type Stage = CharacterWorkflowStage;

export function CharacterWorkspace({
  projectId,
  workspace,
  characters,
}: {
  projectId: string;
  workspace: Workspace;
  characters: Character[];
}) {
  const t = useTranslations('workspace.characters');
  const tg = useTranslations('workspace.generation');
  const td = useTranslations('workspace.directions');
  const to = useTranslations('generation');
  const notifyApiError = useProductApiFeedback();
  const pathname = usePathname();
  const router = useRouter();
  const stage = characterWorkspaceStage(pathname);
  const stagePath = (next: Stage) =>
    characterWorkspacePath(projectId, workspace.item.id, next);
  const keepSelectionRef = useRef(false);
  const activeBaseFile = findActiveBaseFile(workspace.files);

  const initialFile = activeBaseFile || workspace.files[0];
  const initialVariant =
    initialFile?.variantId || workspace.variants[0]?.id || '';

  const [selectedVariant, setSelectedVariant] = useState(initialVariant);
  const [selectedFileId, setSelectedFileId] = useState(initialFile?.id || '');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [editType, setEditType] = useState<string>(generationDefaults.editType);
  const [action, setAction] = useState<string>(generationDefaults.actionType);
  const [direction, setDirection] = useState<string>(
    generationDefaults.direction
  );
  const [frames, setFrames] = useState<string>(generationDefaults.frames);
  const [frameSize, setFrameSize] = useState<string>(
    generationDefaults.frameSize
  );
  const [selectedDirections, setSelectedDirections] = useState<string[]>([
    ...SPRITE_DIRECTIONS[4],
  ]);
  const [busy, setBusy] = useState(false);
  const [generationId, setGenerationId] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<any[]>([]);
  const [resultPreview, setResultPreview] = useState('');
  const [deleteFileId, setDeleteFileId] = useState('');
  const [renameFile, setRenameFile] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const selectedFile = workspace.files.find(
    (file) => file.id === selectedFileId
  );

  useEffect(() => {
    if (
      selectedFileId &&
      !workspace.files.some((file) => file.id === selectedFileId)
    ) {
      const fallback =
        findActiveBaseFile(workspace.files) || workspace.files[0];
      setSelectedFileId(fallback?.id || '');
      if (fallback?.variantId) setSelectedVariant(fallback.variantId);
    }
  }, [selectedFileId, workspace.files]);

  useEffect(() => {
    if (stage !== 'directions' && stage !== 'animations') return;
    if (keepSelectionRef.current) {
      keepSelectionRef.current = false;
      return;
    }
    const base = findActiveBaseFile(workspace.files);
    setSelectedFileId(base?.id || '');
    if (base?.variantId) setSelectedVariant(base.variantId);
    // Only reset the generation input when switching stage via the header.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);
  const referenceFiles = workspace.files.filter((file) =>
    ['base_reference', 'direction_reference'].includes(file.role)
  );
  const baseFiles = workspace.files.filter(
    (file) => file.role === 'base_reference'
  );
  const directionBatches = useMemo(
    () => groupDirectionFiles(workspace.files, selectedVariant),
    [selectedVariant, workspace.files]
  );
  const animationSets = useMemo(
    () => groupAnimationSets(workspace.animations, selectedVariant),
    [selectedVariant, workspace.animations]
  );
  const selectedBatch = directionBatches.find(
    (batch) => batch.id === selectedBatchId
  );
  const sheetFiles = useMemo(() => {
    const ids = new Set<string>();
    return workspace.animations.flatMap((animation) => {
      const frame = animation.frames[0];
      if (!frame || ids.has(frame.file.id)) return [];
      ids.add(frame.file.id);
      return [
        {
          id: frame.file.id,
          variantId: animation.set.variantId,
          generationId: null,
          role: 'spritesheet',
          isActiveReference: false,
          metadataJson: JSON.stringify({
            action: animation.set.action,
            direction: animation.clip.direction,
            versionId: animation.version?.id,
          }),
          url: frame.file.url,
          createdAt: animation.set.createdAt,
        },
      ];
    });
  }, [workspace.animations]);

  const directionLabel = (value: string) =>
    td.has(value as never) ? td(value as never) : value;
  const options = (
    key: 'editType' | 'actionType' | 'direction' | 'frames' | 'frameSize'
  ) => mapGenerationOptions(key, (path) => to(path as never));

  const cardLabels = {
    zoom: tg('zoom'),
    download: tg('download'),
    more: t('more'),
    selected: t('selectedInput'),
    active: t('active'),
    setActive: t('setActive'),
    animate: t('generateAnimation'),
    directions: t('generateDirections'),
    rename: t('rename'),
    delete: t('deleteImage'),
  };

  const fail = (reason?: unknown) => {
    setBusy(false);
    setStatus('failed');
    setError(notifyApiError(reason));
  };

  const captureResult = (items?: any[]) => {
    const result = items?.find((item) => item.file?.url)?.file?.url;
    if (result) setResultPreview(result);
  };

  const poll = async (id: string) => {
    const payload = await readApiPayload(await fetch(`/api/generations/${id}`));
    setStatus(payload.data.status);
    setProgress(payload.data.items || []);
    captureResult(payload.data.items);
    if (['pending', 'processing'].includes(payload.data.status)) {
      window.setTimeout(() => poll(id).catch(fail), 1800);
    } else {
      setBusy(false);
      router.refresh();
    }
  };

  const setActive = async (file: CharacterWorkspaceFile) => {
    if (!file.variantId) return;
    setBusy(true);
    try {
      await readApiPayload(
        await fetch(
          `/api/projects/${projectId}/characters/${workspace.item.id}/base`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileId: file.id,
              variantId: file.variantId,
            }),
          }
        )
      );
      setSelectedFileId(file.id);
      router.refresh();
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    if (!selectedFile) {
      setError(
        stage === 'base'
          ? t('editReferenceRequired')
          : tg('motionReferenceRequired')
      );
      return;
    }
    setBusy(true);
    setError('');
    setStatus('queued');
    setProgress([]);
    setResultPreview('');
    const id = crypto.randomUUID();
    setGenerationId(id);
    const base = {
      id,
      itemId: workspace.item.id,
      variantId: selectedVariant,
      referenceFileId: selectedFile.id,
      prompt: prompt.trim() || undefined,
    };
    let body: Record<string, unknown>;
    if (stage === 'base') {
      body = { ...base, type: 'character_variant', editType };
    } else if (stage === 'directions') {
      body = {
        ...base,
        type: 'character_directions',
        directions: selectedDirections,
        action,
      };
    } else {
      const selectedDirection =
        selectedFile.role === 'direction_reference'
          ? normalizeDirection(
              String(
                parseAssetMetadata(selectedFile.metadataJson).direction || ''
              )
            )
          : normalizeDirection(direction);
      body = {
        ...base,
        type: 'animation',
        action,
        directionMode: 'single',
        direction: selectedDirection,
        frames: frames === 'auto' ? 'auto' : Number(frames),
        frameSize: Number(frameSize),
        fps: 12,
      };
    }
    try {
      const payload = await readApiPayload(
        await fetch(`/api/projects/${projectId}/generations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      );
      setProgress(payload.data.items || []);
      setStatus(payload.data.status);
      captureResult(payload.data.items);
      if (['pending', 'processing'].includes(payload.data.status)) {
        window.setTimeout(() => poll(id).catch(fail), 1800);
      } else {
        setBusy(false);
        router.refresh();
      }
    } catch (reason) {
      fail(reason);
    }
  };

  const retryGeneration = async () => {
    if (!generationId) return;
    setBusy(true);
    setError('');
    try {
      const payload = await readApiPayload(
        await fetch(`/api/generations/${generationId}/retry`, {
          method: 'POST',
        })
      );
      setProgress(payload.data.items || []);
      setStatus(payload.data.status);
      captureResult(payload.data.items);
      if (['pending', 'processing'].includes(payload.data.status)) {
        window.setTimeout(() => poll(generationId).catch(fail), 1800);
      } else {
        setBusy(false);
        router.refresh();
      }
    } catch (reason) {
      fail(reason);
    }
  };

  const openStageWithFile = (
    file: CharacterWorkspaceFile,
    next: Stage,
    extras?: () => void
  ) => {
    keepSelectionRef.current = true;
    setSelectedFileId(file.id);
    if (file.variantId) setSelectedVariant(file.variantId);
    extras?.();
    router.push(stagePath(next));
  };

  const openAnimationForDirection = (
    file: CharacterWorkspaceFile,
    canonicalDirection: string
  ) => {
    openStageWithFile(file, 'animations', () => {
      setSelectedBatchId('');
      setDirection(generationDirectionValue(canonicalDirection));
    });
  };

  const directionSources = uniqueDirectionSources(selectedDirections);
  const taskCount = stage === 'directions' ? directionSources.length : 1;
  const creditCost = getGenerationCredits(
    stage === 'animations' ? 'animation' : 'character',
    { taskCount }
  );
  const retryCount = progress.filter((item) =>
    ['failed', 'canceled', 'postprocessing_failed'].includes(item.status)
  ).length;
  const retryCredits = getGenerationCredits(
    stage === 'animations' ? 'animation' : 'character',
    { taskCount: Math.max(retryCount, 1), retry: true }
  );
  const animationDirections = options('direction').filter(
    (option) => !['four-way', 'eight-way'].includes(option.value)
  );
  const directionPreviewEntries = useMemo(() => {
    const byDirection = new Map<string, string>();
    for (const item of progress) {
      const dir = String(
        item.metadata?.direction || item.role.split(':').at(-1) || ''
      );
      if (item.file?.url) byDirection.set(dir, item.file.url);
    }
    return SPRITE_DIRECTIONS[8].map((direction) => {
      const own = byDirection.get(direction);
      if (own) return { direction, url: own, mirrored: false };
      const source = directionGenerateSource(direction);
      const sourceUrl =
        source !== direction ? byDirection.get(source) : undefined;
      if (sourceUrl && selectedDirections.includes(direction)) {
        return { direction, url: sourceUrl, mirrored: true };
      }
      return { direction };
    });
  }, [progress, selectedDirections]);

  const stages: Array<{ id: Stage; icon: typeof UserRound }> = [
    { id: 'base', icon: UserRound },
    { id: 'directions', icon: Layers3 },
    { id: 'animations', icon: Film },
    { id: 'sheets', icon: ImageIcon },
  ];

  return (
    <div className="bg-background -mx-4 -mt-8 -mb-8 grid h-[calc(100dvh-56px)] min-h-140 overflow-hidden border-y md:-mx-6 lg:grid-cols-[180px_minmax(0,1fr)_330px]">
      <aside className="bg-card/55 overflow-y-auto border-b p-3 lg:border-r lg:border-b-0">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-heading text-sm font-semibold">
            {t('title')}
          </span>
          <CharacterCreateDialog
            projectId={projectId}
            trigger={
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                aria-label={t('new')}
              >
                <Sparkles className="size-4" />
              </Button>
            }
          />
        </div>
        <div className="flex gap-2 overflow-x-auto lg:flex-col">
          {characters.map((character) => (
            <Link
              key={character.id}
              href={characterWorkspacePath(projectId, character.id, stage)}
              className={cn(
                'hover:bg-primary/10 flex min-w-36 items-center gap-2 rounded-md border border-transparent p-2 text-sm lg:min-w-0',
                character.id === workspace.item.id &&
                  'border-primary/35 bg-primary/10 text-primary'
              )}
            >
              <div className="bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border">
                {character.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={character.preview.url}
                    alt=""
                    className="size-full object-contain [image-rendering:pixelated]"
                  />
                ) : (
                  <UserRound className="size-4" />
                )}
              </div>
              <span className="truncate">{character.name}</span>
            </Link>
          ))}
        </div>
      </aside>

      <main className="flex min-w-0 flex-col overflow-hidden">
        <header className="flex min-h-12 items-center gap-1 overflow-x-auto border-b px-3">
          {stages.map(({ id, icon: Icon }) => {
            const href = stagePath(id);
            const active = stage === id;
            return (
              <Link
                key={id}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'text-muted-foreground hover:bg-primary/10 hover:text-primary flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm',
                  active && 'bg-primary/10 text-primary'
                )}
              >
                <Icon className="size-4" />
                {t(`workflow.${id}`)}
              </Link>
            );
          })}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="mb-4">
            <div>
              <h1 className="font-heading text-lg font-semibold">
                {workspace.item.name}
              </h1>
              <p className="text-muted-foreground mt-1 text-xs">
                {t(`stageDescriptions.${stage}`)}
              </p>
            </div>
          </div>

          {stage === 'base' ? (
            <div className={characterAssetGridClass}>
              {baseFiles.map((file, index) => (
                <CharacterAssetCard
                  key={file.id}
                  file={file}
                  alt={`${workspace.item.name} ${index + 1}`}
                  label={
                    workspace.variants.find(
                      (variant) => variant.id === file.variantId
                    )?.name || t('variation')
                  }
                  selected={selectedFileId === file.id}
                  active={activeBaseFile?.id === file.id}
                  labels={cardLabels}
                  onSelect={() => {
                    setSelectedFileId(file.id);
                    if (file.variantId) setSelectedVariant(file.variantId);
                  }}
                  onSetActive={() => setActive(file)}
                  onDirections={() => openStageWithFile(file, 'directions')}
                  onAnimate={() =>
                    openStageWithFile(file, 'animations', () =>
                      setSelectedBatchId('')
                    )
                  }
                  onRename={() =>
                    setRenameFile({
                      id: file.id,
                      name:
                        workspace.variants.find(
                          (variant) => variant.id === file.variantId
                        )?.name || t('variation'),
                    })
                  }
                  onDelete={() => setDeleteFileId(file.id)}
                />
              ))}
              {!baseFiles.length ? <EmptyState label={t('emptyBase')} /> : null}
            </div>
          ) : null}

          {stage === 'directions' ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {directionBatches.map((batch, index) => (
                <section
                  key={batch.id}
                  className="bg-card/35 w-full rounded-xl border p-3"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-medium">
                        {t('directionSet', { number: index + 1 })}
                      </h2>
                      <p className="text-muted-foreground mt-0.5 font-mono text-[10px]">
                        {t('directionCount', { count: batch.mode })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={
                        selectedBatchId === batch.id ? 'default' : 'outline'
                      }
                      onClick={() => {
                        keepSelectionRef.current = true;
                        setSelectedBatchId(batch.id);
                        const first = batch.files.find(
                          (entry) => entry.file
                        )?.file;
                        if (first) {
                          setSelectedFileId(first.id);
                          if (first.variantId) {
                            setSelectedVariant(first.variantId);
                          }
                        }
                        router.push(stagePath('animations'));
                      }}
                    >
                      <Film className="size-4" />
                      {t('animateSet')}
                    </Button>
                  </div>
                  <DirectionGrid
                    entries={batch.files}
                    centerFile={batch.sourceFile}
                    selectedId={selectedFileId}
                    labels={{
                      zoom: tg('zoom'),
                      download: tg('download'),
                      more: t('more'),
                      selected: t('selectedInput'),
                      animate: t('generateAnimation'),
                      missing: t('missingDirection'),
                      source: t('directionSource'),
                    }}
                    directionLabel={directionLabel}
                    onSelect={(file) => {
                      setSelectedFileId(file.id);
                      setSelectedBatchId('');
                      setDirection(
                        generationDirectionValue(
                          normalizeDirection(
                            String(
                              parseAssetMetadata(file.metadataJson).direction ||
                                ''
                            )
                          )
                        )
                      );
                    }}
                    onAnimate={openAnimationForDirection}
                  />
                </section>
              ))}
              {!directionBatches.length ? (
                <EmptyState label={t('emptyDirections')} />
              ) : null}
            </div>
          ) : null}

          {stage === 'animations' ? (
            <div className="space-y-5">
              {animationSets.map((group) => (
                <section key={group.set.id}>
                  <h2 className="mb-2 text-sm font-medium">{group.set.name}</h2>
                  <div className={characterAssetGridClass}>
                    {group.clips.map((animation) => (
                      <AnimationCard
                        key={animation.clip.id}
                        animation={animation}
                        directionLabel={directionLabel}
                        labels={{
                          frames: t('frames'),
                          open: tg('openEditor'),
                          zoom: tg('zoom'),
                          download: tg('download'),
                          more: t('more'),
                        }}
                        onOpen={() => {
                          if (animation.version) {
                            router.push(
                              `/editor/animations/${animation.version.id}`
                            );
                          }
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))}
              {!animationSets.length ? (
                <EmptyState
                  label={t('emptyAnimations')}
                  hint={t('emptyAnimationsHint')}
                  pointToAside
                />
              ) : null}
            </div>
          ) : null}

          {stage === 'sheets' ? (
            <div className={characterAssetGridClass}>
              {sheetFiles.map((file) => {
                const meta = parseAssetMetadata(file.metadataJson);
                const actionKey =
                  `options.actionType.${String(meta.action || 'idle')}` as never;
                return (
                  <CharacterAssetCard
                    key={file.id}
                    file={file}
                    alt={`${workspace.item.name} ${String(meta.action || '')}`}
                    label={`${to.has(actionKey) ? to(actionKey) : String(meta.action || '')} · ${directionLabel(String(meta.direction || 'none'))}`}
                    selected={false}
                    labels={cardLabels}
                    onSelect={() => undefined}
                  />
                );
              })}
              {!sheetFiles.length ? (
                <EmptyState label={t('emptySheets')} />
              ) : null}
            </div>
          ) : null}
        </div>
      </main>

      <aside
        id="character-workspace-panel"
        className="bg-card/55 overflow-y-auto border-t p-4 lg:border-t-0 lg:border-l"
      >
        {stage === 'sheets' ? (
          <h2 className="font-heading text-sm font-semibold">
            {t(`panels.${stage}`)}
          </h2>
        ) : null}
        <div className={cn('space-y-4', stage === 'sheets' && 'mt-4')}>
          {stage === 'base' ? (
            <>
              <ResultPreview
                src={resultPreview}
                placeholder={t('resultPlaceholder')}
                processing={busy}
                processingLabel={t('processing')}
              />

              <RowOptionSelect
                label={to('fields.editType')}
                value={editType}
                onValueChange={setEditType}
                options={options('editType')}
              />

              <PromptComposer
                value={prompt}
                onChange={setPrompt}
                placeholder={t(
                  editType === 'costume'
                    ? 'editCostumePlaceholder'
                    : 'editPosePlaceholder'
                )}
                selectedFile={selectedFile}
                referenceAlt={t('referenceInput')}
                onPick={() => setPickerOpen(true)}
                onClear={() => setSelectedFileId('')}
                removeLabel={to('upload.remove')}
                actionLabel={busy ? t('processing') : t('edit')}
                credits={creditCost}
                busy={busy}
                onSubmit={generate}
              />
            </>
          ) : null}

          {stage === 'animations' ? (
            <>
              <ResultPreview
                src={resultPreview}
                placeholder={t('resultPlaceholder')}
                processing={busy}
                processingLabel={t('processing')}
              />
              <RowOptionSelect
                label={to('fields.actionType')}
                value={action}
                onValueChange={setAction}
                options={options('actionType')}
              />
              <RowOptionSelect
                label={to('fields.direction')}
                value={direction}
                onValueChange={(value) => {
                  setDirection(value);
                  setSelectedBatchId('');
                }}
                options={animationDirections}
              />
              <RowOptionSelect
                label={t('framesLabel')}
                value={frames}
                onValueChange={setFrames}
                options={options('frames')}
              />
              <RowOptionSelect
                label={to('fields.frameSize')}
                value={frameSize}
                onValueChange={setFrameSize}
                options={options('frameSize')}
              />
              <PromptComposer
                value={prompt}
                onChange={setPrompt}
                placeholder={t('promptPlaceholder')}
                selectedFile={selectedFile}
                referenceAlt={t('referenceInput')}
                onPick={() => setPickerOpen(true)}
                onClear={() => setSelectedFileId('')}
                removeLabel={to('upload.remove')}
                actionLabel={busy ? t('processing') : t('generate')}
                credits={creditCost}
                busy={busy}
                onSubmit={generate}
              />
            </>
          ) : null}

          {stage === 'directions' ? (
            <>
              <div className="space-y-2">
                <DirectionPreviewGrid
                  entries={directionPreviewEntries}
                  centerSrc={selectedFile?.url}
                  centerAlt={t('referenceInput')}
                  processing={busy}
                  processingLabel={t('processing')}
                />
                <p className="text-muted-foreground text-center text-xs">
                  {t('resultPlaceholder')}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm">{t('action')}</p>
                <div className="grid grid-cols-3 overflow-hidden rounded-md border">
                  {options('actionType')
                    .filter((option) =>
                      ['idle', 'walk', 'run'].includes(option.value)
                    )
                    .map((option) => (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => setAction(option.value)}
                        className={cn(
                          'hover:bg-primary/10 hover:text-primary h-9 border-r text-xs last:border-r-0',
                          action === option.value &&
                            'bg-primary text-primary-foreground'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 pt-0.5 text-sm">
                    {t('directionSection')}
                  </span>
                  <p className="text-muted-foreground text-xs leading-5">
                    {t('directionFlipHint')}
                  </p>
                </div>
                <DirectionSelectPad
                  selected={selectedDirections}
                  centerSrc={selectedFile?.url}
                  centerAlt={t('referenceInput')}
                  chooseLabel={
                    selectedFile ? t('changeCharacter') : t('chooseReference')
                  }
                  directionLabel={directionLabel}
                  onToggle={(value) =>
                    setSelectedDirections((current) =>
                      toggleLinkedDirections(current, value)
                    )
                  }
                  onCenterClick={() => setPickerOpen(true)}
                />
                <p className="text-muted-foreground text-center text-xs">
                  {t('directionCreditSummary', {
                    count: selectedDirections.length,
                    credits: creditCost,
                  })}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setPickerOpen(true)}
                  >
                    {t('changeCharacter')}
                  </Button>
                  <Button
                    className="min-w-0 flex-1"
                    onClick={generate}
                    disabled={
                      busy || !selectedFile || !directionSources.length
                    }
                  >
                    {busy ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : null}
                    {busy ? t('processing') : t('generateCollection')}
                    {busy ? null : <CreditCostMark credits={creditCost} />}
                  </Button>
                </div>
              </div>
            </>
          ) : null}

          {stage === 'sheets' ? (
            <p className="text-muted-foreground text-sm leading-6">
              {t('sheetHelp')}
            </p>
          ) : null}

          {status && stage !== 'base' ? (
            <p className="text-muted-foreground text-xs" aria-live="polite">
              {tg(
                (['pending', 'queued'].includes(status)
                  ? 'queued'
                  : status === 'processing'
                    ? 'processing'
                    : status === 'success'
                      ? 'success'
                      : status === 'partial'
                        ? 'partial'
                        : 'failed') as never
              )}
            </p>
          ) : null}
          {progress.length > 0 && stage === 'animations' ? (
            <div className="flex flex-wrap gap-1.5">
              {progress.map((item) => (
                <span
                  key={item.id}
                  className="bg-secondary rounded-md border px-2 py-1 font-mono text-[9px]"
                >
                  {directionLabel(item.role.split(':').at(-1) || item.role)} ·{' '}
                  {item.status}
                </span>
              ))}
            </div>
          ) : null}
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          {generationId && ['partial', 'failed'].includes(status) ? (
            <Button
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={retryGeneration}
            >
              {tg('retry')}
              <CreditCostMark credits={retryCredits} />
            </Button>
          ) : null}
        </div>
      </aside>

      <ReferenceImagePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        files={referenceFiles}
        selectedId={selectedFileId}
        title={t('pickerTitle')}
        description={t('pickerDescription')}
        selectLabel={t('chooseReference')}
        onSelect={(file) => {
          setSelectedFileId(file.id);
          setSelectedBatchId('');
          if (file.variantId) setSelectedVariant(file.variantId);
          if (file.role === 'direction_reference') {
            setDirection(
              generationDirectionValue(
                normalizeDirection(
                  String(parseAssetMetadata(file.metadataJson).direction || '')
                )
              )
            );
          }
        }}
      />
      {renameFile ? (
        <CharacterImageRenameDialog
          open
          onOpenChange={(open) => {
            if (!open) setRenameFile(null);
          }}
          projectId={projectId}
          itemId={workspace.item.id}
          fileId={renameFile.id}
          name={renameFile.name}
          onRenamed={() => {
            setRenameFile(null);
            router.refresh();
          }}
        />
      ) : null}
      {deleteFileId ? (
        <CharacterImageDeleteDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteFileId('');
          }}
          projectId={projectId}
          itemId={workspace.item.id}
          fileId={deleteFileId}
          onDeleted={() => {
            setDeleteFileId('');
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function EmptyState({
  label,
  hint,
  pointToAside,
}: {
  label: string;
  hint?: string;
  pointToAside?: boolean;
}) {
  return (
    <div
      className="text-muted-foreground col-span-full flex min-h-64 w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-sm"
    >
      <ImageIcon className="size-7 shrink-0" aria-hidden="true" />
      <p className="max-w-md text-center leading-6">{label}</p>
      {hint ? (
        <p
          className={cn(
            'text-primary/90 flex items-center justify-center gap-2 text-center text-xs leading-5',
            pointToAside && 'lg:justify-end'
          )}
        >
          <span>{hint}</span>
          {pointToAside ? (
            <ArrowRight
              className="text-primary hidden size-5 shrink-0 lg:inline"
              aria-hidden="true"
            />
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

function RowOptionSelect({
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
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger size="sm" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ResultPreview({
  src,
  placeholder,
  processing,
  processingLabel,
}: {
  src?: string;
  placeholder: string;
  processing: boolean;
  processingLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="border-border bg-secondary/35 relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border p-3">
        {src ? (
          <div className="relative size-full overflow-hidden rounded-lg bg-[linear-gradient(45deg,rgba(255,255,255,.04)_25%,transparent_25%),linear-gradient(-45deg,rgba(255,255,255,.04)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(255,255,255,.04)_75%),linear-gradient(-45deg,transparent_75%,rgba(255,255,255,.04)_75%)] bg-size-[16px_16px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={placeholder}
              className="size-full object-contain [image-rendering:pixelated]"
            />
          </div>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 text-center">
            <ImageIcon className="text-primary/75 size-14 stroke-[1.2]" />
          </div>
        )}
        {processing ? (
          <div className="bg-background/75 absolute inset-0 flex flex-col items-center justify-center gap-2">
            <LoaderCircle className="text-primary size-7 animate-spin" />
            <span className="text-muted-foreground text-xs">
              {processingLabel}
            </span>
          </div>
        ) : null}
      </div>
      {!src ? (
        <p className="text-muted-foreground text-center text-xs">
          {placeholder}
        </p>
      ) : null}
    </div>
  );
}

function PromptComposer({
  value,
  onChange,
  placeholder,
  selectedFile,
  referenceAlt,
  onPick,
  onClear,
  removeLabel,
  actionLabel,
  credits,
  busy,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  selectedFile?: CharacterWorkspaceFile;
  referenceAlt: string;
  onPick: () => void;
  onClear: () => void;
  removeLabel: string;
  actionLabel: string;
  credits: number;
  busy: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="bg-background relative min-h-40 overflow-hidden rounded-xl border">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-40 resize-none border-0 bg-transparent pr-20 pb-14 shadow-none focus-visible:ring-0"
      />
      {selectedFile ? (
        <div className="absolute top-2 right-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedFile.url}
            alt={referenceAlt}
            className="size-16 cursor-pointer rounded-md border object-contain [image-rendering:pixelated]"
            onClick={onPick}
          />
          <Button
            size="icon-sm"
            variant="secondary"
            className="absolute -top-1.5 -right-1.5 size-5 rounded-full"
            onClick={onClear}
            aria-label={removeLabel}
          >
            <X className="size-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPick}
          className="hover:border-primary/50 text-muted-foreground absolute top-2 right-2 flex size-16 flex-col items-center justify-center rounded-md border border-dashed text-[10px]"
        >
          <ImagePlus className="size-4" />
        </button>
      )}
      <Button
        className="absolute right-2 bottom-2"
        onClick={onSubmit}
        disabled={busy}
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {actionLabel}
        {busy ? null : <CreditCostMark credits={credits} />}
      </Button>
    </div>
  );
}
