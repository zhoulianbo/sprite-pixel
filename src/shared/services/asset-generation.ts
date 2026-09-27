import { and, asc, desc, eq, inArray, isNull, max } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  aiTask,
  animationClip,
  animationFrame,
  animationSet,
  animationVersion,
  assetFile,
  assetItem,
  assetVariant,
  generation,
  generationInput,
  generationTask,
} from '@/config/db/schema';
import {
  buildAnimationPrompt,
  buildAnimationVideoPrompt,
  buildCharacterBasePrompt,
  buildCharacterEditPrompt,
  buildIconDescriptionExpandPrompt,
  buildIconGenerationPrompt,
  buildIconSheetDetail,
  CHARACTER_OUTPUT_ASPECT_RATIO,
  generationDefaults,
  needsIconDescriptionExpand,
  parseIconDescriptionExpandResult,
  resolveGenerationAspectRatio,
  type IconStyleSource,
} from '@/config/generation';
import {
  getGenerationCredits,
  getGenerationModelRoute,
  iconPromptExpandModel,
  type GenerationModelKind,
} from '@/config/generation/model-routes';
import {
  aggregateGenerationStatus,
  directionMirrorOf,
  resolveAnimationSheetSize,
  resolveAnimationVideoDuration,
  resolveDirectionSelection,
  resolveProviderAnimationSheetSize,
  SPRITE_DIRECTIONS,
} from '@/config/generation/sprite';
import { AIMediaType, AITaskStatus } from '@/extensions/ai';
import { ContentSafetyError } from '@/extensions/content-safety';
import { getUuid } from '@/shared/lib/hash';
import { imageInfo } from '@/shared/lib/sprite-tools/image-info';
import {
  extensionFromMime,
  generationAssetType,
  isProviderReachableUrl,
  projectAssetStorageKey,
} from '@/shared/lib/storage-paths';
import {
  createAITask,
  findAITaskById,
  settleAITaskCredit,
  updateAITaskById,
} from '@/shared/models/ai_task';
import {
  findAssetFileById,
  getProjectItem,
  updateCharacterItem,
} from '@/shared/models/asset';
import { getRemainingCredits } from '@/shared/models/credit';
import { getOwnedProject } from '@/shared/models/project';
import { getAIService } from '@/shared/services/ai';
import { assertPromptAllowedForGeneration } from '@/shared/services/content-safety';
import { startGenerationWorkflow } from '@/shared/services/generation-workflow';
import { processSpriteVideo } from '@/shared/services/sprite-media-processor';
import {
  getAssetPublicUrlResolver,
  getStorageService,
} from '@/shared/services/storage';

export type SpriteGenerationKind =
  | 'character'
  | 'character_variant'
  | 'character_directions'
  | 'animation'
  | 'icon_batch';

export type SpriteGenerationRequest = {
  id: string;
  type: SpriteGenerationKind;
  prompt?: string;
  name?: string;
  itemId?: string;
  variantId?: string;
  referenceFileId?: string;
  iconStyleSource?: IconStyleSource;
  directionMode?: 'single' | '4' | '8';
  direction?: string;
  directions?: string[];
  directionReferences?: Record<string, string>;
  action?: string;
  actionConfig?: {
    jumpType?: 'in-place' | 'forward';
    dashType?: 'forward' | 'backward' | 'side';
    weapon?:
      | 'keep-current'
      | 'unarmed'
      | 'sword'
      | 'axe'
      | 'staff'
      | 'bow'
      | 'dagger'
      | 'spear';
    attackStyle?: 'auto' | 'slash' | 'thrust' | 'heavy' | 'spin';
    shootType?: 'bow' | 'gun' | 'magic-bolt';
    castType?: 'quick' | 'charge' | 'staff' | 'hand';
    severity?: 'light' | 'heavy';
    deathType?: 'collapse' | 'fall-back' | 'fall-forward';
  };
  frames?: number | 'auto';
  fps?: number;
  loop?: boolean;
  items?: Array<{
    id: string;
    name: string;
    description?: string;
    selected?: boolean;
  }>;
  style?: string;
  perspective?: string;
  quality?: string;
  characterType?: string;
  editType?: string;
  frameSize?: number | string;
  width?: number;
  height?: number;
  palette?: string;
  background?: string;
  negativePrompt?: string;
};

type ModelRoute = {
  provider: string;
  model: string;
  credits: number;
  retryCredits?: number;
};
type TaskBlueprint = {
  role: string;
  prompt: string;
  metadata: Record<string, unknown>;
};

export class SpriteGenerationError extends Error {
  constructor(
    public code: string,
    public status = 400
  ) {
    super(code);
  }
}

const directions4 = [...SPRITE_DIRECTIONS[4]];
const directions8 = [...SPRITE_DIRECTIONS[8]];

function resolveCharacterDirectionPlan(input: SpriteGenerationRequest) {
  if (input.directions?.length) {
    return resolveDirectionSelection(input.directions);
  }
  return resolveDirectionSelection(
    input.directionMode === '8' ? directions8 : directions4
  );
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function modelKind(type: SpriteGenerationKind): GenerationModelKind {
  if (type === 'animation') return 'animation';
  if (type === 'icon_batch') return 'icon';
  return 'character';
}

function getModelRoute(kind: GenerationModelKind): ModelRoute {
  const configured = getGenerationModelRoute(kind);
  const provider = configured.provider.trim();
  const model = configured.model.trim();
  const configuredCredits = Number(configured.credits);
  if (
    !provider ||
    !model ||
    !Number.isSafeInteger(configuredCredits) ||
    configuredCredits <= 0
  ) {
    throw new SpriteGenerationError('GENERATION_NOT_CONFIGURED', 503);
  }
  return {
    provider,
    model,
    credits: configuredCredits,
    retryCredits:
      Number('retryCredits' in configured ? configured.retryCredits : 0) ||
      undefined,
  };
}

async function expandIconItemDescriptions(
  input: SpriteGenerationRequest,
  project: Awaited<ReturnType<typeof getOwnedProject>>
) {
  const items = (input.items || []).map((item) => ({ ...item }));
  const thin = items.filter(
    (item) =>
      item.selected !== false &&
      needsIconDescriptionExpand(item.name, item.description)
  );
  if (!thin.length) return items;
  try {
    const aiService = await getAIService();
    const provider = aiService.getProvider(iconPromptExpandModel.provider);
    if (!provider) {
      throw new Error('icon description provider is unavailable');
    }
    const maxOutputTokens = Math.min(
      2048,
      Math.max(512, thin.length * 220 + 128)
    );
    const styleSource =
      input.iconStyleSource ||
      (input.referenceFileId ? 'asset-reference' : 'preset');
    const referenceImages =
      styleSource !== 'preset' && input.referenceFileId
        ? [await signedInputUrl(input.referenceFileId)]
        : [];
    const expandPrompt = buildIconDescriptionExpandPrompt({
      styleSource,
      style: input.style,
      gameGenre: project?.gameGenre,
      items: thin.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
      })),
    });
    const result = await provider.generate({
      params: {
        mediaType: AIMediaType.TEXT,
        model: iconPromptExpandModel.model,
        prompt: expandPrompt,
        options: {
          temperature: 0.3,
          maxOutputTokens,
          reasoningEffort: 'none',
          responseMimeType: 'application/json',
          images: referenceImages,
        },
      },
    });
    console.info(
      JSON.stringify({
        event: 'icon_description_expand_completed',
        model: iconPromptExpandModel.model,
        itemCount: thin.length,
        promptCharacters: expandPrompt.length,
        referenceImageCount: referenceImages.length,
        maxOutputTokens,
        usage:
          (result.taskResult as { usage?: unknown } | undefined)?.usage || null,
      })
    );
    const expanded = parseIconDescriptionExpandResult(
      String(result.taskResult?.text || '')
    );
    const byId = new Map(
      expanded.map((entry) => [entry.id, entry.description])
    );
    if (thin.some((item) => !byId.get(item.id)?.trim())) {
      throw new Error('icon description response is incomplete');
    }
    return items.map((item) => {
      if (item.selected === false) return item;
      const next = byId.get(item.id)?.trim();
      if (next) return { ...item, description: next.slice(0, 500) };
      return item;
    });
  } catch (error) {
    console.error('icon description expand failed', error);
    throw new SpriteGenerationError('ICON_DESCRIPTION_EXPAND_FAILED', 502);
  }
}

function resolveTaskAspectRatio(input: SpriteGenerationRequest) {
  if (input.type === 'animation') {
    return 'landscape';
  }
  if (input.type === 'icon_batch') {
    return resolveGenerationAspectRatio(input.quality);
  }
  return CHARACTER_OUTPUT_ASPECT_RATIO;
}

function buildPrompt(
  input: SpriteGenerationRequest,
  project: Awaited<ReturnType<typeof getOwnedProject>>,
  detail?: string
) {
  if (input.type === 'character') {
    return buildCharacterBasePrompt(input, project);
  }
  if (input.type === 'character_variant') {
    return buildCharacterEditPrompt(input);
  }
  if (input.type === 'animation') {
    return buildAnimationPrompt(input, input.direction);
  }
  if (input.type === 'icon_batch') {
    return buildIconGenerationPrompt({
      detail: detail || '',
      prompt: input.prompt,
      styleSource: input.iconStyleSource,
      hasReference: Boolean(input.referenceFileId),
      style: input.style,
      gameGenre: project?.gameGenre,
      perspective: input.perspective,
      quality: input.quality,
      palette: input.palette || project?.paletteJson,
    });
  }
  const outputLine = `Output size: ${CHARACTER_OUTPUT_ASPECT_RATIO}`;
  const artStyle =
    input.style && input.style !== 'none'
      ? input.style
      : project?.artStyle && project.artStyle !== 'none'
        ? project.artStyle
        : '';
  const perspective =
    input.perspective && input.perspective !== 'none' ? input.perspective : '';
  const context = [
    input.prompt,
    detail,
    project?.gameGenre ? `Game genre: ${project.gameGenre}` : '',
    artStyle ? `Art style: ${artStyle}` : '',
    perspective ? `Perspective: ${perspective}` : '',
    input.characterType ? `Character type: ${input.characterType}` : '',
    outputLine,
    input.palette || project?.paletteJson
      ? `Palette: ${input.palette || project?.paletteJson}`
      : '',
    'Game-ready isolated asset, consistent silhouette, transparent background, no text, no watermark.',
  ];
  return context.filter(Boolean).join('\n');
}

async function validateReference(
  userId: string,
  projectId: string,
  fileId?: string
) {
  if (!fileId) return undefined;
  const file = await findAssetFileById(fileId);
  const project = await getOwnedProject(userId, projectId);
  if (
    !file ||
    !project ||
    file.projectId !== projectId ||
    file.status !== 'ready'
  ) {
    throw new SpriteGenerationError('REFERENCE_NOT_FOUND', 404);
  }
  return file;
}

async function resolveReferenceFileId(
  projectId: string,
  input: SpriteGenerationRequest
) {
  if (input.referenceFileId) return input.referenceFileId;
  if (!input.itemId) return undefined;
  const files = await db()
    .select()
    .from(assetFile)
    .where(
      and(
        eq(assetFile.projectId, projectId),
        eq(assetFile.itemId, input.itemId),
        eq(assetFile.status, 'ready'),
        isNull(assetFile.deletedAt)
      )
    )
    .orderBy(desc(assetFile.createdAt));
  if (input.type === 'animation' && input.direction) {
    const directional = files.find(
      (file: typeof assetFile.$inferSelect) =>
        file.role === 'direction_reference' &&
        parseJson<Record<string, string>>(file.metadataJson, {}).direction ===
          input.direction
    );
    if (directional) return directional.id;
  }
  return files.find(
    (file: typeof assetFile.$inferSelect) => file.isActiveReference
  )?.id;
}

async function signedInputUrl(fileId: string) {
  const file = await findAssetFileById(fileId);
  if (!file?.storageKey) {
    throw new SpriteGenerationError('REFERENCE_NOT_FOUND', 404);
  }
  const storage = await getStorageService();
  const publicUrl = storage.getPublicUrl({ key: file.storageKey });
  if (publicUrl && isProviderReachableUrl(publicUrl)) return publicUrl;
  const signed = await storage.createSignedDownloadUrl({
    key: file.storageKey,
    expiresIn: 3600,
  });
  if (signed && isProviderReachableUrl(signed)) return signed;
  throw new SpriteGenerationError('STORAGE_NOT_CONFIGURED', 503);
}

function assetDisplayName(
  input: { name?: string; prompt?: string },
  fallback: string
) {
  return input.name?.trim() || input.prompt?.trim().slice(0, 60) || fallback;
}

async function planGenerationRecords(
  projectId: string,
  input: SpriteGenerationRequest
) {
  let itemId = input.itemId || null;
  let variantId =
    input.type === 'character_variant' ? null : input.variantId || null;
  const taskMetadata: Record<string, unknown>[] = [];
  let plannedItemId: string | undefined;
  let plannedVariantId: string | undefined;
  let plannedSetId: string | undefined;

  if (itemId && !(await getProjectItem(projectId, itemId))) {
    throw new SpriteGenerationError('ASSET_NOT_FOUND', 404);
  }

  if (input.type === 'character') {
    plannedItemId = getUuid();
    plannedVariantId = getUuid();
    itemId = null;
    variantId = null;
    taskMetadata.push({
      itemId: plannedItemId,
      variantId: plannedVariantId,
    });
  } else if (input.type === 'character_variant') {
    if (!itemId) throw new SpriteGenerationError('ASSET_REQUIRED');
    plannedVariantId = getUuid();
    variantId = null;
    taskMetadata.push({
      itemId,
      variantId: plannedVariantId,
      editType: input.editType === 'costume' ? 'costume' : 'pose',
    });
  }

  if (input.type === 'icon_batch') {
    plannedItemId = getUuid();
    itemId = null;
    variantId = null;
    const icons = (input.items || []).filter(
      (entry) => entry.selected !== false
    );
    taskMetadata.push({
      setId: plannedItemId,
      itemCount: icons.length,
      columns: 3,
      rows: 3,
      items: icons.map((icon, index) => ({
        clientItemId: icon.id,
        name: icon.name,
        description: icon.description || '',
        slot: index + 1,
      })),
    });
  }

  if (input.type === 'animation') {
    if (!itemId) {
      const existingReference = input.referenceFileId
        ? await findAssetFileById(input.referenceFileId)
        : undefined;
      if (
        existingReference?.itemId &&
        existingReference.projectId === projectId
      ) {
        itemId = existingReference.itemId;
        variantId = existingReference.variantId;
      } else {
        plannedItemId = getUuid();
        plannedVariantId = getUuid();
        itemId = null;
        variantId = null;
      }
    }
    plannedSetId = getUuid();
    const mode = input.directionMode || 'single';
    const directions =
      mode === '8'
        ? directions8
        : mode === '4'
          ? directions4
          : [input.direction || 'none'];
    for (const direction of directions) {
      taskMetadata.push({
        setId: plannedSetId,
        clipId: getUuid(),
        direction,
        itemId: itemId || plannedItemId,
        variantId: variantId || plannedVariantId,
      });
    }
  }

  if (input.type === 'character_directions') {
    if (!itemId) throw new SpriteGenerationError('ASSET_REQUIRED');
    const plan = resolveCharacterDirectionPlan(input);
    if (!plan.sources.length) {
      throw new SpriteGenerationError('INVALID_TASK_COUNT');
    }
    taskMetadata.push(
      ...plan.sources.map((direction) => ({
        direction,
        itemId,
        variantId,
        mirrorDirection: directionMirrorOf(direction),
      }))
    );
  }

  return {
    itemId,
    variantId,
    plannedItemId,
    plannedVariantId,
    plannedSetId,
    taskMetadata,
  };
}

function taskBlueprints(
  input: SpriteGenerationRequest,
  project: Awaited<ReturnType<typeof getOwnedProject>>,
  taskMetadata: Record<string, unknown>[]
): TaskBlueprint[] {
  if (input.type === 'icon_batch') {
    const metadata = taskMetadata[0] || {};
    const items = Array.isArray(metadata.items)
      ? metadata.items.map((item: any) => ({
          name: String(item.name || ''),
          description: String(item.description || ''),
        }))
      : [];
    return [
      {
        role: 'icon-sheet',
        metadata,
        prompt: buildPrompt(input, project, buildIconSheetDetail(items)),
      },
    ];
  }
  if (input.type === 'character_directions') {
    return taskMetadata.map((metadata) => ({
      role: `direction:${metadata.direction}`,
      metadata,
      prompt: buildPrompt(
        input,
        project,
        [
          `Show the same character facing ${metadata.direction}.`,
          `Character pose/action: ${input.action || 'idle'}.`,
        ].join('\n')
      ),
    }));
  }
  if (input.type === 'animation') {
    const sheet = resolveProviderAnimationSheetSize(
      input.frames,
      input.frameSize,
      input.action
    );
    return taskMetadata.map((metadata) => ({
      role: `animation:${metadata.direction}`,
      metadata: { ...metadata, frames: sheet.frameCount, ...sheet },
      prompt: buildAnimationVideoPrompt(
        input,
        typeof metadata.direction === 'string' ? metadata.direction : undefined
      ),
    }));
  }
  return [
    {
      role: input.type,
      metadata: taskMetadata[0] || {},
      prompt:
        input.type === 'character'
          ? buildCharacterBasePrompt(input, project)
          : buildCharacterEditPrompt(input),
    },
  ];
}

async function createPlannedTask({
  generationId,
  userId,
  route,
  blueprint,
  sortOrder,
  referenceFileId,
  aspectRatio,
  videoDuration,
  costCredits,
}: {
  generationId: string;
  userId: string;
  route: ModelRoute;
  blueprint: TaskBlueprint;
  sortOrder: number;
  referenceFileId?: string;
  aspectRatio?: string;
  videoDuration?: number;
  costCredits: number;
}) {
  const taskId = getUuid();
  const generationTaskId = getUuid();
  const mediaType = blueprint.role.startsWith('animation:')
    ? AIMediaType.VIDEO
    : AIMediaType.IMAGE;
  const options = {
    customStorage: false,
    ...(referenceFileId ? { referenceFileId } : {}),
    ...(aspectRatio ? { aspectRatio } : {}),
    ...(mediaType === AIMediaType.VIDEO
      ? { resolution: '768p', duration: videoDuration || 2 }
      : { background: 'transparent' }),
  };
  const task = await createAITask(
    {
      id: taskId,
      userId,
      mediaType,
      provider: route.provider,
      model: route.model,
      prompt: blueprint.prompt,
      options: JSON.stringify(options),
      status: AITaskStatus.PENDING,
      taskId: null,
      taskInfo: JSON.stringify({ status: 'queued' }),
      taskResult: null,
      costCredits,
      scene: referenceFileId
        ? mediaType === AIMediaType.VIDEO
          ? 'image-to-video'
          : 'image-to-image'
        : mediaType === AIMediaType.VIDEO
          ? 'text-to-video'
          : 'text-to-image',
    },
    { reserveCredits: true }
  );
  try {
    await db()
      .insert(generationTask)
      .values({
        id: generationTaskId,
        generationId,
        aiTaskId: task.id,
        role: blueprint.role,
        sortOrder,
        metadataJson: JSON.stringify({
          ...blueprint.metadata,
          attempt: Number(blueprint.metadata.attempt || 1),
          referenceFileId: referenceFileId || null,
        }),
        createdAt: new Date().toISOString(),
      });
  } catch (error) {
    await updateAITaskById(task.id, {
      status: AITaskStatus.FAILED,
      creditId: task.creditId,
    });
    throw error;
  }
  return { task, generationTaskId };
}

async function createMediaRetryTask({
  generationId,
  userId,
  previousTask,
  role,
  sortOrder,
  metadata,
  costCredits,
}: {
  generationId: string;
  userId: string;
  previousTask: typeof aiTask.$inferSelect;
  role: string;
  sortOrder: number;
  metadata: Record<string, unknown>;
  costCredits: number;
}) {
  const taskInfo = parseJson<Record<string, unknown>>(
    previousTask.taskInfo,
    {}
  );
  delete taskInfo.errorCode;
  delete taskInfo.errorMessage;
  const task = await createAITask(
    {
      id: getUuid(),
      userId,
      mediaType: previousTask.mediaType,
      provider: previousTask.provider,
      model: previousTask.model,
      prompt: previousTask.prompt,
      options: previousTask.options,
      status: AITaskStatus.SUCCESS,
      taskId: previousTask.taskId || `media-retry:${previousTask.id}`,
      taskInfo: JSON.stringify(taskInfo),
      taskResult: previousTask.taskResult,
      costCredits,
      scene: 'media-postprocessing-retry',
    },
    { reserveCredits: true }
  );
  try {
    const generationTaskId = getUuid();
    await db()
      .insert(generationTask)
      .values({
        id: generationTaskId,
        generationId,
        aiTaskId: task.id,
        role,
        sortOrder,
        metadataJson: JSON.stringify(metadata),
        createdAt: new Date().toISOString(),
      });
    return { task, generationTaskId };
  } catch (error) {
    await updateAITaskById(task.id, {
      status: AITaskStatus.FAILED,
      creditId: task.creditId,
    });
    throw error;
  }
}

function compactFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message
      .replace(/https?:\/\/[^\s"']+/g, (url) => {
        const queryIndex = url.indexOf('?');
        return queryIndex >= 0 ? `${url.slice(0, queryIndex)}?[redacted]` : url;
      })
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1000) || 'UNKNOWN_ERROR'
  );
}

function logSpriteFailure(event: string, details: Record<string, unknown>) {
  console.error(JSON.stringify({ event, ...details }));
}

function taskInfoError(taskInfo: unknown) {
  const info = (taskInfo || {}) as Record<string, unknown>;
  return compactFailure(
    info.errorMessage || info.error || info.errorCode || ''
  );
}

function localWorkflowHandlers(generationId: string) {
  return {
    advance: () => advanceSpriteGenerationWorkflow(generationId),
    fail: (failureCode: string, failureReason: string) =>
      failSpriteGenerationWorkflow(generationId, failureCode, failureReason),
  };
}

async function dispatchPlannedTask(task: typeof aiTask.$inferSelect) {
  if (task.taskId) return task;
  const options = parseJson<Record<string, unknown>>(task.options, {});
  const referenceFileId = String(options.referenceFileId || '');
  const providerOptions: Record<string, unknown> = {
    customStorage: options.customStorage !== false,
  };
  if (referenceFileId) {
    providerOptions.images = [await signedInputUrl(referenceFileId)];
  }
  if (options.aspectRatio) providerOptions.aspectRatio = options.aspectRatio;
  if (task.mediaType === AIMediaType.VIDEO) {
    providerOptions.resolution = options.resolution || '768p';
    providerOptions.duration = options.duration || 2;
  } else {
    providerOptions.background = 'transparent';
  }
  try {
    const aiService = await getAIService();
    const provider = aiService.getProvider(task.provider);
    if (!provider) throw new Error('PROVIDER_NOT_CONFIGURED');
    const result = await provider.generate({
      params: {
        mediaType: task.mediaType as AIMediaType,
        model: task.model,
        prompt: task.prompt,
        options: providerOptions,
      },
    });
    if (result.taskStatus === AITaskStatus.FAILED) {
      logSpriteFailure('sprite_provider_generate_failed', {
        aiTaskId: task.id,
        provider: task.provider,
        model: task.model,
        mediaType: task.mediaType,
        taskId: result.taskId,
        reason: taskInfoError(result.taskInfo) || 'PROVIDER_GENERATE_FAILED',
      });
    }
    return (
      (await updateAITaskById(task.id, {
        status: result.taskStatus,
        taskId: result.taskId,
        taskInfo: result.taskInfo
          ? JSON.stringify(result.taskInfo)
          : task.taskInfo,
        taskResult: result.taskResult
          ? JSON.stringify(result.taskResult)
          : task.taskResult,
        creditId: task.creditId,
      })) || task
    );
  } catch (error) {
    const reason = compactFailure(error);
    logSpriteFailure('sprite_provider_dispatch_failed', {
      aiTaskId: task.id,
      provider: task.provider,
      model: task.model,
      mediaType: task.mediaType,
      reason,
    });
    return (
      (await updateAITaskById(task.id, {
        status: AITaskStatus.FAILED,
        taskInfo: JSON.stringify({
          errorCode: 'PROVIDER_DISPATCH_FAILED',
          errorMessage: reason,
        }),
        creditId: task.creditId,
      })) || task
    );
  }
}

export async function startSpriteGeneration(
  userId: string,
  projectId: string,
  input: SpriteGenerationRequest
) {
  const existing = await findOwnedGeneration(userId, input.id);
  if (existing) return getSpriteGeneration(userId, existing.id, false);

  const project = await getOwnedProject(userId, projectId);
  if (!project) throw new SpriteGenerationError('PROJECT_NOT_FOUND', 404);
  const resolvedReferenceFileId = await resolveReferenceFileId(
    projectId,
    input
  );
  const reference = await validateReference(
    userId,
    projectId,
    resolvedReferenceFileId
  );
  const explicitDirectionReferences = new Map<string, string>();
  for (const [direction, fileId] of Object.entries(
    input.directionReferences || {}
  )) {
    const file = await validateReference(userId, projectId, fileId);
    if (!file || file.itemId !== input.itemId) {
      throw new SpriteGenerationError('REFERENCE_NOT_FOUND', 404);
    }
    explicitDirectionReferences.set(direction, file.id);
  }
  if (
    ['character_variant', 'character_directions', 'animation'].includes(
      input.type
    ) &&
    !reference
  ) {
    throw new SpriteGenerationError('REFERENCE_REQUIRED');
  }
  input.referenceFileId = resolvedReferenceFileId;

  // Only scan user-authored text. Expanded / templated prompts are not scanned again.
  try {
    await assertPromptAllowedForGeneration(input.prompt);
    for (const item of (input.items || []).filter(
      (entry) => entry.selected !== false
    )) {
      const text = [item.name, item.description].filter(Boolean).join('\n');
      await assertPromptAllowedForGeneration(text);
    }
  } catch (error) {
    if (error instanceof ContentSafetyError) {
      throw new SpriteGenerationError(error.code, error.status);
    }
    throw error;
  }

  if (input.type === 'icon_batch') {
    input.items = await expandIconItemDescriptions(input, project);
  }
  const route = getModelRoute(modelKind(input.type));
  const selectedItems = (input.items || []).filter(
    (entry) => entry.selected !== false
  );
  const taskCount =
    input.type === 'icon_batch'
      ? 1
      : input.type === 'character_directions'
        ? resolveCharacterDirectionPlan(input).sources.length
        : input.type === 'animation'
          ? input.directionMode === '8'
            ? 8
            : input.directionMode === '4'
              ? 4
              : 1
          : 1;
  if (
    (input.type === 'icon_batch' && selectedItems.length < 1) ||
    selectedItems.length > 9 ||
    taskCount < 1 ||
    taskCount > 20
  )
    throw new SpriteGenerationError('INVALID_TASK_COUNT');
  const creditsCost = getGenerationCredits(modelKind(input.type), {
    taskCount,
  });
  if ((await getRemainingCredits(userId)) < creditsCost) {
    throw new SpriteGenerationError('INSUFFICIENT_CREDITS', 402);
  }

  const now = new Date().toISOString();
  const [created] = await db()
    .insert(generation)
    .values({
      id: input.id,
      userId,
      projectId,
      itemId: null,
      variantId: null,
      taskType: input.type,
      prompt: input.prompt || null,
      negativePrompt: input.negativePrompt || project.negativePrompt,
      paramsJson: '{}',
      status: 'pending',
      creditsCost,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: generation.id })
    .returning();
  if (!created) {
    const raced = await findOwnedGeneration(userId, input.id);
    if (!raced) throw new SpriteGenerationError('GENERATION_ID_CONFLICT', 409);
    return getSpriteGeneration(userId, raced.id, false);
  }

  let domain;
  try {
    domain = await planGenerationRecords(projectId, input);
  } catch (error) {
    await db()
      .update(generation)
      .set({
        status: 'failed',
        failureCode:
          error instanceof SpriteGenerationError
            ? error.code
            : 'DOMAIN_SETUP_FAILED',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(generation.id, created.id));
    if (compactFailure(error).startsWith('Insufficient credits')) {
      throw new SpriteGenerationError('INSUFFICIENT_CREDITS', 402);
    }
    throw error;
  }
  const { itemId, variantId, taskMetadata } = domain;
  const paramsSnapshot = {
    ...input,
    ...(input.type === 'animation'
      ? { videoDuration: resolveAnimationVideoDuration(input.action) }
      : {}),
    referenceFileId: resolvedReferenceFileId,
    plannedItemId: domain.plannedItemId,
    plannedVariantId: domain.plannedVariantId,
    plannedSetId: domain.plannedSetId,
    project: {
      gameGenre: project.gameGenre,
      artStyle: project.artStyle,
      paletteJson: project.paletteJson,
      negativePrompt: project.negativePrompt,
    },
    model: route,
  };
  await db()
    .update(generation)
    .set({
      itemId,
      variantId,
      paramsJson: JSON.stringify(paramsSnapshot),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(generation.id, created.id));

  const blueprints = taskBlueprints(input, project, taskMetadata);
  const taskReferences = new Map<string, string>();
  if (input.type === 'animation' && itemId) {
    const candidates = await db()
      .select()
      .from(assetFile)
      .where(
        and(
          eq(assetFile.projectId, projectId),
          eq(assetFile.itemId, itemId),
          eq(assetFile.status, 'ready'),
          isNull(assetFile.deletedAt)
        )
      )
      .orderBy(desc(assetFile.createdAt));
    const activeBase = candidates.find(
      (file: typeof assetFile.$inferSelect) => file.isActiveReference
    );
    for (const blueprint of blueprints) {
      const direction = String(blueprint.metadata.direction || 'none');
      const directional = candidates.find(
        (file: typeof assetFile.$inferSelect) =>
          file.role === 'direction_reference' &&
          parseJson<Record<string, string>>(file.metadataJson, {}).direction ===
            direction
      );
      const taskReferenceId =
        explicitDirectionReferences.get(direction) ||
        directional?.id ||
        reference?.id ||
        activeBase?.id;
      if (taskReferenceId) {
        taskReferences.set(blueprint.role, taskReferenceId);
      }
    }
  }

  const aspectRatio = resolveTaskAspectRatio(input);
  const taskCreditCosts = blueprints.map(() => route.credits);
  const dispatched: Array<{
    task: typeof aiTask.$inferSelect;
    generationTaskId: string;
  }> = [];
  try {
    for (const [sortOrder, blueprint] of blueprints.entries()) {
      dispatched.push(
        await createPlannedTask({
          generationId: created.id,
          userId,
          route,
          blueprint,
          sortOrder,
          referenceFileId: taskReferences.get(blueprint.role) || reference?.id,
          aspectRatio,
          videoDuration:
            input.type === 'animation'
              ? resolveAnimationVideoDuration(input.action)
              : undefined,
          costCredits: taskCreditCosts[sortOrder],
        })
      );
    }
  } catch (error) {
    for (const planned of dispatched) {
      await updateAITaskById(planned.task.id, {
        status: AITaskStatus.FAILED,
        creditId: planned.task.creditId,
      });
    }
    await db()
      .update(generation)
      .set({
        status: 'failed',
        failureCode: 'CREDIT_RESERVATION_FAILED',
        failureReason: compactFailure(error),
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(generation.id, created.id));
    throw error;
  }
  const inputRows = blueprints.flatMap((blueprint, index) => {
    const fileId =
      taskReferences.get(blueprint.role) ||
      (reference ? reference.id : undefined);
    if (!fileId) return [];
    return [
      {
        id: getUuid(),
        generationId: created.id,
        generationTaskId: dispatched[index].generationTaskId,
        fileId,
        role:
          input.type === 'animation'
            ? `direction_reference:${String(
                blueprint.metadata.direction || 'none'
              )}`
            : 'reference',
        paramsJson: '{}',
        createdAt: now,
      },
    ];
  });
  if (inputRows.length) await db().insert(generationInput).values(inputRows);
  await db()
    .update(generation)
    .set({ status: 'processing', updatedAt: new Date().toISOString() })
    .where(eq(generation.id, created.id));
  try {
    await startGenerationWorkflow(
      created.id,
      created.id,
      localWorkflowHandlers(created.id)
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'sprite_workflow_start_failed',
        generationId: created.id,
        reason: compactFailure(error),
      })
    );
    await failSpriteGenerationWorkflow(
      created.id,
      'WORKFLOW_START_FAILED',
      compactFailure(error)
    );
    throw new SpriteGenerationError('WORKFLOW_START_FAILED', 503);
  }
  return getSpriteGeneration(userId, created.id, false);
}

async function findOwnedGeneration(userId: string, generationId: string) {
  const [result] = await db()
    .select()
    .from(generation)
    .where(and(eq(generation.id, generationId), eq(generation.userId, userId)))
    .limit(1);
  return result;
}

function imageUrlFromTask(task: typeof aiTask.$inferSelect) {
  const info = parseJson<any>(task.taskInfo, {});
  return info.images?.find((image: any) => image?.imageUrl)?.imageUrl as
    string | undefined;
}

function videoUrlFromTask(task: typeof aiTask.$inferSelect) {
  const info = parseJson<any>(task.taskInfo, {});
  return info.videos?.find((video: any) => video?.videoUrl)?.videoUrl as
    string | undefined;
}

async function pollProviderTask(
  task: typeof aiTask.$inferSelect
): Promise<typeof aiTask.$inferSelect> {
  if (
    ![AITaskStatus.PENDING, AITaskStatus.PROCESSING].includes(
      task.status as AITaskStatus
    )
  ) {
    return task;
  }
  if (!task.taskId) return task;
  const aiService = await getAIService();
  const provider = aiService.getProvider(task.provider);
  if (!provider?.query) return task;
  let result;
  try {
    result = await provider.query({
      taskId: task.taskId,
      mediaType: task.mediaType,
      model: task.model,
      options: parseJson<Record<string, unknown>>(task.options, {}),
    });
  } catch (error) {
    const reason = compactFailure(error);
    logSpriteFailure('sprite_provider_query_failed', {
      aiTaskId: task.id,
      provider: task.provider,
      model: task.model,
      mediaType: task.mediaType,
      taskId: task.taskId,
      reason,
    });
    throw error;
  }
  if (result.taskStatus === AITaskStatus.FAILED) {
    logSpriteFailure('sprite_provider_query_failed', {
      aiTaskId: task.id,
      provider: task.provider,
      model: task.model,
      mediaType: task.mediaType,
      taskId: result.taskId || task.taskId,
      reason: taskInfoError(result.taskInfo) || 'PROVIDER_QUERY_FAILED',
    });
  }
  return (
    (await updateAITaskById(task.id, {
      status: result.taskStatus,
      taskInfo: result.taskInfo
        ? JSON.stringify(result.taskInfo)
        : task.taskInfo,
      taskResult: result.taskResult
        ? JSON.stringify(result.taskResult)
        : task.taskResult,
      creditId: task.creditId,
    })) || task
  );
}

async function ensureAnimationVersion(
  logical: typeof generation.$inferSelect,
  link: typeof generationTask.$inferSelect,
  saved: typeof assetFile.$inferSelect
) {
  const metadata = parseJson<Record<string, any>>(link.metadataJson, {});
  if (logical.taskType !== 'animation' || !metadata.clipId) return;
  const [alreadyCreated] = await db()
    .select({ id: animationVersion.id })
    .from(animationVersion)
    .where(
      and(
        eq(animationVersion.clipId, metadata.clipId),
        eq(animationVersion.generationId, logical.id)
      )
    )
    .limit(1);
  if (alreadyCreated) return;

  const params = parseJson<any>(logical.paramsJson, {});
  const sheet = resolveAnimationSheetSize(
    Number(metadata.frames) || params.frames || 'auto',
    params.frameSize,
    params.action
  );
  const { frameCount, columns, rows, frameSize } = sheet;
  const frameWidth =
    saved.width && columns
      ? Math.floor(Number(saved.width) / columns)
      : Number(params.width) || frameSize;
  const frameHeight =
    saved.height && rows
      ? Math.floor(Number(saved.height) / rows)
      : Number(params.height) || frameSize;
  const [current] = await db()
    .select({ maxVersion: max(animationVersion.versionNo) })
    .from(animationVersion)
    .where(eq(animationVersion.clipId, metadata.clipId));
  const versionId = getUuid();
  const now = new Date().toISOString();
  await db()
    .update(animationVersion)
    .set({ isCurrent: false })
    .where(eq(animationVersion.clipId, metadata.clipId));
  await db()
    .insert(animationVersion)
    .values({
      id: versionId,
      clipId: metadata.clipId,
      versionNo: Number(current?.maxVersion || 0) + 1,
      generationId: logical.id,
      isCurrent: true,
      fps: Number(params.fps) || 12,
      frameWidth,
      frameHeight,
      frameCount,
      editorJson: JSON.stringify({ columns, rows }),
      createdAt: now,
    });
  await db()
    .insert(animationFrame)
    .values(
      Array.from({ length: frameCount }, (_, frameIndex) => ({
        id: getUuid(),
        versionId,
        fileId: saved.id,
        frameIndex,
        offsetX: 0,
        offsetY: 0,
        metadataJson: JSON.stringify({
          crop: {
            x: (frameIndex % columns) * frameWidth,
            y: Math.floor(frameIndex / columns) * frameHeight,
            width: frameWidth,
            height: frameHeight,
          },
        }),
        createdAt: now,
      }))
    );
  await db()
    .update(animationClip)
    .set({ status: 'ready', updatedAt: now })
    .where(eq(animationClip.id, metadata.clipId));
}

async function insertItemIfNeeded(values: typeof assetItem.$inferInsert) {
  await db()
    .insert(assetItem)
    .values(values)
    .onConflictDoNothing({ target: assetItem.id });
}

async function insertVariantIfNeeded(values: typeof assetVariant.$inferInsert) {
  await db()
    .insert(assetVariant)
    .values(values)
    .onConflictDoNothing({ target: assetVariant.id });
}

async function commitGenerationTarget(
  logical: typeof generation.$inferSelect,
  itemId: string | null,
  variantId: string | null,
  now: string
) {
  logical.itemId = itemId;
  logical.variantId = variantId;
  await db()
    .update(generation)
    .set({
      itemId,
      variantId,
      updatedAt: now,
    })
    .where(eq(generation.id, logical.id));
}

async function attachFileToVault(
  saved: typeof assetFile.$inferSelect,
  itemId: string | null,
  variantId: string | null,
  now: string
) {
  if (saved.itemId === itemId && saved.variantId === variantId) return saved;
  const [updated] = await db()
    .update(assetFile)
    .set({
      itemId,
      variantId,
      updatedAt: now,
    })
    .where(eq(assetFile.id, saved.id))
    .returning();
  return updated || { ...saved, itemId, variantId, updatedAt: now };
}

async function ensureVaultTarget(
  logical: typeof generation.$inferSelect,
  link: typeof generationTask.$inferSelect,
  saved: typeof assetFile.$inferSelect
) {
  const now = new Date().toISOString();
  const params = parseJson<any>(logical.paramsJson, {});
  const metadata = parseJson<Record<string, any>>(link.metadataJson, {});
  const projectId = logical.projectId;

  if (logical.taskType === 'character') {
    const itemId = String(
      metadata.itemId || params.plannedItemId || logical.itemId || ''
    );
    const variantId = String(
      metadata.variantId || params.plannedVariantId || logical.variantId || ''
    );
    if (!itemId || !variantId) return saved;
    await insertItemIfNeeded({
      id: itemId,
      projectId,
      type: 'character',
      name: assetDisplayName(params, 'Character'),
      description: params.prompt || null,
      settingsJson: '{}',
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    });
    await insertVariantIfNeeded({
      id: variantId,
      projectId,
      itemId,
      name: 'Original',
      variantType: 'base',
      prompt: params.prompt || null,
      status: 'active',
      metadataJson: '{}',
      createdAt: now,
      updatedAt: now,
    });
    await commitGenerationTarget(logical, itemId, variantId, now);
    return attachFileToVault(saved, itemId, variantId, now);
  }

  if (logical.taskType === 'character_variant') {
    const itemId = String(logical.itemId || metadata.itemId || '');
    const variantId = String(
      metadata.variantId || params.plannedVariantId || ''
    );
    if (!itemId || !variantId) return saved;
    const editType = params.editType === 'costume' ? 'costume' : 'pose';
    await insertVariantIfNeeded({
      id: variantId,
      projectId,
      itemId,
      name:
        params.name?.trim() || (editType === 'costume' ? 'Costume' : 'Pose'),
      variantType: editType,
      prompt: params.prompt || null,
      status: 'active',
      metadataJson: JSON.stringify({
        editType,
        perspective: params.perspective || generationDefaults.perspective,
      }),
      createdAt: now,
      updatedAt: now,
    });
    await commitGenerationTarget(logical, itemId, variantId, now);
    return attachFileToVault(saved, itemId, variantId, now);
  }

  if (logical.taskType === 'character_directions') {
    return attachFileToVault(saved, logical.itemId, logical.variantId, now);
  }

  if (logical.taskType === 'icon_batch') {
    const setId = String(
      metadata.setId || params.plannedItemId || logical.itemId || ''
    );
    if (!setId) return saved;
    const sheetItems = Array.isArray(metadata.items) ? metadata.items : [];
    await insertItemIfNeeded({
      id: setId,
      projectId,
      type: 'icon',
      name: params.name?.trim() || 'Icon Set',
      description: sheetItems
        .map((item: any) => String(item.name || '').trim())
        .filter(Boolean)
        .join(', '),
      settingsJson: JSON.stringify({
        layout: { columns: 3, rows: 3 },
        items: sheetItems,
      }),
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    await commitGenerationTarget(logical, setId, null, now);
    return attachFileToVault(saved, setId, null, now);
  }

  if (logical.taskType === 'animation') {
    let itemId = logical.itemId;
    let variantId = logical.variantId;
    if (!itemId) {
      itemId = String(metadata.itemId || params.plannedItemId || '');
      variantId = String(
        metadata.variantId || params.plannedVariantId || variantId || ''
      );
      if (!itemId || !variantId) return saved;
      await insertItemIfNeeded({
        id: itemId,
        projectId,
        type: 'character',
        name: assetDisplayName(params, 'Imported Character'),
        description: params.prompt || null,
        settingsJson: '{}',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });
      await insertVariantIfNeeded({
        id: variantId,
        projectId,
        itemId,
        name: 'Original',
        variantType: 'base',
        status: 'active',
        metadataJson: '{}',
        createdAt: now,
        updatedAt: now,
      });
      const referenceFileId = String(params.referenceFileId || '');
      if (referenceFileId) {
        await db()
          .update(assetFile)
          .set({
            itemId,
            variantId,
            role: 'base_reference',
            isActiveReference: true,
            updatedAt: now,
          })
          .where(
            and(
              eq(assetFile.id, referenceFileId),
              eq(assetFile.projectId, projectId),
              isNull(assetFile.itemId)
            )
          );
      }
      await commitGenerationTarget(logical, itemId, variantId, now);
    }

    const setId = String(metadata.setId || params.plannedSetId || '');
    const clipId = String(metadata.clipId || '');
    if (!itemId || !setId || !clipId) {
      return attachFileToVault(saved, itemId, variantId, now);
    }
    const mode = params.directionMode || 'single';
    await db()
      .insert(animationSet)
      .values({
        id: setId,
        projectId,
        itemId,
        variantId,
        name: `${params.action || 'idle'} animation`,
        action: params.action || 'idle',
        perspective: params.perspective || '',
        directionMode: mode,
        loop:
          params.loop ??
          ['idle', 'walk', 'run'].includes(params.action || 'idle'),
        status: 'processing',
        metadataJson: '{}',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: animationSet.id });
    await db()
      .insert(animationClip)
      .values({
        id: clipId,
        animationSetId: setId,
        direction: String(metadata.direction || 'none'),
        sortOrder: link.sortOrder,
        status: 'processing',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: animationClip.id });
    return attachFileToVault(saved, itemId, variantId, now);
  }

  return saved;
}

async function saveProviderOutput(
  logical: typeof generation.$inferSelect,
  link: typeof generationTask.$inferSelect,
  task: typeof aiTask.$inferSelect
) {
  const [existing] = await db()
    .select()
    .from(assetFile)
    .where(
      and(
        eq(assetFile.generationTaskId, link.id),
        isNull(assetFile.parentFileId),
        isNull(assetFile.deletedAt)
      )
    )
    .limit(1);
  if (existing) {
    const attached = await ensureVaultTarget(logical, link, existing);
    await ensureAnimationVersion(logical, link, attached);
    await ensureMirroredDirectionFile(logical, attached, link);
    return attached;
  }
  const outputUrl = imageUrlFromTask(task);
  if (!outputUrl) throw new Error('OUTPUT_MISSING');
  const response = await fetch(outputUrl);
  if (!response.ok) throw new Error('OUTPUT_FETCH_FAILED');
  const buffer = await response.arrayBuffer();
  const info = imageInfo(buffer);
  const extension = extensionFromMime(info.mime);
  const fileId = getUuid();
  const key = projectAssetStorageKey(
    logical.projectId,
    generationAssetType(logical.taskType),
    fileId,
    extension
  );
  const storage = await getStorageService();
  const uploaded = await storage.uploadFile({
    body: new Uint8Array(buffer),
    key,
    contentType: info.mime,
    disposition: 'inline',
  });
  if (!uploaded.success) throw new Error('OUTPUT_STORAGE_FAILED');
  const metadata = parseJson<Record<string, any>>(link.metadataJson, {});
  const role =
    logical.taskType === 'animation'
      ? 'spritesheet'
      : logical.taskType === 'icon_batch'
        ? 'icon'
        : logical.taskType === 'character_directions'
          ? 'direction_reference'
          : 'base_reference';
  const now = new Date().toISOString();
  const [saved] = await db()
    .insert(assetFile)
    .values({
      id: fileId,
      projectId: logical.projectId,
      itemId: logical.taskType === 'icon_batch' ? null : logical.itemId,
      variantId: logical.variantId,
      generationId: logical.id,
      generationTaskId: link.id,
      mediaType: 'image',
      role,
      storageKey: key,
      originalFilename: `${role}-${link.sortOrder + 1}.${extension}`,
      mimeType: info.mime,
      width: info.width,
      height: info.height,
      sizeBytes: buffer.byteLength,
      isActiveReference:
        role === 'base_reference' && logical.taskType === 'character',
      status: 'ready',
      metadataJson: JSON.stringify(metadata),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const attached = await ensureVaultTarget(logical, link, saved);
  await ensureAnimationVersion(logical, link, attached);
  await ensureMirroredDirectionFile(logical, attached, link);
  return attached;
}

async function ensureMirroredDirectionFile(
  logical: typeof generation.$inferSelect,
  source: typeof assetFile.$inferSelect,
  link: typeof generationTask.$inferSelect
) {
  if (logical.taskType !== 'character_directions') return;
  const metadata = parseJson<Record<string, any>>(link.metadataJson, {});
  const sourceDirection = String(metadata.direction || '');
  const mirrorDirection =
    String(metadata.mirrorDirection || '') ||
    directionMirrorOf(sourceDirection);
  if (!mirrorDirection || mirrorDirection === sourceDirection) return;

  const [existingMirror] = await db()
    .select({ id: assetFile.id })
    .from(assetFile)
    .where(
      and(
        eq(assetFile.parentFileId, source.id),
        eq(assetFile.role, 'direction_reference'),
        isNull(assetFile.deletedAt)
      )
    )
    .limit(1);
  if (existingMirror) return;

  const now = new Date().toISOString();
  await db()
    .insert(assetFile)
    .values({
      id: getUuid(),
      projectId: logical.projectId,
      itemId: source.itemId,
      variantId: logical.variantId,
      generationId: logical.id,
      generationTaskId: link.id,
      parentFileId: source.id,
      mediaType: 'image',
      role: 'direction_reference',
      storageKey: source.storageKey,
      originalFilename: source.originalFilename,
      mimeType: source.mimeType,
      width: source.width,
      height: source.height,
      sizeBytes: source.sizeBytes,
      isActiveReference: false,
      status: 'ready',
      metadataJson: JSON.stringify({
        direction: mirrorDirection,
        mirrored: true,
        sourceDirection,
        referenceFileId:
          parseJson<Record<string, unknown>>(source.metadataJson, {})
            .referenceFileId || null,
      }),
      createdAt: now,
      updatedAt: now,
    });
}

async function findGenerationTaskFile(generationTaskId: string) {
  const [file] = await db()
    .select()
    .from(assetFile)
    .where(
      and(
        eq(assetFile.generationTaskId, generationTaskId),
        isNull(assetFile.parentFileId),
        isNull(assetFile.deletedAt)
      )
    )
    .limit(1);
  return file;
}

async function saveProcessedAnimationOutput(
  logical: typeof generation.$inferSelect,
  link: typeof generationTask.$inferSelect,
  task: typeof aiTask.$inferSelect
) {
  const existing = await findGenerationTaskFile(link.id);
  if (existing) return existing;
  const sourceVideoUrl = videoUrlFromTask(task);
  if (!sourceVideoUrl) throw new Error('VIDEO_OUTPUT_MISSING');
  const params = parseJson<any>(logical.paramsJson, {});
  const linkMetadata = parseJson<Record<string, any>>(link.metadataJson, {});
  const sheet = resolveAnimationSheetSize(
    Number(linkMetadata.frames) || params.frames || 'auto',
    params.frameSize,
    params.action
  );
  const processed = await processSpriteVideo({
    generationId: logical.id,
    generationTaskId: link.id,
    sourceVideoUrl,
    outputPrefix: `projects/${logical.projectId}/animation`,
    frameCount: sheet.frameCount,
    frameSize: sheet.frameSize,
    fps: Number(params.fps) || 12,
    loop:
      params.loop ??
      ['idle', 'walk', 'run'].includes(String(params.action || 'idle')),
    action: String(params.action || 'idle'),
    direction: String(linkMetadata.direction || 'none'),
  });
  const metadata = {
    ...linkMetadata,
    frameCount: processed.frame_count,
    frames: processed.frame_count,
    columns: processed.columns,
    rows: processed.rows,
    frameSize: processed.frame_size,
    fps: processed.fps,
    manifestKey: processed.manifest.key,
  };
  await db()
    .update(generationTask)
    .set({ metadataJson: JSON.stringify(metadata) })
    .where(eq(generationTask.id, link.id));
  link.metadataJson = JSON.stringify(metadata);
  const now = new Date().toISOString();
  const [saved] = await db()
    .insert(assetFile)
    .values({
      id: getUuid(),
      projectId: logical.projectId,
      itemId: logical.itemId,
      variantId: logical.variantId,
      generationId: logical.id,
      generationTaskId: link.id,
      mediaType: 'image',
      role: 'spritesheet',
      storageKey: processed.spritesheet.key,
      originalFilename: `spritesheet-${link.sortOrder + 1}.png`,
      mimeType: processed.spritesheet.content_type || 'image/png',
      width: processed.spritesheet.width,
      height: processed.spritesheet.height,
      sizeBytes: processed.spritesheet.file_size_bytes,
      isActiveReference: false,
      status: 'ready',
      metadataJson: JSON.stringify(metadata),
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  const attached = await ensureVaultTarget(logical, link, saved);
  await ensureAnimationVersion(logical, link, attached);
  return attached;
}

export async function getSpriteGeneration(
  userId: string,
  generationId: string,
  refresh = false
) {
  const logical = await findOwnedGeneration(userId, generationId);
  if (!logical) throw new SpriteGenerationError('GENERATION_NOT_FOUND', 404);
  const links = await db()
    .select()
    .from(generationTask)
    .where(eq(generationTask.generationId, generationId))
    .orderBy(asc(generationTask.sortOrder), desc(generationTask.createdAt));
  const taskRows = links.length
    ? await db()
        .select()
        .from(aiTask)
        .where(
          inArray(
            aiTask.id,
            links.map((link: any) => link.aiTaskId)
          )
        )
    : [];
  const tasksById = new Map(taskRows.map((task: any) => [task.id, task]));
  const latestByRole = new Map<string, typeof generationTask.$inferSelect>();
  links.forEach((link: any) => {
    if (!latestByRole.has(link.role)) latestByRole.set(link.role, link);
  });

  const items: Array<{
    id: string;
    role: string;
    status: string;
    metadata: Record<string, unknown>;
    file: (typeof assetFile.$inferSelect & { url: string }) | null;
    previewUrl: string | null;
    editorVersionId: string | null;
    phase:
      | 'queued'
      | 'video_generation'
      | 'media_processing'
      | 'completed'
      | 'failed';
  }> = [];
  const urlFor = await getAssetPublicUrlResolver();
  for (const link of latestByRole.values()) {
    let task = tasksById.get(link.aiTaskId) as
      typeof aiTask.$inferSelect | undefined;
    if (!task) continue;
    if (refresh && task.taskId) task = await pollProviderTask(task);
    let status = task.status;
    let file = await findGenerationTaskFile(link.id);
    const previewUrl =
      logical.taskType === 'character' && task.status === AITaskStatus.SUCCESS
        ? imageUrlFromTask(task) || null
        : null;
    if (task.status === AITaskStatus.SUCCESS) {
      if (file || (logical.taskType === 'character' && previewUrl)) {
        status = 'success';
      } else if (refresh) {
        try {
          file =
            logical.taskType === 'animation'
              ? await saveProcessedAnimationOutput(logical, link, task)
              : await saveProviderOutput(logical, link, task);
          status = 'success';
        } catch {
          status = 'postprocessing_failed';
        }
      } else {
        status = 'processing';
      }
    }
    const metadata = parseJson<Record<string, unknown>>(link.metadataJson, {});
    let editorVersionId: string | null = null;
    if (logical.taskType === 'animation' && metadata.clipId) {
      const [currentVersion] = await db()
        .select({ id: animationVersion.id })
        .from(animationVersion)
        .where(
          and(
            eq(animationVersion.clipId, String(metadata.clipId)),
            eq(animationVersion.isCurrent, true)
          )
        )
        .limit(1);
      editorVersionId = currentVersion?.id || null;
    }
    items.push({
      id: link.id,
      role: link.role,
      status,
      metadata,
      file: file ? { ...file, url: urlFor(file.storageKey) } : null,
      previewUrl,
      editorVersionId,
      phase: ['failed', 'canceled', 'postprocessing_failed'].includes(status)
        ? 'failed'
        : file
          ? 'completed'
          : task.status === AITaskStatus.SUCCESS
            ? 'media_processing'
            : task.taskId
              ? 'video_generation'
              : 'queued',
    });
  }

  const status = aggregateGenerationStatus(items.map((item) => item.status));
  const now = new Date().toISOString();
  if (logical.status !== status) {
    await db()
      .update(generation)
      .set({
        status,
        updatedAt: now,
        completedAt: ['success', 'partial', 'failed'].includes(status)
          ? now
          : null,
      })
      .where(eq(generation.id, logical.id));
  }
  if (
    logical.taskType === 'animation' &&
    ['success', 'partial', 'failed'].includes(status)
  ) {
    const setIds = items
      .map((item) => (item.metadata as any).setId)
      .filter(Boolean);
    if (setIds.length) {
      await db()
        .update(animationSet)
        .set({
          status: status === 'failed' ? 'failed' : 'ready',
          updatedAt: now,
        })
        .where(inArray(animationSet.id, [...new Set(setIds)]));
    }
  }
  return {
    ...logical,
    status,
    params: parseJson(logical.paramsJson, {}),
    items,
  };
}

function taskFailureReason(task: typeof aiTask.$inferSelect) {
  const info = parseJson<Record<string, unknown>>(task.taskInfo, {});
  return compactFailure(
    info.errorMessage || info.errorCode || `TASK_${task.status.toUpperCase()}`
  );
}

export async function advanceSpriteGenerationWorkflow(generationId: string) {
  const [logical] = await db()
    .select()
    .from(generation)
    .where(eq(generation.id, generationId))
    .limit(1);
  if (!logical) throw new SpriteGenerationError('GENERATION_NOT_FOUND', 404);

  const links = await db()
    .select()
    .from(generationTask)
    .where(eq(generationTask.generationId, generationId))
    .orderBy(asc(generationTask.sortOrder));
  let latestFailure = '';

  for (const link of links) {
    let task = await findAITaskById(link.aiTaskId);
    let outputReady = false;
    if (!task) continue;
    if (
      [AITaskStatus.FAILED, AITaskStatus.CANCELED].includes(
        task.status as AITaskStatus
      )
    ) {
      latestFailure ||= taskFailureReason(task);
      continue;
    }
    try {
      if (!task.taskId) {
        task = await dispatchPlannedTask(task);
      } else if (
        [AITaskStatus.PENDING, AITaskStatus.PROCESSING].includes(
          task.status as AITaskStatus
        )
      ) {
        task = await pollProviderTask(task);
      }
      if (task.status === AITaskStatus.FAILED) {
        latestFailure ||= taskFailureReason(task);
        continue;
      }
      if (task.status !== AITaskStatus.SUCCESS) continue;

      if (logical.taskType === 'character') {
        if (!imageUrlFromTask(task)) throw new Error('OUTPUT_MISSING');
        outputReady = true;
        await settleAITaskCredit(task.id);
        continue;
      }

      let file = await findGenerationTaskFile(link.id);
      if (!file) {
        file =
          logical.taskType === 'animation'
            ? await saveProcessedAnimationOutput(logical, link, task)
            : await saveProviderOutput(logical, link, task);
      }
      outputReady = Boolean(file);
      if (file) await settleAITaskCredit(task.id);
    } catch (error) {
      const reason = compactFailure(error);
      if (outputReady) {
        console.error(
          JSON.stringify({
            event: 'sprite_credit_settlement_failed',
            generationId,
            generationTaskId: link.id,
            aiTaskId: task.id,
            reason,
          })
        );
        throw error;
      }
      const retryable =
        (Boolean(task.taskId) &&
          [AITaskStatus.PENDING, AITaskStatus.PROCESSING].includes(
            task.status as AITaskStatus
          )) ||
        /MEDIA_PROCESSOR_(BUSY|HTTP_429|HTTP_5\d\d)|fetch failed/i.test(reason);
      if (retryable) {
        console.warn(
          JSON.stringify({
            event: 'sprite_generation_task_retryable_error',
            generationId,
            generationTaskId: link.id,
            aiTaskId: task.id,
            reason,
          })
        );
        throw error;
      }
      latestFailure ||= reason;
      logSpriteFailure('sprite_generation_task_failed', {
        generationId,
        generationTaskId: link.id,
        aiTaskId: task.id,
        provider: task.provider,
        model: task.model,
        mediaType: task.mediaType,
        stage:
          task.status === AITaskStatus.SUCCESS
            ? 'media_postprocessing'
            : task.taskId
              ? 'provider_poll'
              : 'provider_dispatch',
        reason,
      });
      await updateAITaskById(task.id, {
        status: AITaskStatus.FAILED,
        taskInfo: JSON.stringify({
          ...parseJson<Record<string, unknown>>(task.taskInfo, {}),
          errorCode:
            task.status === AITaskStatus.SUCCESS
              ? 'MEDIA_POSTPROCESSING_FAILED'
              : 'PROVIDER_REQUEST_FAILED',
          errorMessage: reason,
        }),
        creditId: task.creditId,
      });
    }
  }

  const current = await getSpriteGeneration(logical.userId, logical.id, false);
  const terminal = ['success', 'partial', 'failed'].includes(current.status);
  const failureReason = latestFailure || current.failureReason || '';
  if (latestFailure && latestFailure !== logical.failureReason) {
    logSpriteFailure('sprite_generation_failed', {
      generationId,
      status: current.status,
      mediaType: logical.taskType === 'animation' ? 'video' : 'image',
      reason: latestFailure,
    });
    await db()
      .update(generation)
      .set({
        failureCode: 'GENERATION_TASK_FAILED',
        failureReason: latestFailure,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(generation.id, generationId));
  }
  const completed = current.items.filter(
    (item: { status: string }) => item.status === 'success'
  ).length;
  return {
    generationId,
    status: current.status,
    terminal,
    completed,
    total: current.items.length,
    retryAfterSeconds: terminal ? 0 : 5,
    failureReason: failureReason || undefined,
  };
}

export async function saveGeneratedCharacter(
  userId: string,
  projectId: string,
  generationId: string,
  name: string
) {
  const logical = await findOwnedGeneration(userId, generationId);
  if (!logical || logical.projectId !== projectId) {
    throw new SpriteGenerationError('GENERATION_NOT_FOUND', 404);
  }
  if (logical.taskType !== 'character') {
    throw new SpriteGenerationError('INVALID_GENERATION', 400);
  }

  const [link] = await db()
    .select()
    .from(generationTask)
    .where(eq(generationTask.generationId, generationId))
    .orderBy(desc(generationTask.createdAt))
    .limit(1);
  const task = link ? await findAITaskById(link.aiTaskId) : null;
  if (!link || !task || task.status !== AITaskStatus.SUCCESS) {
    throw new SpriteGenerationError('GENERATION_NOT_READY', 409);
  }
  if (!imageUrlFromTask(task)) {
    throw new SpriteGenerationError('OUTPUT_MISSING', 502);
  }

  await saveProviderOutput(logical, link, task);
  if (!logical.itemId) {
    throw new SpriteGenerationError('ASSET_SAVE_FAILED', 500);
  }
  await updateCharacterItem(projectId, logical.itemId, { name: name.trim() });
  await settleAITaskCredit(task.id);
  return getSpriteGeneration(userId, generationId, false);
}

export async function failSpriteGenerationWorkflow(
  generationId: string,
  failureCode: string,
  failureReason: string
) {
  const [logical] = await db()
    .select()
    .from(generation)
    .where(eq(generation.id, generationId))
    .limit(1);
  const links = await db()
    .select()
    .from(generationTask)
    .where(eq(generationTask.generationId, generationId));
  for (const link of links) {
    const task = await findAITaskById(link.aiTaskId);
    if (!task || (await findGenerationTaskFile(link.id))) continue;
    if (
      logical?.taskType === 'character' &&
      task.status === AITaskStatus.SUCCESS &&
      imageUrlFromTask(task)
    ) {
      continue;
    }
    if (
      ![AITaskStatus.FAILED, AITaskStatus.CANCELED].includes(
        task.status as AITaskStatus
      )
    ) {
      await updateAITaskById(task.id, {
        status: AITaskStatus.FAILED,
        taskInfo: JSON.stringify({
          ...parseJson<Record<string, unknown>>(task.taskInfo, {}),
          errorCode: failureCode,
          errorMessage: failureReason,
        }),
        creditId: task.creditId,
      });
    }
  }
  const now = new Date().toISOString();
  const reason = compactFailure(failureReason);
  logSpriteFailure('sprite_generation_failed', {
    generationId,
    failureCode,
    reason,
  });
  await db()
    .update(generation)
    .set({
      status: 'failed',
      failureCode,
      failureReason: reason,
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(generation.id, generationId));
}

export async function retrySpriteGeneration(
  userId: string,
  generationId: string
) {
  const current = await getSpriteGeneration(userId, generationId, false);
  const route = getModelRoute(
    modelKind(current.taskType as SpriteGenerationKind)
  );
  const retryable = current.items.filter(
    (item: {
      id: string;
      role: string;
      status: string;
      metadata: Record<string, unknown>;
    }) => ['failed', 'canceled', 'postprocessing_failed'].includes(item.status)
  );
  if (!retryable.length) return current;
  const retryCost = getGenerationCredits(
    modelKind(current.taskType as SpriteGenerationKind),
    { retry: true }
  );

  for (const item of retryable) {
    const oldLink = await db()
      .select()
      .from(generationTask)
      .where(eq(generationTask.id, item.id))
      .limit(1);
    const oldTask = oldLink[0]
      ? await findAITaskById(oldLink[0].aiTaskId)
      : null;
    if (!oldTask) continue;
    const metadata = item.metadata as Record<string, unknown>;
    const attempt = Number(metadata.attempt || 1) + 1;
    const params = current.params as Record<string, unknown>;
    const taskInfo = parseJson<Record<string, unknown>>(oldTask.taskInfo, {});
    if (
      current.taskType === 'animation' &&
      taskInfo.errorCode === 'MEDIA_POSTPROCESSING_FAILED' &&
      videoUrlFromTask(oldTask)
    ) {
      await createMediaRetryTask({
        generationId,
        userId,
        previousTask: oldTask,
        role: item.role,
        sortOrder: oldLink[0].sortOrder,
        metadata: { ...metadata, attempt, retryStage: 'media' },
        costCredits: retryCost,
      });
      continue;
    }
    await createPlannedTask({
      generationId,
      userId,
      route,
      blueprint: {
        role: item.role,
        prompt: oldTask.prompt,
        metadata: { ...metadata, attempt },
      },
      sortOrder: oldLink[0].sortOrder,
      referenceFileId:
        String(metadata.referenceFileId || params.referenceFileId || '') ||
        undefined,
      aspectRatio: resolveTaskAspectRatio({
        id: generationId,
        type: current.taskType as SpriteGenerationKind,
        quality:
          typeof params.quality === 'string' ? params.quality : undefined,
        frames: params.frames as number | 'auto' | undefined,
        frameSize: params.frameSize as string | number | undefined,
        action: typeof params.action === 'string' ? params.action : undefined,
      }),
      videoDuration:
        typeof params.videoDuration === 'number'
          ? params.videoDuration
          : resolveAnimationVideoDuration(
              typeof params.action === 'string' ? params.action : undefined
            ),
      costCredits: retryCost,
    });
  }
  await db()
    .update(generation)
    .set({
      status: 'processing',
      failureCode: null,
      failureReason: null,
      completedAt: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(generation.id, generationId));
  await startGenerationWorkflow(
    generationId,
    `${generationId}-retry-${getUuid()}`,
    localWorkflowHandlers(generationId)
  );
  return getSpriteGeneration(userId, generationId, false);
}
