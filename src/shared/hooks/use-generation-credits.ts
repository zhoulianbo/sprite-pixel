'use client';

import {
  getGenerationCredits,
  resolveGenerationModelRoute,
  type GenerationModelKind,
} from '@/config/generation/model-routes';
import { useAppContext } from '@/shared/contexts/app';

export function useGenerationCredits(
  kind: GenerationModelKind,
  options?: { taskCount?: number; retry?: boolean }
) {
  const { configs } = useAppContext();
  const route = resolveGenerationModelRoute(kind, configs);
  return getGenerationCredits(kind, { ...options, route });
}
