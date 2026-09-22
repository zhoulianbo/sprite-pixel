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

function slugFromMdxFilename(filename, locales) {
  const baseName = filename.replace(/\.mdx$/, '');
  const localesByLength = [...locales].sort((a, b) => b.length - a.length);

  for (const locale of localesByLength) {
    const suffix = `.${locale}`;
    if (baseName.endsWith(suffix)) {
      return baseName.slice(0, -suffix.length);
    }
  }

  return baseName;
}

function collectMdxSlugs(locales) {
  if (!fs.existsSync(pagesDir)) {
    return [];
  }

  const slugs = new Set();
  for (const file of fs.readdirSync(pagesDir)) {
    if (!file.endsWith('.mdx')) {
      continue;
    }
    const slug = slugFromMdxFilename(file, locales);
    if (!slug) {
      continue;
    }
    slugs.add(slug);
  }

  return [...slugs].sort();
}

const locales = readLocales();
const slugs = collectMdxSlugs(locales);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  outFile,
  `${JSON.stringify({ slugs }, null, 2)}\n`,
  'utf8',
);
console.log(`Generated ${outFile} (${slugs.length} slugs).`);
