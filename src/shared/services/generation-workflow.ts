import { getCloudflareContext } from '@opennextjs/cloudflare';

type WorkflowBinding = {
  create(options: {
    id?: string;
    params: { generationId: string };
  }): Promise<{ id: string }>;
};

type GenerationWorkflowEnv = {
  SPRITE_GENERATION_WORKFLOW?: WorkflowBinding;
};

type LocalWorkflowResult = {
  terminal: boolean;
  retryAfterSeconds: number;
  status?: string;
  failureReason?: string;
};

type LocalWorkflowHandlers = {
  advance(): Promise<LocalWorkflowResult>;
  fail(failureCode: string, failureReason: string): Promise<unknown>;
};

const localWorkflowJobs = new Set<string>();

function delay(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

async function runLocalWorkflow(
  generationId: string,
  instanceId: string,
  handlers: LocalWorkflowHandlers
) {
  try {
    for (let iteration = 0; iteration < 360; iteration += 1) {
      let result: LocalWorkflowResult | undefined;
      let lastError: unknown;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          result = await handlers.advance();
          break;
        } catch (error) {
          lastError = error;
          if (attempt < 3) await delay(5 * 2 ** attempt);
        }
      }
      if (!result)
        throw lastError || new Error('LOCAL_WORKFLOW_ADVANCE_FAILED');
      const failed =
        result.terminal &&
        (result.status === 'failed' || Boolean(result.failureReason));
      console[failed ? 'error' : 'info'](
        JSON.stringify({
          event: failed
            ? 'sprite_local_workflow_failed'
            : 'sprite_local_workflow_progress',
          generationId,
          instanceId,
          iteration,
          ...result,
        })
      );
      if (result.terminal) return;
      await delay(Math.max(2, result.retryAfterSeconds || 5));
    }
    throw new Error('WORKFLOW_POLL_TIMEOUT');
  } catch (error) {
    const reason =
      error instanceof Error ? error.message.slice(0, 2000) : String(error);
    console.error(
      JSON.stringify({
        event: 'sprite_local_workflow_terminal_error',
        generationId,
        instanceId,
        reason,
      })
    );
    try {
      await handlers.fail('WORKFLOW_FAILED', reason);
    } catch (recordError) {
      console.error(
        JSON.stringify({
          event: 'sprite_local_workflow_failure_record_failed',
          generationId,
          instanceId,
          reason:
            recordError instanceof Error
              ? recordError.message.slice(0, 2000)
              : String(recordError),
        })
      );
    }
  } finally {
    localWorkflowJobs.delete(instanceId);
  }
}

export async function startGenerationWorkflow(
  generationId: string,
  instanceId = generationId,
  localHandlers?: LocalWorkflowHandlers
) {
  let env: GenerationWorkflowEnv | undefined;
  try {
    env = (getCloudflareContext() as { env?: GenerationWorkflowEnv }).env;
  } catch {
    env = undefined;
  }
  const workflow = env?.SPRITE_GENERATION_WORKFLOW;
  if (workflow) {
    return workflow.create({ id: instanceId, params: { generationId } });
  }
  if (process.env.NODE_ENV === 'development' && localHandlers) {
    if (!localWorkflowJobs.has(instanceId)) {
      localWorkflowJobs.add(instanceId);
      void runLocalWorkflow(generationId, instanceId, localHandlers);
    }
    return { id: instanceId };
  }
  throw new Error('WORKFLOW_NOT_CONFIGURED');
}
