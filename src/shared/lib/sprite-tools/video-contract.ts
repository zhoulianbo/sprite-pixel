import { z } from 'zod';

import { FRAME_SIZES, VIDEO_LIMIT } from '@/config/tools/free-tools';

export const videoUploadSchema = z
  .object({
    filename: z.string().min(1).max(255),
    contentType: z.enum(['video/mp4', 'video/webm', 'video/quicktime']),
    size: z.number().int().positive().max(VIDEO_LIMIT),
  })
  .strict();
export const videoOptionsSchema = z
  .object({
    frame_count: z.number().int().min(2).max(32),
    frame_size: z
      .number()
      .refine((n) => FRAME_SIZES.some((size) => size === n)),
    fps: z.number().int().min(1).max(60),
    loop: z.boolean(),
  })
  .strict();
export const videoProcessSchema = z
  .object({
    token: z.string().min(1).max(2048),
    options: videoOptionsSchema,
  })
  .strict();

// Check the container signature, not a filename or client-provided MIME alone.
export function videoMime(bytes: Uint8Array) {
  const ascii = (a: number, b: number) =>
    String.fromCharCode(...bytes.subarray(a, b));
  if (bytes.length >= 12 && ascii(4, 8) === 'ftyp') {
    const brands = ascii(8, Math.min(bytes.length, 64));
    if (/avif|avis|heic|heix|mif1/.test(brands))
      throw new Error('INVALID_VIDEO');
    return brands.includes('qt  ') ? 'video/quicktime' : 'video/mp4';
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3 &&
    ascii(4, bytes.length).includes('webm')
  )
    return 'video/webm';
  throw new Error('INVALID_VIDEO');
}
export async function videoTaskId(
  uploadId: string,
  options: z.infer<typeof videoOptionsSchema>
) {
  const value = `${uploadId}:${options.frame_count}:${options.frame_size}:${options.fps}:${options.loop}`;
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  );
  // The processor stores this id as the R2 object name.
  return Array.from(new Uint8Array(digest).subarray(0, 8), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
}
export async function videoSheetKey(
  storageKey: string,
  options: z.infer<typeof videoOptionsSchema>
) {
  const slash = storageKey.lastIndexOf('/');
  const file = storageKey.slice(slash + 1);
  const uploadId = file.slice(0, file.lastIndexOf('.'));
  const taskId = await videoTaskId(uploadId, options);
  return `${storageKey.slice(0, slash)}/${taskId}.png`;
}

const credentialSchema = z
  .object({
    id: z.string().uuid(),
    key: z
      .string()
      .regex(/^uploads\/\d{4}-(0[1-9]|1[0-2])\/[\da-f-]+\.(mp4|webm|mov)$/),
    size: z.number().int().positive().max(VIDEO_LIMIT),
    contentType: videoUploadSchema.shape.contentType,
    expires: z.number().int(),
  })
  .strict();
export type VideoCredential = z.infer<typeof credentialSchema>;
const bytesToBase64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const fromBase64 = (text: string) =>
  Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
    c.charCodeAt(0)
  );
async function tokenKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}
export async function signVideoCredential(
  value: VideoCredential,
  secret: string
) {
  const body = bytesToBase64(
    new TextEncoder().encode(JSON.stringify(credentialSchema.parse(value)))
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    await tokenKey(secret),
    new TextEncoder().encode(`free-video-v1:${body}`)
  );
  return `${body}.${bytesToBase64(new Uint8Array(signature))}`;
}
export async function verifyVideoCredential(
  token: string,
  secret: string,
  now = Date.now()
) {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) throw new Error();
    const [body, signature] = parts;
    if (
      !(await crypto.subtle.verify(
        'HMAC',
        await tokenKey(secret),
        fromBase64(signature),
        new TextEncoder().encode(`free-video-v1:${body}`)
      ))
    )
      throw new Error();
    const value = credentialSchema.parse(
      JSON.parse(new TextDecoder().decode(fromBase64(body)))
    );
    if (
      value.key.split('/').pop()?.split('.')[0] !== value.id ||
      value.expires <= now
    )
      throw new Error();
    return value;
  } catch {
    throw new Error('UPLOAD_EXPIRED');
  }
}
