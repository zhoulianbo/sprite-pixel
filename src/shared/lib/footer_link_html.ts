export type FooterLinkHtmlRow = {
  id: string;
  group: string;
  title: string;
  url: string;
  image_url: string | null;
  alt_text: string | null;
  locale: string;
  rel: string;
  status: string;
  sort: number;
};

const ALLOWED_REL_TOKENS = new Set([
  'nofollow',
  'noopener',
  'noreferrer',
  'sponsored',
  'ugc',
]);

export function escapeFooterLinkHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function normalizeFooterLinkUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeFooterLinkRel(value: string) {
  const tokens = value
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => ALLOWED_REL_TOKENS.has(token));

  if (!tokens.includes('noopener')) {
    tokens.push('noopener');
  }

  return [...new Set(tokens)].join(' ');
}

export function renderFooterLinkHtml(
  rows: FooterLinkHtmlRow[],
  requestLocale: string
) {
  const visibleRows = rows.filter(
    (row) =>
      row.status === 'published' &&
      (row.locale === 'all' || row.locale === requestLocale)
  );

  const friendHtml: string[] = [];
  const badgeHtml: string[] = [];

  for (const row of visibleRows) {
    const url = normalizeFooterLinkUrl(row.url);
    if (!url) continue;

    const rel = normalizeFooterLinkRel(row.rel || '');
    const commonAttributes = [
      `href="${escapeFooterLinkHtml(url)}"`,
      'target="_blank"',
      `rel="${escapeFooterLinkHtml(rel)}"`,
      `data-footer-link-id="${escapeFooterLinkHtml(row.id)}"`,
    ].join(' ');

    if (row.group === 'badge') {
      const imageUrl = row.image_url
        ? normalizeFooterLinkUrl(row.image_url)
        : null;
      if (!imageUrl) continue;

      const alt = row.alt_text?.trim() || row.title;
      badgeHtml.push(
        `<a ${commonAttributes}><img src="${escapeFooterLinkHtml(imageUrl)}" alt="${escapeFooterLinkHtml(alt)}" loading="lazy"></a>`
      );
      continue;
    }

    friendHtml.push(
      `<a ${commonAttributes}>${escapeFooterLinkHtml(row.title)}</a>`
    );
  }

  return {
    friendHtml: friendHtml.join(''),
    badgeHtml: badgeHtml.join(''),
  };
}
