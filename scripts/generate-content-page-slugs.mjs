/**
 * Writes MDX marketing page slugs for the [...slug] catch-all route.
 * Runs automatically before dev/build — no manual route whitelist.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagesDir = path.join(root, 'content/pages');
const localeConfigPath = path.join(root, 'src/config/locale/index.ts');
const outDir = path.join(root, 'src/generated');
const outFile = path.join(outDir, 'content-page-slugs.json');

function readLocales() {
  const source = fs.readFileSync(localeConfigPath, 'utf8');
  const match = source.match(/export const locales = (\[[^\]]+\])/);
  if (!match) {
    throw new Error(`Could not parse locales from ${localeConfigPath}`);
  }
  return JSON.parse(match[1].replace(/'/g, '"'));
}

function contentPageFromMdxFilename(filename, locales) {
  const baseName = filename.replace(/\.mdx$/, '');
  const localesByLength = [...locales].sort((a, b) => b.length - a.length);

  for (const locale of localesByLength) {
    const suffix = `.${locale}`;
    if (baseName.endsWith(suffix)) {
      return {
        locale,
        slug: baseName.slice(0, -suffix.length),
      };
    }
  }

  return { locale: locales[0], slug: baseName };
}

function collectContentPages(locales) {
  if (!fs.existsSync(pagesDir)) {
    return { slugs: [], params: [] };
  }

  const slugs = new Set();
  const params = new Map();
  for (const file of fs.readdirSync(pagesDir)) {
    if (!file.endsWith('.mdx')) {
      continue;
    }
    const page = contentPageFromMdxFilename(file, locales);
    if (!page.slug) {
      continue;
    }
    slugs.add(page.slug);
    params.set(`${page.locale}:${page.slug}`, {
      locale: page.locale,
      slug: page.slug,
    });
  }

  const localeOrder = new Map(locales.map((locale, index) => [locale, index]));
  return {
    slugs: [...slugs].sort(),
    params: [...params.values()].sort(
      (a, b) =>
        (localeOrder.get(a.locale) ?? locales.length) -
          (localeOrder.get(b.locale) ?? locales.length) ||
        a.slug.localeCompare(b.slug)
    ),
  };
}

const locales = readLocales();
const contentPages = collectContentPages(locales);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  outFile,
  `${JSON.stringify({ params: contentPages.params }, null, 2)}\n`,
  'utf8'
);
console.log(
  `Generated ${outFile} (${contentPages.slugs.length} slugs, ${contentPages.params.length} localized pages).`
);
