import { verifyFileAccessToken } from '@/shared/lib/file-access-token';
import { findAssetFileById } from '@/shared/models/asset';
import { getStorageService } from '@/shared/services/storage';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const token = new URL(request.url).searchParams.get('token') || '';
  if (!(await verifyFileAccessToken(fileId, token)))
    return new Response(null, { status: 403 });
  const file = await findAssetFileById(fileId);
  if (!file) return new Response(null, { status: 404 });
  try {
    const storage = await getStorageService();
    const result = await storage.downloadFile({ key: file.storageKey });
    if (!result.success || !result.body)
      return new Response(null, { status: 404 });
    return new Response(result.body, {
      headers: {
        'Content-Type':
          file.mimeType || result.contentType || 'application/octet-stream',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
