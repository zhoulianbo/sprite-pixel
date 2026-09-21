import { z } from 'zod';

import {
  deleteCharacterFile,
  getProjectItem,
  updateCharacterFileName,
} from '@/shared/models/asset';
import { getOwnedProject } from '@/shared/models/project';
import { getUserInfo } from '@/shared/models/user';

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

async function ownedCharacterFile(projectId: string, itemId: string) {
  const user = await getUserInfo();
  if (!user) {
    return {
      error: Response.json(
        { code: -1, message: 'UNAUTHORIZED' },
        { status: 401 }
      ),
    };
  }
  const item = await getProjectItem(projectId, itemId);
  if (
    !(await getOwnedProject(user.id, projectId)) ||
    !item ||
    item.type !== 'character'
  ) {
    return {
      error: Response.json(
        { code: -1, message: 'ASSET_NOT_FOUND' },
        { status: 404 }
      ),
    };
  }
  return {};
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ projectId: string; itemId: string; fileId: string }>;
  }
) {
  const { projectId, itemId, fileId } = await params;
  const owned = await ownedCharacterFile(projectId, itemId);
  if (owned.error) return owned.error;

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { code: -1, message: 'INVALID_ASSET' },
      { status: 400 }
    );
  }

  const updated = await updateCharacterFileName(
    projectId,
    itemId,
    fileId,
    parsed.data.name
  );
  if (!updated) {
    return Response.json(
      { code: -1, message: 'REFERENCE_NOT_FOUND' },
      { status: 404 }
    );
  }
  return Response.json({ code: 0, data: updated });
}

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ projectId: string; itemId: string; fileId: string }>;
  }
) {
  const { projectId, itemId, fileId } = await params;
  const owned = await ownedCharacterFile(projectId, itemId);
  if (owned.error) return owned.error;

  const deleted = await deleteCharacterFile(projectId, itemId, fileId);
  if (!deleted) {
    return Response.json(
      { code: -1, message: 'REFERENCE_NOT_FOUND' },
      { status: 404 }
    );
  }
  return Response.json({ code: 0, data: { deleted: true } });
}
