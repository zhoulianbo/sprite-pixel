import { getCloudflareContext } from '@opennextjs/cloudflare';

import {
  advanceSpriteGenerationWorkflow,
  SpriteGenerationError,
} from '@/shared/services/asset-generation';

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
  const authorization = request.headers.get('authorization');
  return Boolean(secret && authorization === `Bearer ${secret}`);
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
  const { generationId } = await params;
  try {
    const data = await advanceSpriteGenerationWorkflow(generationId);
    const failed =
      data.terminal &&
      (data.status === 'failed' || Boolean(data.failureReason));
    console[failed ? 'error' : 'info'](
      JSON.stringify({
        event: failed
          ? 'sprite_workflow_advanced_failed'
          : 'sprite_workflow_advanced',
        ...data,
      })
    );
    return Response.json({ code: 0, data });
  } catch (error) {
    const known = error instanceof SpriteGenerationError;
    const reason = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        event: 'sprite_workflow_advance_failed',
        generationId,
        reason,
      })
    );
    return Response.json(
      { code: -1, message: known ? error.code : 'WORKFLOW_ADVANCE_FAILED' },
      { status: known ? error.status : 500 }
    );
  }
}
