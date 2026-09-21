import { envConfigs } from '@/config';

const encoder = new TextEncoder();

function base64Url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function sign(value: string) {
  if (!envConfigs.auth_secret) throw new Error('AUTH_SECRET_NOT_CONFIGURED');
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(envConfigs.auth_secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return base64Url(
    new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))
  );
}

export async function createFileAccessToken(fileId: string, ttlSeconds = 600) {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const value = `${fileId}.${expires}`;
  return `${expires}.${await sign(value)}`;
}

export async function verifyFileAccessToken(fileId: string, token: string) {
  const [rawExpires, signature] = token.split('.');
  const expires = Number(rawExpires);
  if (!signature || !Number.isFinite(expires) || expires < Date.now() / 1000)
    return false;
  const expected = await sign(`${fileId}.${expires}`);
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index++) {
    mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  return mismatch === 0;
}
