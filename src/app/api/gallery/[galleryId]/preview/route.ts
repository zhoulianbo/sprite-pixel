import { getGalleryAnimationPreview } from '@/shared/models/gallery';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ galleryId: string }> }
) {
  const { galleryId } = await params;
  const preview = await getGalleryAnimationPreview(galleryId);
  if (!preview) {
    return Response.json(
      { code: -1, message: 'GALLERY_ITEM_NOT_FOUND' },
      { status: 404 }
    );
  }
  return Response.json(
    { code: 0, data: preview },
    {
      headers: {
        'Cache-Control':
          'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  );
}
