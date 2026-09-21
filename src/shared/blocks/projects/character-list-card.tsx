'use client';

import { useState } from 'react';
import {
  ArrowRight,
  MoreVertical,
  Pencil,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, useRouter } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

import {
  CharacterDeleteDialog,
  CharacterRenameDialog,
} from './character-item-dialogs';

export function CharacterListCard({
  projectId,
  character,
}: {
  projectId: string;
  character: {
    id: string;
    name: string;
    description?: string | null;
    preview?: { url: string } | null;
  };
}) {
  const t = useTranslations('workspace.characters');
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <article className="group bg-card hover:border-primary/50 relative overflow-hidden rounded-xl border transition-colors">
        <Link
          href={`/dashboard/projects/${projectId}/characters/${character.id}`}
          className="absolute inset-0 z-0 rounded-xl outline-none"
          aria-label={character.name}
        />
        <div className="pointer-events-none relative z-1">
          <div className="bg-muted/35 relative aspect-square border-b p-5">
            {character.preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={character.preview.url}
                alt=""
                className="size-full object-contain [image-rendering:pixelated]"
              />
            ) : (
              <div className="text-muted-foreground flex size-full items-center justify-center">
                <UserRound className="size-10 stroke-1" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-semibold">{character.name}</h2>
              <p className="text-muted-foreground mt-1 truncate text-xs">
                {character.description || t('workflow.base')}
              </p>
            </div>
            <ArrowRight className="text-primary size-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              aria-label={t('actions')}
              className="bg-background/85 hover:bg-primary/10 hover:text-primary absolute top-2 right-2 z-10 rounded-md opacity-100 backdrop-blur-sm sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 sm:data-[state=open]:opacity-100"
            >
              <MoreVertical className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-36">
            <DropdownMenuItem
              onSelect={() => window.setTimeout(() => setRenameOpen(true), 0)}
            >
              <Pencil className="size-4" />
              {t('rename')}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => window.setTimeout(() => setDeleteOpen(true), 0)}
            >
              <Trash2 className="size-4" />
              {t('delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </article>
      <CharacterRenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        projectId={projectId}
        itemId={character.id}
        name={character.name}
        onRenamed={() => router.refresh()}
      />
      <CharacterDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        projectId={projectId}
        itemId={character.id}
        name={character.name}
        onDeleted={() => router.refresh()}
      />
    </>
  );
}
