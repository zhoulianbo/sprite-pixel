import { z } from 'zod';

import { createCharacterFromUploadedFile } from '@/shared/models/asset';
import { getOwnedProject } from '@/shared/models/project';
import { getUserInfo } from '@/shared/models/user';
import { getAssetPublicUrlResolver } from '@/shared/services/storage';

const createSchema = z.object({
  fileId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getUserInfo();
  if (!user) {
    return Response.json(
      { code: -1, message: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }
  const { projectId } = await params;
  if (!(await getOwnedProject(user.id, projectId))) {
    return Response.json(
      { code: -1, message: 'PROJECT_NOT_FOUND' },
      { status: 404 }
    );
  }
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { code: -1, message: 'INVALID_ASSET' },
      { status: 400 }
    );
  }
  const created = await createCharacterFromUploadedFile(
    projectId,
    parsed.data.fileId,
    parsed.data.name
  );
  if (!created) {
    return Response.json(
      { code: -1, message: 'INVALID_ASSET' },
      { status: 400 }
    );
  }
  const urlFor = await getAssetPublicUrlResolver();
  return Response.json(
    {
      code: 0,
      data: {
        item: created.item,
        file: {
          ...created.file,
          url: urlFor(created.file.storageKey),
        },
      },
    },
    { status: 201 }
  );
}
