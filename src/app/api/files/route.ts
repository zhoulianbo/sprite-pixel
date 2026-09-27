import { parseProjectFileKind } from '@/shared/lib/asset-file-kind';
import { listOwnedReadyImages } from '@/shared/models/asset';
import { getUserInfo } from '@/shared/models/user';

export async function GET(request: Request) {
  const user = await getUserInfo();
  if (!user) {
    return Response.json(
      { code: -1, message: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const kind = parseProjectFileKind(
    new URL(request.url).searchParams.get('kind')
  );
  if (!kind) {
    return Response.json(
      { code: -1, message: 'INVALID_ASSET' },
      { status: 400 }
    );
  }

  const files = await listOwnedReadyImages(user.id, { kind });
  return Response.json({ code: 0, data: { files } });
}
