import { cache } from 'react';
import { betterAuth, BetterAuthOptions } from 'better-auth';

import { getAllConfigs } from '@/shared/models/config';

import { getAuthOptions } from './config';

// React caches only within one server render. Never share request-bound DB
// adapters or auth instances across requests; route handlers stay uncached.
export const getAuth = cache(async () => {
  // get configs from db and env
  const configs = await getAllConfigs();

  const authOptions = await getAuthOptions(configs);

  return betterAuth(authOptions as BetterAuthOptions);
});
