import { toggleGalleryLike } from '@/shared/models/gallery';
import { getUserInfo } from '@/shared/models/user';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ galleryId: string }> }
) {
  const user = await getUserInfo();
  if (!user) {
    return Response.json(
      { code: -1, message: 'UNAUTHORIZED' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  const { galleryId } = await params;
  const result = await toggleGalleryLike(galleryId, user.id);
  if (!result) {
    return Response.json(
      { code: -1, message: 'GALLERY_ITEM_NOT_FOUND' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  return Response.json(
    { code: 0, data: result },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
