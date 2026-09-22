/**
 * Plausible Script v2 expects `plausible.init()` after the hashed loader script.
 * Custom proxy hosts must also pass `endpoint` so events post to the proxy.
 *
 * @see https://plausible.io/docs/proxy/guides/cloudflare
 */
export function getPlausibleInitOptions(
  scriptSrc: string
): Record<string, string> | null {
  const trimmed = scriptSrc.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const { origin, hostname } = new URL(trimmed);
    if (hostname === 'plausible.io' || hostname.endsWith('.plausible.io')) {
      return null;
    }

    return { endpoint: `${origin}/api/event` };
  } catch {
    return null;
  }
}

export function buildPlausibleBootstrapScript(scriptSrc: string): string {
  const options = getPlausibleInitOptions(scriptSrc);
  const initArg = options ? JSON.stringify(options) : '';

  return `
    window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) };
    window.plausible.init = window.plausible.init || function(i) { window.plausible.o = i || {} };
    window.plausible.init(${initArg});
  `.trim();
}
