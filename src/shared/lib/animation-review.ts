import { z } from 'zod';

export const MAX_ANIMATION_FRAMES = 240;
export function animationFrameLimit(duration: number) {
  return Number.isFinite(duration) && duration > 0
    ? Math.max(
        0,
        Math.min(MAX_ANIMATION_FRAMES, Math.floor(duration * 24 + 0.001))
      )
    : 0;
}

export const animationReviewSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('generate-sheet'),
    taskId: z.string().uuid(),
    requestId: z.string().uuid(),
    replaceVersionId: z.string().uuid().optional(),
    sourceDuration: z.number().positive().max(60),
    frameCount: z.number().int().min(2).max(MAX_ANIMATION_FRAMES),
    frameSize: z.union([
      z.literal(64),
      z.literal(128),
      z.literal(256),
      z.literal(512),
    ]),
    fps: z.number().int().min(1).max(60),
    loop: z.boolean(),
  }),
  z.object({ action: z.literal('save-video'), taskId: z.string().uuid() }),
  z.object({
    action: z.literal('extract'),
    taskId: z.string().uuid(),
    requestId: z.string().uuid(),
    frameCount: z.number().int().min(2).max(32),
    frameSize: z.union([
      z.literal(64),
      z.literal(128),
      z.literal(256),
      z.literal(512),
    ]),
    fps: z.number().int().min(1).max(60),
    loop: z.boolean(),
  }),
  z.object({
    action: z.literal('save-sheet'),
    taskId: z.string().uuid(),
    extractionId: z.string().uuid(),
    selected: z
      .array(z.number().int().min(0).max(31))
      .min(1)
      .max(32)
      .refine((xs) => new Set(xs).size === xs.length),
    fps: z.number().int().min(1).max(60),
  }),
]);
export type AnimationReviewRequest = z.infer<typeof animationReviewSchema>;

export function selectedAnimationFrames(
  indices: number[],
  count: number,
  columns: number,
  size: number,
  id: () => string
) {
  if (
    !indices.length ||
    new Set(indices).size !== indices.length ||
    indices.some((i) => !Number.isInteger(i) || i < 0 || i >= count)
  )
    throw new Error('INVALID_FRAME_SELECTION');
  return indices.map((i) => ({
    id: id(),
    durationMs: null,
    offsetX: 0,
    offsetY: 0,
    crop: {
      x: (i % columns) * size,
      y: Math.floor(i / columns) * size,
      width: size,
      height: size,
    },
  }));
}
