import { z } from 'zod';

import {
  deleteCharacterItem,
  getProjectItem,
  updateCharacterItem,
} from '@/shared/models/asset';
import { getOwnedProject } from '@/shared/models/project';
import { getUserInfo } from '@/shared/models/user';

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

async function ownedCharacter(projectId: string, itemId: string) {
  const user = await getUserInfo();
  if (!user) {
    return {
      error: Response.json(
        { code: -1, message: 'UNAUTHORIZED' },
        { status: 401 }
      ),
    };
  }
  if (!(await getOwnedProject(user.id, projectId))) {
    return {
      error: Response.json(
        { code: -1, message: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      ),
    };
  }
  const item = await getProjectItem(projectId, itemId);
  if (!item || item.type !== 'character') {
    return {
      error: Response.json(
        { code: -1, message: 'ASSET_NOT_FOUND' },
        { status: 404 }
      ),
    };
  }
  return { item };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; itemId: string }> }
) {
  const { projectId, itemId } = await params;
  const owned = await ownedCharacter(projectId, itemId);
  if (owned.error) return owned.error;

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { code: -1, message: 'INVALID_ASSET' },
      { status: 400 }
    );
  }

  const updated = await updateCharacterItem(projectId, itemId, parsed.data);
  if (!updated) {
    return Response.json(
      { code: -1, message: 'ASSET_NOT_FOUND' },
      { status: 404 }
    );
  }
  return Response.json({ code: 0, data: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; itemId: string }> }
) {
  const { projectId, itemId } = await params;
  const owned = await ownedCharacter(projectId, itemId);
  if (owned.error) return owned.error;

  const deleted = await deleteCharacterItem(projectId, itemId);
  if (!deleted) {
    return Response.json(
      { code: -1, message: 'ASSET_NOT_FOUND' },
      { status: 404 }
    );
  }
  return Response.json({ code: 0, data: { deleted: true } });
}
