import { z } from 'zod';

import { saveAnimationVersion } from '@/shared/models/animation';
import { getUserInfo } from '@/shared/models/user';

const versionSchema = z.object({
  parentVersionId: z.string().uuid(),
  fps: z.number().min(1).max(60),
  loop: z.boolean(),
  frames: z
    .array(
      z.object({
        frameId: z.string().uuid(),
        durationMs: z.number().int().min(1).max(60_000).nullable().optional(),
        offsetX: z.number().int().min(-4096).max(4096),
        offsetY: z.number().int().min(-4096).max(4096),
      })
    )
    .min(1)
    .max(256),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clipId: string }> }
) {
  const user = await getUserInfo();
  if (!user)
    return Response.json(
      { code: -1, message: 'UNAUTHORIZED' },
      { status: 401 }
    );
  const parsed = versionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { code: -1, message: 'INVALID_VERSION' },
      { status: 400 }
    );
  }
  const { clipId } = await params;
  const result = await saveAnimationVersion(user.id, clipId, parsed.data);
  if (!result) {
    return Response.json(
      { code: -1, message: 'ANIMATION_NOT_FOUND' },
      { status: 404 }
    );
  }
  return Response.json({ code: 0, data: result }, { status: 201 });
}
