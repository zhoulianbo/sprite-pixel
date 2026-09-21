import { getOwnedAssetFile } from '@/shared/models/asset';
import { getUserInfo } from '@/shared/models/user';
import { getStorageService } from '@/shared/services/storage';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const user = await getUserInfo();
  if (!user) return new Response(null, { status: 401 });
  const { fileId } = await params;
  const file = await getOwnedAssetFile(user.id, fileId);
  if (!file) return new Response(null, { status: 404 });

  let result;
  try {
    const storage = await getStorageService();
    result = await storage.downloadFile({ key: file.storageKey });
  } catch {
    return new Response(null, { status: 503 });
  }
  if (!result.success || !result.body)
    return new Response(null, { status: 404 });

  const download = new URL(request.url).searchParams.get('download') === '1';
  const safeName = (file.originalFilename || `${file.id}.png`).replace(
    /["\r\n]/g,
    ''
  );
  const headers = new Headers({
    'Content-Type':
      file.mimeType || result.contentType || 'application/octet-stream',
    'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${safeName}"`,
    'Cache-Control': 'private, max-age=300',
    'X-Content-Type-Options': 'nosniff',
  });
  if (result.contentLength) headers.set('Content-Length', result.contentLength);
  return new Response(result.body, { headers });
}
