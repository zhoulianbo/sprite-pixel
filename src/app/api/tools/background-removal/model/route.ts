import { BACKGROUND_MODEL } from '@/config/tools/background-model';
import { getStorageService } from '@/shared/services/storage';

export async function GET() {
  try {
    const storage = await getStorageService();
    const modelUrl = storage.getPublicUrl({ key: BACKGROUND_MODEL.key });
    const runtimeUrl = storage
      .getPublicUrl({
        key: `${BACKGROUND_MODEL.runtimePrefix}ort-wasm-simd-threaded.wasm`,
      })
      ?.replace(/[^/]+$/, '');
    if (!modelUrl || !runtimeUrl) throw new Error('MODEL_UNAVAILABLE');
    return Response.json(
      {
        modelUrl,
        runtimeUrl,
        bytes: BACKGROUND_MODEL.bytes,
        sha256: BACKGROUND_MODEL.sha256,
      },
      { headers: { 'Cache-Control': 'public, max-age=3600' } }
    );
  } catch {
    return Response.json(
      { message: 'MODEL_DOWNLOAD_FAILED' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
