import { defaultPixelRepairOptions } from '@/shared/lib/pixel-repair';
import { MAX_UPLOAD_BYTES } from '@/shared/lib/storage-paths';
import { getUserInfo } from '@/shared/models/user';
import {
  CharacterImageError,
  readCharacterImage,
  resolveCharacterImage,
  saveCharacterImageRepair,
} from '@/shared/services/character-image-repair';

function failure(error: unknown) {
  const known = error instanceof CharacterImageError;
  return Response.json(
    { code: -1, message: known ? error.code : 'IMAGE_SAVE_FAILED' },
    { status: known ? error.status : 500 }
  );
}
export async function GET(request: Request) {
  const user = await getUserInfo();
  if (!user) return new Response(null, { status: 401 });
  const query = new URL(request.url).searchParams;
  const target = {
    fileId: query.get('fileId') || undefined,
    generationId: query.get('generationId') || undefined,
  };
  try {
    if (query.get('info') === '1') {
      const source = await resolveCharacterImage(user.id, target);
      const metadata = source.file
        ? JSON.parse(source.file.metadataJson || '{}')
        : {};
      return Response.json(
        {
          code: 0,
          data: {
            style: source.style,
            revision: source.revision,
            repairOptions: defaultPixelRepairOptions,
            cleanupPending: Boolean(
              metadata.pixelRepairCleanup?.length ||
              metadata.pixelRepairSyncPending
            ),
          },
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
    const { source, body, mime } = await readCharacterImage(user.id, target);
    return new Response(body, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'no-store',
        'X-Image-Revision': source.revision,
        'Content-Disposition': `${query.get('download') === '1' ? 'attachment' : 'inline'}; filename="character.png"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  const user = await getUserInfo();
  if (!user) return new Response(null, { status: 401 });
  if (Number(request.headers.get('content-length')) > MAX_UPLOAD_BYTES + 65536)
    return failure(new CharacterImageError('INVALID_IMAGE', 413));
  try {
    const form = await request.formData();
    const target = {
      fileId: String(form.get('fileId') || '') || undefined,
      generationId: String(form.get('generationId') || '') || undefined,
    };
    const revision = String(form.get('revision') || '');
    const cleanupOnly = form.get('action') === 'cleanup';
    const image = form.get('image');
    if (
      !revision ||
      (!cleanupOnly &&
        (!(image instanceof File) ||
          image.type !== 'image/png' ||
          image.size > MAX_UPLOAD_BYTES))
    )
      throw new CharacterImageError('INVALID_IMAGE');
    const data = await saveCharacterImageRepair(
      user.id,
      target,
      revision,
      cleanupOnly ? undefined : await (image as File).arrayBuffer()
    );
    return Response.json(
      { code: 0, data },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return failure(error);
  }
}
