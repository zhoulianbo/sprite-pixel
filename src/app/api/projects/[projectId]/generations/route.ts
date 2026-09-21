import { z } from 'zod';

import { ICON_LIST_MAX } from '@/config/generation';
import { SPRITE_DIRECTION_VALUES } from '@/config/generation/sprite';
import { getUuid } from '@/shared/lib/hash';
import { toPublicSpriteGeneration } from '@/shared/lib/public-generation';
import { getUserInfo } from '@/shared/models/user';
import {
  SpriteGenerationError,
  startSpriteGeneration,
} from '@/shared/services/asset-generation';

const common = {
  id: z.string().uuid(),
  prompt: z.string().trim().max(3000).optional(),
  name: z.string().trim().max(80).optional(),
  referenceFileId: z.string().uuid().optional(),
  style: z.string().trim().max(60).optional(),
  perspective: z.string().trim().max(60).optional(),
  quality: z.enum(['1k', '2k', '4k']).optional(),
  characterType: z
    .enum(['humanoid', 'monster', 'animal', 'robot', 'custom'])
    .optional(),
  frameSize: z
    .union([z.enum(['32', '64', '128', '256']), z.number().int()])
    .optional(),
  width: z.number().int().min(16).max(512).optional(),
  height: z.number().int().min(16).max(512).optional(),
  palette: z.string().trim().max(500).optional(),
  background: z.string().trim().max(80).optional(),
  negativePrompt: z.string().trim().max(1000).optional(),
};

const requestSchema = z.discriminatedUnion('type', [
  z.object({
    ...common,
    type: z.literal('character'),
    prompt: z.string().trim().min(1).max(3000),
  }),
  z.object({
    ...common,
    type: z.literal('character_variant'),
    itemId: z.string().uuid(),
    variantId: z.string().uuid().optional(),
    editType: z.enum(['pose', 'costume']).default('pose'),
  }),
  z.object({
    ...common,
    type: z.literal('character_directions'),
    itemId: z.string().uuid(),
    variantId: z.string().uuid().optional(),
    directionMode: z.enum(['4', '8']).optional(),
    directions: z
      .array(z.enum(SPRITE_DIRECTION_VALUES))
      .min(1)
      .max(8)
      .optional(),
    action: z.string().trim().min(1).max(40).optional(),
  }),
  z.object({
    ...common,
    type: z.literal('animation'),
    itemId: z.string().uuid().optional(),
    variantId: z.string().uuid().optional(),
    action: z.string().trim().min(1).max(40),
    directionMode: z.enum(['single', '4', '8']).default('single'),
    direction: z.string().trim().max(40).optional(),
    directionReferences: z
      .record(z.string().trim().max(40), z.string().uuid())
      .optional(),
    frames: z
      .union([z.literal('auto'), z.number().int().min(2).max(32)])
      .default('auto'),
    fps: z.number().min(1).max(60).default(12),
    loop: z.boolean().optional(),
  }),
  z.object({
    ...common,
    type: z.literal('icon_batch'),
    items: z
      .array(
        z.object({
          id: z.string().uuid(),
          name: z.string().trim().min(1).max(80),
          description: z.string().trim().max(500).optional(),
          selected: z.boolean().optional(),
        })
      )
      .max(ICON_LIST_MAX)
      .optional(),
  }),
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getUserInfo();
  if (!user) {
    return Response.json(
      { code: -1, message: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      {
        code: -1,
        message: 'INVALID_GENERATION',
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }
  const { projectId } = await params;
  const input = parsed.data;
  if (
    input.type === 'character_directions' &&
    !input.directions?.length &&
    !input.directionMode
  ) {
    return Response.json(
      { code: -1, message: 'INVALID_GENERATION' },
      { status: 400 }
    );
  }
  if (input.type === 'animation' && !input.itemId && !input.referenceFileId) {
    return Response.json(
      { code: -1, message: 'REFERENCE_REQUIRED' },
      { status: 400 }
    );
  }
  if (input.type === 'icon_batch') {
    const selected = (input.items || []).filter(
      (item) => item.selected !== false
    );
    if (!selected.length && input.referenceFileId) {
      input.items = [{ id: getUuid(), name: 'Reference icon', selected: true }];
    } else if (!selected.length) {
      return Response.json(
        { code: -1, message: 'ICON_ITEMS_REQUIRED' },
        { status: 400 }
      );
    }
  }
  try {
    const result = await startSpriteGeneration(user.id, projectId, input);
    return Response.json(
      { code: 0, data: toPublicSpriteGeneration(result) },
      { status: 202 }
    );
  } catch (error) {
    const known = error instanceof SpriteGenerationError;
    return Response.json(
      { code: -1, message: known ? error.code : 'GENERATION_FAILED' },
      { status: known ? error.status : 500 }
    );
  }
}
