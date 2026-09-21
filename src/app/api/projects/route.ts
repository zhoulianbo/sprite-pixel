import { z } from 'zod';

import { gameGenreValues } from '@/config/project';
import {
  createProject,
  ensureDefaultProject,
  listProjects,
  resolveCurrentProject,
} from '@/shared/models/project';
import { getUserInfo } from '@/shared/models/user';

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  gameGenre: z.enum(gameGenreValues),
  artStyle: z.string().trim().max(40).optional(),
});

export async function GET() {
  const user = await getUserInfo();
  if (!user) {
    return Response.json(
      { code: -1, message: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  await ensureDefaultProject(user.id);
  const [projects, currentProject] = await Promise.all([
    listProjects(user.id),
    resolveCurrentProject(user.id),
  ]);
  return Response.json({ code: 0, data: { projects, currentProject } });
}

export async function POST(request: Request) {
  const user = await getUserInfo();
  if (!user) {
    return Response.json(
      { code: -1, message: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const parsed = createProjectSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { code: -1, message: 'INVALID_PROJECT', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const created = await createProject(user.id, parsed.data);
  return Response.json({ code: 0, data: created }, { status: 201 });
}
