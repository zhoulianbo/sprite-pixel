import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { gameGenreValues } from '@/config/project';
import {
  deleteProject,
  ensureDefaultProject,
  LAST_PROJECT_COOKIE,
  listProjects,
  updateProject,
} from '@/shared/models/project';
import { getUserInfo } from '@/shared/models/user';

const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  gameGenre: z.enum(gameGenreValues),
  artStyle: z.string().trim().max(40).optional(),
});

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
};

export async function PATCH(
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

  const parsed = updateProjectSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { code: -1, message: 'INVALID_PROJECT', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { projectId } = await params;
  const updated = await updateProject(user.id, projectId, parsed.data);
  if (!updated) {
    return Response.json(
      { code: -1, message: 'PROJECT_NOT_FOUND' },
      { status: 404 }
    );
  }

  return Response.json({ code: 0, data: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getUserInfo();
  if (!user) {
    return NextResponse.json(
      { code: -1, message: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const { projectId } = await params;
  const deleted = await deleteProject(user.id, projectId);
  if (!deleted) {
    return NextResponse.json(
      { code: -1, message: 'PROJECT_NOT_FOUND' },
      { status: 404 }
    );
  }

  const remaining = await listProjects(user.id);
  const nextCurrent = remaining[0] || (await ensureDefaultProject(user.id));
  const response = NextResponse.json({ code: 0, data: { deleted: true } });
  if (request.cookies.get(LAST_PROJECT_COOKIE)?.value === projectId) {
    response.cookies.set(LAST_PROJECT_COOKIE, nextCurrent.id, cookieOptions);
  }
  return response;
}
