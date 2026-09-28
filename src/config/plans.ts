export const PLAN_TIERS = ['free', 'indie', 'pro'] as const;

export type PlanTier = (typeof PLAN_TIERS)[number];

export type PlanEntitlements = {
  /** null means unlimited active projects. */
  maxProjects: number | null;
  privateAssets: boolean;
  commercialUse: boolean;
  downloads: boolean;
  dailyFreeCredits: boolean;
  emailSupport: boolean;
  priorityQueue: boolean;
};

/**
 * Subscriber benefits. Credit packs and unknown product ids stay on Free.
 */
export const planEntitlements = {
  free: {
    maxProjects: 1,
    privateAssets: false,
    commercialUse: false,
    downloads: true,
    dailyFreeCredits: false,
    emailSupport: false,
    priorityQueue: false,
  },
  indie: {
    maxProjects: 10,
    privateAssets: true,
    commercialUse: true,
    downloads: true,
    dailyFreeCredits: true,
    emailSupport: true,
    priorityQueue: false,
  },
  pro: {
    maxProjects: null,
    privateAssets: true,
    commercialUse: true,
    downloads: true,
    dailyFreeCredits: true,
    emailSupport: true,
    priorityQueue: true,
  },
} as const satisfies Record<PlanTier, PlanEntitlements>;

export type BooleanPlanEntitlement = {
  [Key in keyof PlanEntitlements]: PlanEntitlements[Key] extends boolean
    ? Key
    : never;
}[keyof PlanEntitlements];

export function planTierFromProductId(productId?: string | null): PlanTier {
  const tier = (productId ?? '').trim().toLowerCase().split('-')[0];
  if (tier === 'indie' || tier === 'pro' || tier === 'free') return tier;
  return 'free';
}

export function getPlanEntitlements(productId?: string | null) {
  return planEntitlements[planTierFromProductId(productId)];
}

export function hasPlanEntitlement(
  productId: string | null | undefined,
  entitlement: BooleanPlanEntitlement
) {
  return getPlanEntitlements(productId)[entitlement];
}

export function canCreateProject(
  productId: string | null | undefined,
  activeProjectCount: number
) {
  const { maxProjects } = getPlanEntitlements(productId);
  if (maxProjects === null) return true;
  return activeProjectCount < maxProjects;
}
