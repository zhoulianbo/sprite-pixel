import { getCloudflareContext } from '@opennextjs/cloudflare';

import { envConfigs } from '@/config';
import { isProduction } from '@/shared/lib/env';

/** Single KV entry holding the full `config` table as JSON. */
export const CONFIG_KV_KEY = 'app:configs';

type KVNamespace = {
  get(
    key: string,
    options?: 'text' | 'json' | { type: 'text' | 'json' }
  ): Promise<string | unknown | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
};

export type DbConfigs = Record<string, string>;

/** Production Workers + D1: read settings snapshot from KV instead of scanning D1. */
export function isConfigKvEnabled(): boolean {
  return isProduction && envConfigs.database_provider === 'd1';
}

export function getConfigKvNamespace(): KVNamespace | null {
  if (!isConfigKvEnabled()) {
    return null;
  }

  try {
    const { env } = getCloudflareContext() as {
      env?: { CONFIG_CACHE?: KVNamespace };
    };
    return env?.CONFIG_CACHE ?? null;
  } catch {
    return null;
  }
}

export async function readDbConfigsFromKv(): Promise<DbConfigs | null> {
  const kv = getConfigKvNamespace();
  if (!kv) {
    return null;
  }

  try {
    const cached = await kv.get(CONFIG_KV_KEY, 'json');
    if (!cached || typeof cached !== 'object' || Array.isArray(cached)) {
      return null;
    }
    return cached as DbConfigs;
  } catch (error) {
    console.log('get configs from kv failed:', error);
    return null;
  }
}

export async function writeDbConfigsToKv(configs: DbConfigs): Promise<void> {
  const kv = getConfigKvNamespace();
  if (!kv) {
    return;
  }

  try {
    await kv.put(CONFIG_KV_KEY, JSON.stringify(configs));
  } catch (error) {
    console.log('put configs to kv failed:', error);
  }
}
