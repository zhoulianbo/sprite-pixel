/**
 * Verifies that every generated content-page route is present in both the
 * Next.js prerender manifest and the OpenNext incremental cache.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generatedPath = path.join(root, 'src/generated/content-page-slugs.json');
const prerenderManifestPath = path.join(root, '.next/prerender-manifest.json');
const buildIdPath = path.join(root, '.next/BUILD_ID');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

for (const file of [generatedPath, prerenderManifestPath, buildIdPath]) {
  if (!fs.existsSync(file)) {
    throw new Error(`Required build artifact is missing: ${file}`);
  }
}

const generated = readJson(generatedPath);
const prerenderManifest = readJson(prerenderManifestPath);
const buildId = fs.readFileSync(buildIdPath, 'utf8').trim();
const params = Array.isArray(generated.params) ? generated.params : [];
const errors = [];

if (!params.length) {
  errors.push('No localized content-page parameters were generated.');
}

if (
  prerenderManifest.dynamicRoutes?.['/[locale]/[...slug]']?.fallback !== false
) {
  errors.push('The content-page catch-all route does not have fallback=false.');
}

for (const param of params) {
  const slug = typeof param.slug === 'string' ? param.slug : '';
  const route = `/${param.locale}/${slug}`;
  if (!param.locale || !slug) {
    errors.push(
      `Invalid generated content-page parameter: ${JSON.stringify(param)}`
    );
    continue;
  }
  if (!prerenderManifest.routes?.[route]) {
    errors.push(`Missing prerendered route: ${route}`);
  }

  const cacheFile = path.join(
    root,
    '.open-next/cache',
    buildId,
    param.locale,
    `${slug}.cache`
  );
  if (!fs.existsSync(cacheFile)) {
    errors.push(`Missing OpenNext cache entry: ${route}`);
    continue;
  }

  const cacheEntry = readJson(cacheFile);
  if (
    typeof cacheEntry.html !== 'string' ||
    cacheEntry.html.includes(
      '<title>404: This page could not be found.</title>'
    )
  ) {
    errors.push(`Invalid OpenNext cache entry: ${route}`);
  }
}

if (errors.length) {
  throw new Error(
    `Content-page build verification failed:\n- ${errors.join('\n- ')}`
  );
}

console.log(
  `Verified ${params.length} localized content pages in Next.js and OpenNext build artifacts.`
);
