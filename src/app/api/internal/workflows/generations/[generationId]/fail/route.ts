import { getCloudflareContext } from '@opennextjs/cloudflare';
import { z } from 'zod';

import { failSpriteGenerationWorkflow } from '@/shared/services/asset-generation';

const bodySchema = z.object({
  failureCode: z.string().trim().min(1).max(100),
  failureReason: z.string().trim().min(1).max(2000),
});

function authorized(request: Request) {
  let secret = process.env.WORKFLOW_INTERNAL_TOKEN || '';
  try {
    const { env } = getCloudflareContext() as {
      env?: { WORKFLOW_INTERNAL_TOKEN?: string };
    };
    secret = env?.WORKFLOW_INTERNAL_TOKEN || secret;
  } catch {
    // process.env supports local route tests.
  }
  return Boolean(
    secret && request.headers.get('authorization') === `Bearer ${secret}`
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ generationId: string }> }
) {
  if (!authorized(request)) {
    return Response.json(
      { code: -1, message: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { code: -1, message: 'INVALID_WORKFLOW_FAILURE' },
      { status: 400 }
    );
  }
  const { generationId } = await params;
  await failSpriteGenerationWorkflow(
    generationId,
    parsed.data.failureCode,
    parsed.data.failureReason
  );
  console.error(
    JSON.stringify({
      event: 'sprite_workflow_failed',
      generationId,
      ...parsed.data,
    })
  );
  return Response.json({ code: 0, data: { generationId, status: 'failed' } });
}
