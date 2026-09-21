export type GenerationModelKind = 'character' | 'animation' | 'icon';

export type GenerationModelRoute = {
  provider: string;
  model: string;
  credits: number;
  retryCredits?: number;
};

/**
 * Product model routing and per-task credit costs.
 * Provider credentials remain in the server-side settings store.
 *
 * 2 Credits = one standard 1K image.
 * Icon batches are billed as a flat 3 Credits; a single icon retry costs 1.
 */
export const generationModelRoutes = {
  character: {
    provider: 'grsai',
    model: 'gpt-image-2.5',
    credits: 2,
  },
  animation: {
    provider: 'grsai',
    model: 'gpt-image-2.5',
    credits: 3,
  },
  icon: {
    provider: 'grsai',
    model: 'gpt-image-2.5',
    credits: 3,
    retryCredits: 1,
  },
} as const satisfies Record<GenerationModelKind, GenerationModelRoute>;

/** Free preprocessing for thin icon names/descriptions. Does not consume credits. */
export const iconPromptExpandModel = {
  provider: 'gemini',
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
    const route = generationModelRoutes.icon;
    if (options?.retry) {
      return route.retryCredits * count;
    }
    return route.credits;
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
