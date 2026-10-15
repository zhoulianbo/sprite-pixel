/** Publish only the pinned public model/runtime assets; never deploy the application.
 * pnpm exec tsx scripts/publish-background-model.ts --model /absolute/model.onnx [--remote-config] [--publish]
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { AwsClient } from 'aws4fetch';
import { config as loadEnv } from 'dotenv';

import { BACKGROUND_MODEL } from '../src/config/tools/background-model';

async function main() {
  for (const path of ['.env', '.env.local', '.env.development', '.dev.vars'])
    if (existsSync(path)) loadEnv({ path, quiet: true });
  const args = process.argv.slice(2);
  const modelPath = args[args.indexOf('--model') + 1];
  if (!args.includes('--model') || !modelPath)
    throw new Error('Provide --model with the downloaded IS-Net file.');
  const require = createRequire(import.meta.url);
  const dist = dirname(require.resolve('onnxruntime-web/wasm'));
  const model = readFileSync(resolve(modelPath));
  if (
    model.byteLength !== BACKGROUND_MODEL.bytes ||
    createHash('sha256').update(model).digest('hex') !== BACKGROUND_MODEL.sha256
  )
    throw new Error('Model checksum mismatch.');
  const entries = [
    {
      key: BACKGROUND_MODEL.key,
      body: model,
      type: 'application/octet-stream',
    },
    ...Object.entries(BACKGROUND_MODEL.runtimeFiles).map(
      ([name, integrity]) => {
        const body = readFileSync(resolve(dist, name));
        if (
          body.length !== integrity.bytes ||
          createHash('sha256').update(body).digest('hex') !== integrity.sha256
        )
          throw new Error('Runtime checksum mismatch.');
        return {
          key: `${BACKGROUND_MODEL.runtimePrefix}${name}`,
          body,
          type: name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript',
        };
      }
    ),
  ];
  console.log(
    JSON.stringify(
      {
        assets: entries.map((file) => ({
          key: file.key,
          bytes: file.body.length,
          sha256: createHash('sha256').update(file.body).digest('hex'),
        })),
        publish: args.includes('--publish'),
      },
      null,
      2
    )
  );
  if (!args.includes('--publish')) return;
  let configs: Record<string, string> = {};
  if (args.includes('--remote-config')) {
    // Capture output in memory: credentials must never reach terminal output or disk.
    const output = execFileSync(
      'pnpm',
      [
        'exec',
        'wrangler',
        'd1',
        'execute',
        'DB',
        '--remote',
        '--command',
        "SELECT name,value FROM config WHERE name LIKE 'r2_%'",
        '--json',
      ],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 2 * 1024 * 1024,
      }
    );
    const parsed = JSON.parse(output.slice(output.indexOf('[')));
    for (const result of parsed)
      for (const row of result.results || []) configs[row.name] = row.value;
  }
  const get = (name: string) =>
    process.env[name.toUpperCase()] || process.env[name] || configs[name];
  const account = get('r2_account_id'),
    bucket = get('r2_bucket_name');
  const endpoint =
    get('r2_endpoint') || `https://${account}.r2.cloudflarestorage.com`;
  const accessKeyId = get('r2_access_key'),
    secretAccessKey = get('r2_secret_key');
  if (!bucket || !accessKeyId || !secretAccessKey)
    throw new Error('R2 credentials are unavailable.');
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    region: 'auto',
    service: 's3',
  });
  for (const file of entries) {
    const url = `${endpoint.replace(/\/$/, '')}/${bucket}/${file.key}`;
    const existing = await client.fetch(url, { method: 'HEAD' });
    if (existing.ok) {
      if (Number(existing.headers.get('content-length')) !== file.body.length)
        throw new Error(
          'Existing model asset size differs; refusing to overwrite.'
        );
      console.log(`Already published: ${file.key}`);
      continue;
    }
    if (existing.status !== 404)
      throw new Error(`R2 inspection failed (${existing.status}).`);
    const response = await client.fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'If-None-Match': '*',
      },
      body: file.body,
    });
    if (!response.ok)
      throw new Error(`R2 publish failed (${response.status}).`);
    console.log(`Published: ${file.key}`);
  }
  const domain = get('r2_domain');
  if (domain) {
    for (const file of entries) {
      const url = `${domain.replace(/\/$/, '')}/${file.key}`;
      const response = await fetch(url, {
        method: 'HEAD',
        headers: { Origin: 'https://spritepixel.com' },
      });
      console.log(
        JSON.stringify({
          key: file.key,
          publicStatus: response.status,
          cors: response.headers.get('access-control-allow-origin'),
          bytes: response.headers.get('content-length'),
        })
      );
    }
  }
}
main().catch(() => {
  console.error(
    'Model resource publishing failed. Check credentials, network access, and R2 configuration; no secret values were logged.'
  );
  process.exitCode = 1;
});
