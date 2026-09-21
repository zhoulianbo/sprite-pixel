'use client';

import { useState } from 'react';
import { FolderKanban, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

import { ProjectCreateDialog, ProjectSummary } from './project-create-dialog';
import { ProjectDeleteDialog } from './project-delete-dialog';

export function ProjectCard({
  project,
  title,
  genre,
  style,
  assetsLabel,
  updatedLabel,
  genreLabel,
  styleLabel,
}: {
  project: ProjectSummary;
  title: string;
  genre: string;
  style: string;
  assetsLabel: string;
  updatedLabel: string;
  genreLabel: string;
  styleLabel: string;
}) {
  const t = useTranslations('workspace.projects');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <Card className="group hover:border-primary/45 has-[a:focus-visible]:border-primary has-[a:focus-visible]:ring-ring/50 relative flex h-full min-h-64 w-full flex-col gap-0 rounded-xl py-0 shadow-none transition-colors has-[a:focus-visible]:ring-[3px]">
        <Link
          href={`/dashboard/projects/${project.id}/characters`}
          className="absolute inset-0 z-0 rounded-xl outline-none"
          aria-label={title}
        />
        <div className="pointer-events-none relative z-1 flex min-h-48 flex-1 flex-col gap-8 p-6">
          <div className="flex items-start gap-3">
            <div className="bg-background/90 text-primary flex size-11 shrink-0 items-center justify-center rounded-lg border shadow-sm">
              <FolderKanban className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="font-heading truncate text-lg font-semibold">
                {title}
              </h2>
              <p className="text-muted-foreground text-xs">{assetsLabel}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('menu')}
                  className="hover:bg-primary/10 hover:text-primary pointer-events-auto size-8 shrink-0 rounded-md opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 sm:data-[state=open]:opacity-100"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-36">
                <DropdownMenuItem
                  onSelect={() => window.setTimeout(() => setEditOpen(true), 0)}
                >
                  <Pencil className="size-4" />
                  {t('edit')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() =>
                    window.setTimeout(() => setDeleteOpen(true), 0)
                  }
                >
                  <Trash2 className="size-4" />
                  {t('delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
            {genre ? (
              <>
                <dt className="text-muted-foreground">{genreLabel}</dt>
                <dd className="truncate">{genre}</dd>
              </>
            ) : null}
            {style ? (
              <>
                <dt className="text-muted-foreground">{styleLabel}</dt>
                <dd className="truncate">{style}</dd>
              </>
            ) : null}
          </dl>
          <p className="text-muted-foreground mt-auto text-right text-xs">
            {updatedLabel}
          </p>
        </div>
      </Card>
      <ProjectCreateDialog
        project={project}
        trigger={null}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ProjectDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        projectId={project.id}
        projectName={title}
      />
    </>
  );
}
