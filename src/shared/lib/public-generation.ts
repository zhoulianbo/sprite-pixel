type GenerationParams = Record<string, unknown>;

export function toPublicGenerationParams(params: unknown): GenerationParams {
  const publicParams = {
    ...((params && typeof params === 'object'
      ? params
      : {}) as GenerationParams),
  };
  delete publicParams.model;
  delete publicParams.plannedItemId;
  delete publicParams.plannedVariantId;
  delete publicParams.plannedSetId;
  return publicParams;
}

export function toPublicSpriteGeneration<
  T extends { paramsJson?: string | null; params?: unknown },
>(generation: T) {
  const { paramsJson: _paramsJson, params, ...rest } = generation;
  return {
    ...rest,
    params: toPublicGenerationParams(params),
  };
}
