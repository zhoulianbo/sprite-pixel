import { z } from 'zod';

import { PERMISSIONS } from '@/core/rbac';
import { setGalleryPublished } from '@/shared/models/gallery';
import { getUserInfo } from '@/shared/models/user';
import { hasAllPermissions } from '@/shared/services/rbac';

const requestSchema = z.object({
  kind: z.enum(['character', 'animation']),
  sourceId: z.string().uuid(),
  published: z.boolean(),
});

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
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
      PERMISSIONS.AITASKS_WRITE,
    ]))
  ) {
    return Response.json(
      { code: -1, message: 'FORBIDDEN' },
      { status: 403, headers }
    );
  }
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { code: -1, message: 'INVALID_GALLERY_ITEM' },
      { status: 400, headers }
    );
  }
  const result = await setGalleryPublished(parsed.data);
  if (!result) {
    return Response.json(
      { code: -1, message: 'GALLERY_ITEM_NOT_ELIGIBLE' },
      { status: 409, headers }
    );
  }
  return Response.json({ code: 0, data: result }, { headers });
}
