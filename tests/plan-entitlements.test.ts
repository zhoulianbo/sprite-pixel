import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  canCreateProject,
  getPlanEntitlements,
  hasPlanEntitlement,
  planTierFromProductId,
} from '../src/config/plans';

test('subscription product ids map to plan tiers and credit packs stay free', () => {
  assert.equal(planTierFromProductId(null), 'free');
  assert.equal(planTierFromProductId('free-monthly'), 'free');
  assert.equal(planTierFromProductId('indie-yearly'), 'indie');
  assert.equal(planTierFromProductId('pro-monthly'), 'pro');
  assert.equal(planTierFromProductId('pack-power'), 'free');
});

test('plan entitlements expose project limits and subscriber benefits', () => {
  assert.equal(getPlanEntitlements('free-monthly').maxProjects, 1);
  assert.equal(getPlanEntitlements('indie-monthly').maxProjects, 10);
  assert.equal(getPlanEntitlements('pro-yearly').maxProjects, null);
  assert.equal(hasPlanEntitlement('pack-flex', 'privateAssets'), false);
  assert.equal(hasPlanEntitlement('indie-yearly', 'commercialUse'), true);
  assert.equal(hasPlanEntitlement('pro-monthly', 'priorityQueue'), true);
  assert.equal(hasPlanEntitlement('indie-monthly', 'priorityQueue'), false);
  assert.equal(hasPlanEntitlement(null, 'dailyFreeCredits'), false);
  assert.equal(hasPlanEntitlement('free-monthly', 'dailyFreeCredits'), false);
  assert.equal(hasPlanEntitlement('pack-power', 'dailyFreeCredits'), false);
  assert.equal(hasPlanEntitlement('indie-monthly', 'dailyFreeCredits'), true);
  assert.equal(hasPlanEntitlement('pro-yearly', 'dailyFreeCredits'), true);
});

test('project creation stops at the active plan limit', () => {
  assert.equal(canCreateProject(null, 0), true);
  assert.equal(canCreateProject('free-yearly', 1), false);
  assert.equal(canCreateProject('indie-monthly', 9), true);
  assert.equal(canCreateProject('indie-monthly', 10), false);
  assert.equal(canCreateProject('pro-monthly', 40), true);
  assert.equal(canCreateProject('pack-quick', 1), false);
});
