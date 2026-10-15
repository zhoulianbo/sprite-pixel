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

export const generationProviderOptions = [
  { title: 'Grsai', value: 'grsai' },
  { title: 'Kie', value: 'kie' },
  { title: 'Replicate', value: 'replicate' },
  { title: 'Fal', value: 'fal' },
  { title: 'Gemini', value: 'gemini' },
] as const;

export const generationModelSettingKeys = {
  character: {
    provider: 'generation_character_provider',
    model: 'generation_character_model',
    credits: 'generation_character_credits',
  },
  animation: {
    provider: 'generation_animation_provider',
    model: 'generation_animation_model',
    credits: 'generation_animation_credits',
  },
  icon: {
    provider: 'generation_icon_provider',
    model: 'generation_icon_model',
    credits: 'generation_icon_credits',
  },
} as const satisfies Record<
  GenerationModelKind,
  { provider: string; model: string; credits: string }
>;

export const iconPromptExpandSettingKeys = {
  provider: 'generation_icon_expand_provider',
  model: 'generation_icon_expand_model',
} as const;

const generationProviderValues = new Set<string>(
  generationProviderOptions.map((option) => option.value)
);

function configuredProvider(value: string | undefined, fallback: string) {
  const provider = value?.trim();
  if (!provider || !generationProviderValues.has(provider)) return fallback;
  return provider;
}

function configuredModel(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function configuredCredits(value: string | undefined, fallback: number) {
  if (!value?.trim()) return fallback;
  const credits = Number(value);
  if (!Number.isSafeInteger(credits) || credits <= 0) return fallback;
  return credits;
}

export function resolveGenerationModelRoute(
  kind: GenerationModelKind,
  configs?: Record<string, string | undefined> | null
): GenerationModelRoute {
  const fallback = generationModelRoutes[kind];
  const keys = generationModelSettingKeys[kind];
  return {
    provider: configuredProvider(configs?.[keys.provider], fallback.provider),
    model: configuredModel(configs?.[keys.model], fallback.model),
    credits: configuredCredits(configs?.[keys.credits], fallback.credits),
  };
}

export function resolveIconPromptExpandModel(
  configs?: Record<string, string | undefined> | null
) {
  return {
    provider: configuredProvider(
      configs?.[iconPromptExpandSettingKeys.provider],
      iconPromptExpandModel.provider
    ),
    model: configuredModel(
      configs?.[iconPromptExpandSettingKeys.model],
      iconPromptExpandModel.model
    ),
  };
}

export function getGenerationModelRoute(kind: GenerationModelKind) {
  return generationModelRoutes[kind];
}

export function getGenerationCredits(
  kind: GenerationModelKind,
  options?: {
    taskCount?: number;
    retry?: boolean;
    route?: Pick<GenerationModelRoute, 'credits'>;
  }
) {
  const credits = options?.route?.credits ?? generationModelRoutes[kind].credits;
  const count = Math.max(1, options?.taskCount ?? 1);
  if (kind === 'icon') {
    return credits;
  }
  return credits * count;
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
