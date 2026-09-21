import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getOwnedProject, LAST_PROJECT_COOKIE } from '@/shared/models/project';
import { getUserInfo } from '@/shared/models/user';

const selectProjectSchema = z.object({ projectId: z.string().uuid() });

export async function POST(request: Request) {
  const user = await getUserInfo();
  if (!user) {
    return NextResponse.json(
      { code: -1, message: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const parsed = selectProjectSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { code: -1, message: 'INVALID_PROJECT' },
      { status: 400 }
    );
  }

  const selected = await getOwnedProject(user.id, parsed.data.projectId);
  if (!selected) {
    return NextResponse.json(
      { code: -1, message: 'PROJECT_NOT_FOUND' },
      { status: 404 }
    );
  }

  const response = NextResponse.json({ code: 0, data: selected });
  response.cookies.set(LAST_PROJECT_COOKIE, selected.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
