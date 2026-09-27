import { getCloudflareContext } from '@opennextjs/cloudflare';

export type SpriteMediaResult = {
  spritesheet: {
    key: string;
    url: string;
    content_type: string;
    file_size_bytes: number;
    width: number;
    height: number;
  };
  manifest: { key: string; url: string };
  frame_count: number;
  columns: number;
  rows: number;
  frame_size: number;
  fps: number;
};

type MediaProcessorEnv = {
  SPRITE_MEDIA_PROCESSOR_URL?: string;
  SPRITE_MEDIA_PROCESSOR_SECRET?: string;
};

function processorConfig() {
  let env: MediaProcessorEnv = {};
  try {
    env =
      (getCloudflareContext() as { env?: MediaProcessorEnv }).env ||
      ({} as MediaProcessorEnv);
  } catch {
    env = {};
  }
  const baseUrl = (
    env.SPRITE_MEDIA_PROCESSOR_URL ||
    process.env.SPRITE_MEDIA_PROCESSOR_URL ||
    ''
  ).replace(/\/+$/, '');
  const secret =
    env.SPRITE_MEDIA_PROCESSOR_SECRET ||
    process.env.SPRITE_MEDIA_PROCESSOR_SECRET ||
    '';
  if (!baseUrl || !secret) throw new Error('MEDIA_PROCESSOR_NOT_CONFIGURED');
  return { baseUrl, secret };
}

async function hmacHex(secret: string, message: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  );
  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

export async function processSpriteVideo(input: {
  generationId: string;
  generationTaskId: string;
  sourceVideoUrl: string;
  outputPrefix: string;
  frameCount: number;
  frameSize: number;
  fps: number;
  loop: boolean;
  action: string;
  direction: string;
}) {
  const { baseUrl, secret } = processorConfig();
  const path = '/api/sprite/process';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await hmacHex(secret, `POST\n${path}\n${timestamp}`);
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'X-Request-ID': input.generationTaskId,
    },
    body: JSON.stringify({
      generation_id: input.generationId,
      generation_task_id: input.generationTaskId,
      source_video_url: input.sourceVideoUrl,
      output_prefix: input.outputPrefix,
      frame_count: input.frameCount,
      frame_size: input.frameSize,
      fps: input.fps,
      loop: input.loop,
      action: input.action,
      direction: input.direction,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    data?: SpriteMediaResult;
    detail?: string;
    error_code?: string;
  };
  if (!response.ok || !payload.success || !payload.data) {
    const reason =
      payload.error_code ||
      payload.detail ||
      `MEDIA_PROCESSOR_HTTP_${response.status}`;
    console.error(
      JSON.stringify({
        event: 'sprite_media_processor_failed',
        generationId: input.generationId,
        generationTaskId: input.generationTaskId,
        status: response.status,
        reason,
      })
    );
    throw new Error(reason);
  }
  return payload.data;
}
