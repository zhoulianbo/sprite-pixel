import { PERMISSIONS } from '@/core/rbac';
import { getAdminAnimationPreview } from '@/shared/models/admin-asset';
import { getUserInfo } from '@/shared/models/user';
import { hasAllPermissions } from '@/shared/services/rbac';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clipId: string }> }
) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const user = await getUserInfo();
    if (!user) {
      return Response.json(
        { code: -1, message: 'UNAUTHORIZED' },
        { status: 401, headers }
      );
    }
    if (
      !(await hasAllPermissions(user.id, [
        PERMISSIONS.ADMIN_ACCESS,
        PERMISSIONS.AITASKS_READ,
      ]))
    ) {
      return Response.json(
        { code: -1, message: 'FORBIDDEN' },
        { status: 403, headers }
      );
    }

    const { clipId } = await params;
    const preview = await getAdminAnimationPreview(clipId);
    if (!preview) {
      return Response.json(
        { code: -1, message: 'ANIMATION_NOT_FOUND' },
        { status: 404, headers }
      );
    }
    return Response.json({ code: 0, data: preview }, { headers });
  } catch {
    return Response.json(
      { code: -1, message: 'ANIMATION_PREVIEW_FAILED' },
      { status: 500, headers }
    );
  }
}
