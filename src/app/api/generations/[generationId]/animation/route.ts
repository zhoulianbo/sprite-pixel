import { animationReviewSchema } from '@/shared/lib/animation-review';
import { toPublicSpriteGeneration } from '@/shared/lib/public-generation';
import { getUserInfo } from '@/shared/models/user';
import {
  reviewSpriteAnimation,
  SpriteGenerationError,
} from '@/shared/services/asset-generation';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ generationId: string }> }
) {
  const user = await getUserInfo();
  if (!user)
    return Response.json(
      { code: -1, message: 'UNAUTHORIZED' },
      { status: 401 }
    );
  const parsed = animationReviewSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success)
    return Response.json(
      { code: -1, message: 'INVALID_PARAMETERS' },
      { status: 400 }
    );
  try {
    const { generationId } = await params;
    return Response.json(
      {
        code: 0,
        data: toPublicSpriteGeneration(
          await reviewSpriteAnimation(user.id, generationId, parsed.data)
        ),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const known = error instanceof SpriteGenerationError;
    return Response.json(
      { code: -1, message: known ? error.code : 'ANIMATION_PROCESSING_FAILED' },
      { status: known ? error.status : 502 }
    );
  }
}
