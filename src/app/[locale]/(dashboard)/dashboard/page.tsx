import { Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { hasPlanEntitlement } from '@/config/plans';
import { gameGenreValues } from '@/config/project';
import { DailyCheckIn } from '@/shared/blocks/check-in/daily-check-in';
import { Header, Main } from '@/shared/blocks/dashboard';
import { ProjectCard } from '@/shared/blocks/projects/project-card';
import { ProjectCreateDialog } from '@/shared/blocks/projects/project-create-dialog';
import { Button } from '@/shared/components/ui/button';
import { getDailyCheckInStatus } from '@/shared/models/check-in';
import {
  ensureDefaultProject,
  isSystemDefaultProject,
  listProjects,
} from '@/shared/models/project';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/models/user';

function genreLabel(
  genre: string,
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  if (!genre) return '';
  const key = `createProject.genres.${genre}`;
  if ((gameGenreValues as readonly string[]).includes(genre) && t.has(key)) {
    return t(key);
  }
  return genre.replaceAll('_', ' ');
}

function styleLabel(
  style: string,
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  if (!style) return '';
  const key = `options.style.${style.replaceAll('_', '-')}`;
  return t.has(key) ? t(key) : style.replaceAll('_', ' ');
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('workspace');
  const tg = await getTranslations('generation');
  const user = await getUserInfo();
  if (!user) {
    return (
      <>
        <Header accessory={<DailyCheckIn initialStatus={null} />} />
        <Main>
          <div className="mx-auto flex min-h-[50vh] max-w-lg items-center justify-center text-center">
            <p className="text-muted-foreground">{t('projects.empty')}</p>
          </div>
        </Main>
      </>
    );
  }
  await ensureDefaultProject(user.id);
  const [projects, subscription, checkIn] = await Promise.all([
    listProjects(user.id),
    getCurrentSubscription(user.id),
    getDailyCheckInStatus(user.id),
  ]);
  const canCheckIn = hasPlanEntitlement(
    subscription?.productId,
    'dailyFreeCredits'
  );

  return (
    <>
      <Header
        accessory={<DailyCheckIn initialStatus={canCheckIn ? checkIn : null} />}
      />
      <Main>
        <div className="w-full space-y-8">
          <header className="flex flex-col justify-between gap-5 border-b pb-7 sm:flex-row sm:items-end">
            <div className="max-w-2xl space-y-2">
              <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                {t('projects.title')}
              </h1>
            </div>
            <ProjectCreateDialog
              activeProjectCount={projects.length}
              planProductId={subscription?.productId ?? null}
              trigger={
                <Button className="h-10">
                  <Sparkles className="size-4" />
                  {t('projects.new')}
                </Button>
              }
            />
          </header>

          <section className="grid w-full max-w-[90rem] grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {projects.map(
              (project: {
                id: string;
                name: string;
                description: string | null;
                gameGenre: string;
                artStyle: string;
                settingsJson: string;
                updatedAt: string;
                assetCount: number;
              }) => {
                const title =
                  isSystemDefaultProject(project) &&
                  project.name === 'Default Project'
                    ? t('projects.default')
                    : project.name;
                const updated = new Intl.DateTimeFormat(locale, {
                  dateStyle: 'medium',
                }).format(new Date(project.updatedAt));
                return (
                  <ProjectCard
                    key={project.id}
                    project={{
                      id: project.id,
                      name: project.name,
                      description: project.description,
                      settingsJson: project.settingsJson,
                      gameGenre: project.gameGenre,
                      artStyle: project.artStyle,
                    }}
                    title={title}
                    genre={genreLabel(project.gameGenre, t)}
                    style={styleLabel(project.artStyle, tg)}
                    assetsLabel={t('projects.assets', {
                      count: project.assetCount,
                    })}
                    updatedLabel={t('projects.updated', { date: updated })}
                    genreLabel={t('createProject.gameGenre')}
                    styleLabel={t('createProject.style')}
                  />
                );
              }
            )}
          </section>
        </div>
      </Main>
    </>
  );
}
