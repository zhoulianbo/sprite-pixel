import { z } from 'zod';

import { toPublicSpriteGeneration } from '@/shared/lib/public-generation';
import { getUserInfo } from '@/shared/models/user';
import {
  saveGeneratedCharacter,
  SpriteGenerationError,
} from '@/shared/services/asset-generation';

const requestSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ projectId: string; generationId: string }>;
  }
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
      { code: -1, message: 'INVALID_ASSET' },
      { status: 400 }
    );
  }

  try {
    const { projectId, generationId } = await params;
    const result = await saveGeneratedCharacter(
      user.id,
      projectId,
      generationId,
      parsed.data.name
    );
    return Response.json({
      code: 0,
      data: toPublicSpriteGeneration(result),
    });
  } catch (error) {
    const known = error instanceof SpriteGenerationError;
    return Response.json(
      { code: -1, message: known ? error.code : 'ASSET_SAVE_FAILED' },
      { status: known ? error.status : 500 }
    );
  }
}
