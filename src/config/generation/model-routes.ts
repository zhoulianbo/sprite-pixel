export type GenerationModelKind = 'character' | 'animation' | 'icon';

export type GenerationModelRoute = {
  provider: string;
  model: string;
  credits: number;
};

/**
 * Product model routing and per-task credit costs.
 * Provider credentials remain in the server-side settings store.
 *
 * 1 Credit = one standard 1K image.
 * An icon batch, including a full-sheet retry, is a flat 2 Credits.
 */
export const generationModelRoutes = {
  character: {
    provider: 'grsai',
    model: 'gpt-image-2.5',
    credits: 1,
  },
  animation: {
    provider: 'grsai',
    model: 'minimax-h3',
    credits: 3,
  },
  icon: {
    provider: 'grsai',
    model: 'gpt-image-2.5',
    credits: 2,
  },
} as const satisfies Record<GenerationModelKind, GenerationModelRoute>;

/** Free preprocessing for thin icon names/descriptions. Does not consume credits. */
export const iconPromptExpandModel = {
  provider: 'grsai',
  model: 'gemini-2.5-flash',
} as const;

export function getGenerationModelRoute(kind: GenerationModelKind) {
  return generationModelRoutes[kind];
}

export function getGenerationCredits(
  kind: GenerationModelKind,
  options?: { taskCount?: number; retry?: boolean }
) {
  const count = Math.max(1, options?.taskCount ?? 1);
  if (kind === 'icon') {
    return generationModelRoutes.icon.credits;
  }
  return generationModelRoutes[kind].credits * count;
}

export function distributeCredits(total: number, count: number) {
  const size = Math.max(1, count);
  const base = Math.floor(total / size);
  const extra = total % size;
  return Array.from(
    { length: size },
    (_, index) => base + (index < extra ? 1 : 0)
  );
}

export const GENERATION_POLL_INTERVAL_MS = {
  character: 3000,
  icon: 3000,
  animation: 5000,
} as const satisfies Record<GenerationModelKind, number>;

export function generationPollIntervalMs(kind: GenerationModelKind) {
  return GENERATION_POLL_INTERVAL_MS[kind];
}
