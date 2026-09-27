declare module 'cloudflare:workers' {
  export class WorkflowEntrypoint<Env = unknown> {
    protected env: Env;
  }
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}
