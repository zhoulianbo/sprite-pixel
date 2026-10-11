import { getAnimationEditorData } from '@/shared/models/animation';
import { getUserInfo } from '@/shared/models/user';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionId: string }> }
) {
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    const user = await getUserInfo();
    if (!user) {
      return Response.json(
        { code: -1, message: 'UNAUTHORIZED' },
        { status: 401, headers }
      );
    }
    const { versionId } = await params;
    const animation = await getAnimationEditorData(user.id, versionId);
    if (!animation) {
      return Response.json(
        { code: -1, message: 'ANIMATION_NOT_FOUND' },
        { status: 404, headers }
      );
    }
    return Response.json(
      {
        code: 0,
        data: { version: animation.version, frames: animation.frames },
      },
      { headers }
    );
  } catch {
    return Response.json(
      { code: -1, message: 'ANIMATION_PREVIEW_FAILED' },
      { status: 500, headers }
    );
  }
}
