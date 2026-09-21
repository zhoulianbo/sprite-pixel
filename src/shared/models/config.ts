import { revalidateTag, unstable_cache } from 'next/cache';

import { db, isDatabaseConfigured } from '@/core/db';
import { envConfigs } from '@/config';
import { config } from '@/config/db/schema';
import {
  isConfigKvEnabled,
  readDbConfigsFromKv,
  writeDbConfigsToKv,
} from '@/shared/lib/config-kv';
import {
  getAllSettingNames,
  publicSettingNames,
} from '@/shared/services/settings';

export type Config = typeof config.$inferSelect;
export type NewConfig = typeof config.$inferInsert;
export type UpdateConfig = Partial<Omit<NewConfig, 'name'>>;

export type Configs = Record<string, string>;

export const CACHE_TAG_CONFIGS = 'configs';

async function loadDbConfigsFromDatabase(): Promise<Configs> {
  const configs: Configs = {};

  if (!isDatabaseConfigured()) {
    return configs;
  }

  const result = await db().select().from(config);
  if (!result) {
    return configs;
  }

  for (const row of result) {
    configs[row.name] = row.value ?? '';
  }

  return configs;
}

async function syncConfigKvAfterWrite(): Promise<void> {
  if (!isConfigKvEnabled()) {
    return;
  }

  const latest = await loadDbConfigsFromDatabase();
  await writeDbConfigsToKv(latest);
}

async function loadDbConfigsForCache(): Promise<Configs> {
  if (isConfigKvEnabled()) {
    const cached = await readDbConfigsFromKv();
    if (cached) {
      return cached;
    }

    const configs = await loadDbConfigsFromDatabase();
    await writeDbConfigsToKv(configs);
    return configs;
  }

  return loadDbConfigsFromDatabase();
}

export async function saveConfigs(configs: Record<string, string>) {
  const database = db();
  const configEntries = Object.entries(configs);

  // D1: use batch() to send all upserts in a single round-trip
  if (envConfigs.database_provider === 'd1') {
    const queries = configEntries.map(([name, configValue]) =>
      database
        .insert(config)
        .values({ name, value: configValue })
        .onConflictDoUpdate({
          target: config.name,
          set: { value: configValue },
        })
        .returning()
    );

    const batchResults =
      queries.length > 0 ? await database.batch(queries) : [];
    revalidateTag(CACHE_TAG_CONFIGS);
    await syncConfigKvAfterWrite();
    return batchResults.flat();
  }

  // Other databases: use transaction for atomicity
  const result = await database.transaction(async (tx: any) => {
    const results: any[] = [];

    for (const [name, configValue] of configEntries) {
      const [upsertResult] = await tx
        .insert(config)
        .values({ name, value: configValue })
        .onConflictDoUpdate({
          target: config.name,
          set: { value: configValue },
        })
        .returning();

      results.push(upsertResult);
    }

    return results;
  });

  revalidateTag(CACHE_TAG_CONFIGS);
  await syncConfigKvAfterWrite();

  return result;
}

export async function addConfig(newConfig: NewConfig) {
  const [result] = await db().insert(config).values(newConfig).returning();
  revalidateTag(CACHE_TAG_CONFIGS);
  await syncConfigKvAfterWrite();

  return result;
}

export const getConfigs = unstable_cache(
  loadDbConfigsForCache,
  ['configs'],
  {
    revalidate: 3600,
    tags: [CACHE_TAG_CONFIGS],
  }
);

export async function getAllConfigs(): Promise<Configs> {
  let dbConfigs: Configs = {};

  // only get configs from db in server side
  if (typeof window === 'undefined' && isDatabaseConfigured()) {
    try {
      dbConfigs = await getConfigs();
    } catch (e) {
      console.log(`get configs from db failed:`, e);
      dbConfigs = {};
    }
  }

  const settingNames = await getAllSettingNames();
  settingNames.forEach((key) => {
    const upperKey = key.toUpperCase();
    // use env configs if available
    if (process.env[upperKey]) {
      dbConfigs[key] = process.env[upperKey] ?? '';
    } else if (process.env[key]) {
      dbConfigs[key] = process.env[key] ?? '';
    }
  });

  const configs = {
    ...envConfigs,
    ...dbConfigs,
  };

  return configs;
}

export async function getPublicConfigs(): Promise<Configs> {
  let allConfigs = await getAllConfigs();

  const publicConfigs: Record<string, string> = {};

  // get public configs
  for (const key in allConfigs) {
    if (publicSettingNames.includes(key)) {
      publicConfigs[key] = String(allConfigs[key]);
    }
  }

  const configs = {
    ...publicConfigs,
  };

  return configs;
}
