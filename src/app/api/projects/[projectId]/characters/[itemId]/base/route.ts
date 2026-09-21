import { z } from 'zod';

import { getProjectItem, setActiveBaseReference } from '@/shared/models/asset';
import { getOwnedProject } from '@/shared/models/project';
import { getUserInfo } from '@/shared/models/user';

const schema = z.object({
  fileId: z.string().uuid(),
  variantId: z.string().uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; itemId: string }> }
) {
  const user = await getUserInfo();
  if (!user) {
    return Response.json(
      { code: -1, message: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }
  const { projectId, itemId } = await params;
  if (
    !(await getOwnedProject(user.id, projectId)) ||
    !(await getProjectItem(projectId, itemId))
  ) {
    return Response.json(
      { code: -1, message: 'ASSET_NOT_FOUND' },
      { status: 404 }
    );
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { code: -1, message: 'INVALID_REFERENCE' },
      { status: 400 }
    );
  }
  const result = await setActiveBaseReference(
    projectId,
    itemId,
    parsed.data.variantId,
    parsed.data.fileId
  );
  if (!result) {
    return Response.json(
      { code: -1, message: 'REFERENCE_NOT_FOUND' },
      { status: 404 }
    );
  }
  return Response.json({ code: 0, data: result });
}
