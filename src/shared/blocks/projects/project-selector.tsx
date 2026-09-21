'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Folder, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';
import { useAppContext } from '@/shared/contexts/app';

import { ProjectCreateDialog, ProjectSummary } from './project-create-dialog';

type ProjectListCache = {
  userId: string;
  projects: ProjectSummary[];
  currentProjectId?: string;
};

let projectListCache: ProjectListCache | null = null;
let projectListInflight: Promise<ProjectListCache> | null = null;

function rememberProjectList(list: ProjectListCache) {
  projectListCache = list;
  return list;
}

export async function prefetchProjectList(userId: string) {
  if (projectListCache?.userId === userId) return projectListCache;
  if (projectListInflight) return projectListInflight;
  projectListInflight = fetch('/api/projects')
    .then((response) => response.json())
    .then((payload) => {
      if (payload.code !== 0) throw new Error(payload.message || 'GENERIC');
      return rememberProjectList({
        userId,
        projects: payload.data.projects,
        currentProjectId: payload.data.currentProject?.id,
      });
    })
    .finally(() => {
      projectListInflight = null;
    });
  return projectListInflight;
}

function defaultName(project: ProjectSummary, translated: string) {
  try {
    return JSON.parse(project.settingsJson || '{}').systemDefault &&
      project.name === 'Default Project'
      ? translated
      : project.name;
  } catch {
    return project.name;
  }
}

export function ProjectSelector({
  value,
  onChange,
  className,
}: {
  value?: string;
  onChange?: (project: ProjectSummary) => void;
  className?: string;
}) {
  const t = useTranslations('workspace.selector');
  const tp = useTranslations('workspace.projects');
  const { user, isCheckSign } = useAppContext();
  const cached =
    user && projectListCache?.userId === user.id ? projectListCache : null;
  const [projects, setProjects] = useState<ProjectSummary[]>(
    () => cached?.projects || []
  );
  const [selectedId, setSelectedId] = useState(
    value || cached?.currentProjectId || ''
  );
  const [state, setState] = useState<'loading' | 'ready' | 'error'>(() => {
    if (isCheckSign && !cached) return 'loading';
    if (!user) return 'ready';
    return cached ? 'ready' : 'loading';
  });
  const [createOpen, setCreateOpen] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (isCheckSign) return;
    if (!user) {
      projectListCache = null;
      projectListInflight = null;
      setProjects([]);
      setSelectedId('');
      setState('ready');
      return;
    }

    const apply = (list: ProjectListCache) => {
      setProjects(list.projects);
      const current = list.projects.find(
        (project) => project.id === (value || list.currentProjectId)
      );
      if (current) {
        setSelectedId(current.id);
        onChangeRef.current?.(current);
      }
      setState('ready');
    };

    if (projectListCache?.userId === user.id) {
      apply(projectListCache);
      return;
    }

    setState('loading');
    prefetchProjectList(user.id)
      .then(apply)
      .catch(() => setState('error'));
  }, [isCheckSign, user]);

  useEffect(() => {
    if (user && projectListCache?.userId === user.id) {
      setProjects(projectListCache.projects);
    }
    if (value && value !== selectedId) setSelectedId(value);
  }, [selectedId, user, value]);

  const select = async (id: string) => {
    const project = projects.find((entry) => entry.id === id);
    if (!project) return;
    setSelectedId(id);
    if (user && projectListCache?.userId === user.id) {
      rememberProjectList({
        ...projectListCache,
        currentProjectId: id,
      });
    }
    await fetch('/api/projects/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: id }),
    });
    onChange?.(project);
  };

  if ((isCheckSign && state !== 'ready') || state === 'loading') {
    return (
      <div
        className={`text-muted-foreground flex h-10 items-center gap-2 text-sm ${className || ''}`}
      >
        <Folder className="size-4" />
        {t('loading')}
      </div>
    );
  }

  if (!user || state === 'error') {
    return (
      <div
        className={`text-muted-foreground flex h-10 items-center gap-2 text-sm ${className || ''}`}
      >
        <Folder className="size-4" />
        {!user ? tp('default') : t('error')}
      </div>
    );
  }

  const selectedProject = projects.find((project) => project.id === selectedId);

  return (
    <div className={cn('flex items-center', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t('label')}
            className="hover:bg-primary/10 focus-visible:ring-ring bg-secondary flex h-10 min-w-44 items-center gap-2 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2 max-[560px]:w-full"
          >
            <Folder className="text-primary size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-left">
              {selectedProject
                ? defaultName(selectedProject, tp('default'))
                : t('label')}
            </span>
            <ChevronDown className="text-muted-foreground size-4 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 overflow-hidden p-1"
        >
          <div className="max-h-[198px] overflow-y-auto overscroll-contain pr-1">
            {projects.map((project) => {
              const selected = project.id === selectedId;
              return (
                <DropdownMenuItem
                  key={project.id}
                  aria-current={selected ? 'true' : undefined}
                  className="h-9"
                  onSelect={() => void select(project.id)}
                >
                  <Folder className="size-4" />
                  <span className="min-w-0 flex-1 truncate">
                    {defaultName(project, tp('default'))}
                  </span>
                  {selected && <Check className="text-primary size-4" />}
                </DropdownMenuItem>
              );
            })}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="h-9"
            onSelect={() => window.setTimeout(() => setCreateOpen(true), 0)}
          >
            <Plus className="size-4" />
            {t('add')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ProjectCreateDialog
        trigger={null}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(project) => {
          setProjects((current) => {
            const next = [project, ...current];
            if (user) {
              rememberProjectList({
                userId: user.id,
                projects: next,
                currentProjectId: project.id,
              });
            }
            return next;
          });
          setSelectedId(project.id);
          onChange?.(project);
        }}
      />
    </div>
  );
}
