import { toPublicSpriteGeneration } from '@/shared/lib/public-generation';
import { getUserInfo } from '@/shared/models/user';
import {
  retrySpriteGeneration,
  SpriteGenerationError,
} from '@/shared/services/asset-generation';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ generationId: string }> }
) {
  const user = await getUserInfo();
  if (!user)
    return Response.json(
      { code: -1, message: 'UNAUTHORIZED' },
      { status: 401 }
    );
  try {
    const { generationId } = await params;
    return Response.json({
      code: 0,
      data: toPublicSpriteGeneration(
        await retrySpriteGeneration(user.id, generationId)
      ),
    });
  } catch (error) {
    const known = error instanceof SpriteGenerationError;
    return Response.json(
      { code: -1, message: known ? error.code : 'GENERATION_RETRY_FAILED' },
      { status: known ? error.status : 500 }
    );
  }
}
