import { incrementGalleryDownload } from '@/shared/models/gallery';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ galleryId: string }> }
) {
  const { galleryId } = await params;
  const result = await incrementGalleryDownload(galleryId);
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
