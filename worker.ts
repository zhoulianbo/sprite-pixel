import { WorkflowEntrypoint } from 'cloudflare:workers';

// @ts-ignore OpenNext creates this module after the Next.js build finishes.
import openNextWorker from './.open-next/worker.js';

// @ts-ignore OpenNext creates these Durable Object exports after the build.
export { DOQueueHandler, DOShardedTagCache } from './.open-next/worker.js';

type WorkflowEnv = {
  WORKER_SELF_REFERENCE: {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  };
  WORKFLOW_INTERNAL_TOKEN: string;
};

type SpriteWorkflowPayload = { generationId: string };
type SpriteWorkflowEvent = {
  payload: SpriteWorkflowPayload;
  instanceId: string;
};
type SpriteWorkflowStep = {
  do<T>(
    name: string,
    config: Record<string, unknown>,
    callback: () => Promise<T>
  ): Promise<T>;
  sleep(name: string, duration: string): Promise<void>;
};

type AdvanceResult = {
  generationId: string;
  status: string;
  terminal: boolean;
  completed: number;
  total: number;
  retryAfterSeconds: number;
  failureReason?: string;
};

export class SpriteGenerationWorkflow extends WorkflowEntrypoint<WorkflowEnv> {
  async run(event: SpriteWorkflowEvent, step: SpriteWorkflowStep) {
    const generationId = event.payload.generationId;
    const headers = {
      Authorization: `Bearer ${this.env.WORKFLOW_INTERNAL_TOKEN}`,
      'Content-Type': 'application/json',
    };
    try {
      for (let iteration = 0; iteration < 360; iteration += 1) {
        const result = await step.do(
          `advance-${iteration}`,
          {
            retries: {
              limit: 3,
              delay: '5 seconds',
              backoff: 'exponential',
            },
            timeout: '15 minutes',
          },
          async () => {
            const response = await this.env.WORKER_SELF_REFERENCE.fetch(
              `https://spritepixel.internal/api/internal/workflows/generations/${generationId}/advance`,
              { method: 'POST', headers }
            );
            const payload = (await response.json()) as {
              code?: number;
              message?: string;
              data?: AdvanceResult;
            };
            if (!response.ok || payload.code !== 0 || !payload.data) {
              throw new Error(
                payload.message || `WORKFLOW_ADVANCE_HTTP_${response.status}`
              );
            }
            return payload.data;
          }
        );
        const failed =
          result.terminal &&
          (result.status === 'failed' || Boolean(result.failureReason));
        console[failed ? 'error' : 'info'](
          JSON.stringify({
            event: failed
              ? 'sprite_workflow_failed'
              : 'sprite_workflow_progress',
            instanceId: event.instanceId,
            iteration,
            ...result,
          })
        );
        if (result.terminal) return result;
        await step.sleep(
          `wait-${iteration}`,
          `${Math.max(2, result.retryAfterSeconds || 5)} seconds`
        );
      }
      throw new Error('WORKFLOW_POLL_TIMEOUT');
    } catch (error) {
      const reason =
        error instanceof Error ? error.message.slice(0, 2000) : String(error);
      console.error(
        JSON.stringify({
          event: 'sprite_workflow_terminal_error',
          generationId,
          instanceId: event.instanceId,
          reason,
        })
      );
      await step.do(
        'record-terminal-failure',
        { retries: { limit: 3, delay: '5 seconds' } },
        async () => {
          const response = await this.env.WORKER_SELF_REFERENCE.fetch(
            `https://spritepixel.internal/api/internal/workflows/generations/${generationId}/fail`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                failureCode: 'WORKFLOW_FAILED',
                failureReason: reason,
              }),
            }
          );
          if (!response.ok) {
            throw new Error(`WORKFLOW_FAILURE_RECORD_HTTP_${response.status}`);
          }
          return { generationId, recorded: true };
        }
      );
      throw error;
    }
  }
}

export default {
  fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    return openNextWorker.fetch(request, env, ctx);
  },
};
