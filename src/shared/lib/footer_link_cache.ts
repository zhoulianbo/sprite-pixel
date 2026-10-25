import { getCloudflareContext } from '@opennextjs/cloudflare';

import {
  CONFIG_KV_TTL_SECONDS,
  getConfigKvNamespace,
  isConfigKvEnabled,
} from '@/shared/lib/config-kv';
import type { FooterLinkHtmlRow } from '@/shared/lib/footer_link_html';

export const FOOTER_LINK_CACHE_TAG = 'footer-links';
export const FOOTER_LINK_CACHE_KEY = 'config:footer-links:published:v1';

export async function readPublishedFooterLinksFromKv() {
  const kv = getConfigKvNamespace();
  if (!kv) return null;

  try {
    const rows = await kv.get(FOOTER_LINK_CACHE_KEY, 'json');
    if (
      !Array.isArray(rows) ||
      !rows.every(
        (row) =>
          row &&
          ['id', 'group', 'title', 'url', 'locale', 'rel', 'status'].every(
            (field) => typeof row[field] === 'string'
          ) &&
          (row.image_url === null || typeof row.image_url === 'string') &&
          (row.alt_text === null || typeof row.alt_text === 'string') &&
          Number.isFinite(row.sort)
      )
    ) {
      return null;
    }
    return rows as FooterLinkHtmlRow[];
  } catch (error) {
    console.warn('read footer links from KV failed:', error);
    return null;
  }
}

export async function writePublishedFooterLinksToKv(rows: FooterLinkHtmlRow[]) {
  const kv = getConfigKvNamespace();
  if (!kv) {
    if (isConfigKvEnabled())
      throw new Error('CONFIG_CACHE binding is unavailable');
    return;
  }

  try {
    await kv.put(FOOTER_LINK_CACHE_KEY, JSON.stringify(rows), {
      expirationTtl: CONFIG_KV_TTL_SECONDS,
    });
  } catch (error) {
    // A missing snapshot can be recovered from D1 on the next render.
    await kv.delete(FOOTER_LINK_CACHE_KEY).catch(() => undefined);
    throw error;
  }
}

export async function purgeFooterLinkCdnCache() {
  // Workers Cache supports tag purging without a separate API token.
  let workerCache:
    | { purge(options: { tags: string[] }): Promise<{ success: boolean }> }
    | undefined;
  try {
    const { ctx } = getCloudflareContext() as {
      ctx?: { cache?: typeof workerCache };
    };
    workerCache = ctx?.cache;
  } catch {
    // Local development has no Cloudflare request context.
  }
  if (workerCache) {
    try {
      const result = await workerCache.purge({ tags: [FOOTER_LINK_CACHE_TAG] });
      if (result.success) return true;
    } catch (error) {
      console.warn('footer link Worker cache purge failed:', error);
    }
  }

  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();

  if (!zoneId || !apiToken) {
    return !isConfigKvEnabled();
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags: [FOOTER_LINK_CACHE_TAG] }),
      }
    );

    if (!response.ok) {
      console.warn(
        `footer link cache purge failed: ${response.status} ${response.statusText}`
      );
      return false;
    }

    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch (error) {
    console.warn('footer link cache purge failed:', error);
    return false;
  }
}
