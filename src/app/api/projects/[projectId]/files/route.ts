import { parseProjectFileKind } from '@/shared/lib/asset-file-kind';
import { listOwnedProjectReadyImages } from '@/shared/models/asset';
import { getOwnedProject } from '@/shared/models/project';
import { getUserInfo } from '@/shared/models/user';
import {
  completeSignedUserUpload,
  completeUploadSchema,
  ProjectFileUploadError,
} from '@/shared/services/project-file-upload';
import { getAssetPublicUrlResolver } from '@/shared/services/storage';

export async function GET(
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

  const kind = parseProjectFileKind(
    new URL(request.url).searchParams.get('kind')
  );
  const files = await listOwnedProjectReadyImages(user.id, projectId, kind);
  return Response.json({ code: 0, data: { files } });
}

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

  const parsed = completeUploadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { code: -1, message: 'INVALID_UPLOAD' },
      { status: 400 }
    );
  }

  try {
    const saved = await completeSignedUserUpload(projectId, parsed.data.fileId);
    const urlFor = await getAssetPublicUrlResolver();
    return Response.json(
      {
        code: 0,
        data: { ...saved, url: urlFor(saved.storageKey) },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ProjectFileUploadError) {
      return Response.json(
        { code: -1, message: error.message },
        { status: error.status }
      );
    }
    return Response.json(
      { code: -1, message: 'STORAGE_UPLOAD_FAILED' },
      { status: 400 }
    );
  }
}
