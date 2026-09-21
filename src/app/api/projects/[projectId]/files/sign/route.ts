import { getOwnedProject } from '@/shared/models/project';
import { getUserInfo } from '@/shared/models/user';
import {
  createSignedUserUpload,
  ProjectFileUploadError,
  signUploadSchema,
} from '@/shared/services/project-file-upload';

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

  const parsed = signUploadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { code: -1, message: 'INVALID_UPLOAD' },
      { status: 400 }
    );
  }

  try {
    const signed = await createSignedUserUpload(projectId, parsed.data);
    return Response.json({ code: 0, data: signed }, { status: 201 });
  } catch (error) {
    if (error instanceof ProjectFileUploadError) {
      return Response.json(
        { code: -1, message: error.message },
        { status: error.status }
      );
    }
    return Response.json(
      { code: -1, message: 'STORAGE_NOT_CONFIGURED' },
      { status: 503 }
    );
  }
}
