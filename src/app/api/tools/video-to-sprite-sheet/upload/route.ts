import {
  signVideoCredential,
  videoUploadSchema,
} from '@/shared/lib/sprite-tools/video-contract';
import { userUploadStorageKey } from '@/shared/lib/storage-paths';
import { toolError, videoRateLimit } from '@/shared/services/free-video-tool';
import { processorConfig } from '@/shared/services/sprite-media-processor';
import { getStorageService } from '@/shared/services/storage';

export async function POST(request: Request) {
  const limited = videoRateLimit(request);
  if (limited) return limited;
  const parsed = videoUploadSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success)
    return Response.json(
      { code: -1, message: 'INVALID_VIDEO' },
      { status: 400 }
    );
  try {
    const { secret } = processorConfig();
    const input = parsed.data;
    const id = crypto.randomUUID();
    const extension = {
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
    }[input.contentType];
    const key = userUploadStorageKey(id, extension);
    const token = await signVideoCredential(
      {
        id,
        key,
        size: input.size,
        contentType: input.contentType,
        expires: Date.now() + 3_600_000,
      },
      secret
    );
    const signed = await (
      await getStorageService()
    ).createSignedUploadUrl({
      key,
      contentType: input.contentType,
      expiresIn: 300,
      createOnly: true,
    });
    return Response.json(
      { code: 0, data: { ...signed, token } },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return toolError(error);
  }
}
