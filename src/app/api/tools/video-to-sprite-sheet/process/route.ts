import { videoProcessSchema } from '@/shared/lib/sprite-tools/video-contract';
import {
  processFreeVideo,
  toolError,
  videoRateLimit,
} from '@/shared/services/free-video-tool';

export async function POST(request: Request) {
  const limited = videoRateLimit(request);
  if (limited) return limited;
  const parsed = videoProcessSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success)
    return Response.json(
      { code: -1, message: 'INVALID_PARAMETERS' },
      { status: 400 }
    );
  try {
    const data = await processFreeVideo(parsed.data.token, parsed.data.options);
    return Response.json(
      { code: 0, data },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return toolError(error);
  }
}
