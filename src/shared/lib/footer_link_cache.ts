export const FOOTER_LINK_CACHE_TAG = 'footer-links';

export async function purgeFooterLinkCdnCache() {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();

  if (!zoneId || !apiToken) {
    return false;
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

    return true;
  } catch (error) {
    console.warn('footer link cache purge failed:', error);
    return false;
  }
}
