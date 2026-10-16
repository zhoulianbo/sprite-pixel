export type BackgroundResources = {
  modelUrl: string;
  runtimeUrl: string;
  bytes: number;
  sha256: string;
};
export type ModelProgress = { phase: string; loaded: number; total: number };
export type CutoutOptions = { threshold: number; hardEdge: boolean };

export class BackgroundClient {
  private worker?: Worker;
  private pending?: {
    resolve: (value: Blob | undefined) => void;
    reject: (error: Error) => void;
  };
  private ready = false;
  constructor(private onProgress: (progress: ModelProgress) => void) {}
  private send(data: unknown) {
    if (!this.worker) {
      if (
        typeof Worker === 'undefined' ||
        typeof OffscreenCanvas === 'undefined'
      )
        throw new Error('BROWSER_UNSUPPORTED');
      this.worker = new Worker(
        new URL('./background-worker.ts', import.meta.url)
      );
      this.worker.onmessage = ({ data }) => {
        if (data.type === 'progress') {
          this.onProgress(data);
          return;
        }
        const pending = this.pending;
        this.pending = undefined;
        if (data.type === 'error') {
          pending?.reject(new Error(data.code));
        } else pending?.resolve(data.blob);
      };
      this.worker.onerror = () => {
        this.pending?.reject(new Error('MODEL_FAILED'));
        this.pending = undefined;
        this.worker?.terminate();
        this.worker = undefined;
        this.ready = false;
      };
    }
    if (this.pending) throw new Error('PROCESSING_FAILED');
    return new Promise<Blob | undefined>((resolve, reject) => {
      this.pending = { resolve, reject };
      this.worker!.postMessage(data);
    });
  }
  async remove(blob: Blob, signal: AbortSignal, options: CutoutOptions) {
    signal.throwIfAborted();
    const abort = () => this.dispose();
    signal.addEventListener('abort', abort, { once: true });
    try {
      if (!this.ready) {
        this.onProgress({ phase: 'preparing', loaded: 0, total: 0 });
        const response = await fetch('/api/tools/background-removal/model', {
          signal,
          cache: 'no-store',
        }).catch(() => {
          signal.throwIfAborted();
          throw new Error('MODEL_DOWNLOAD_FAILED');
        });
        if (!response.ok) throw new Error('MODEL_DOWNLOAD_FAILED');
        const resources: BackgroundResources = await response.json();
        resources.modelUrl = new URL(
          resources.modelUrl,
          window.location.href
        ).href;
        resources.runtimeUrl = new URL(
          resources.runtimeUrl,
          window.location.href
        ).href;
        signal.throwIfAborted();
        try {
          await this.send({ type: 'init', resources });
        } catch (error) {
          signal.throwIfAborted();
          this.dispose();
          if (error instanceof Error && error.message === 'MODEL_FAILED')
            throw new Error('MODEL_INITIALIZATION_FAILED');
          throw error;
        }
        signal.throwIfAborted();
        this.ready = true;
      }
      signal.throwIfAborted();
      this.onProgress({ phase: 'removing', loaded: 0, total: 0 });
      const result = await this.send({
        type: 'remove',
        blob,
        threshold: options.threshold,
        hardEdge: options.hardEdge,
      });
      signal.throwIfAborted();
      if (!result) throw new Error('MODEL_FAILED');
      return result;
    } finally {
      signal.removeEventListener('abort', abort);
    }
  }
  dispose() {
    this.pending?.reject(new DOMException('Aborted', 'AbortError'));
    this.pending = undefined;
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = false;
  }
}
