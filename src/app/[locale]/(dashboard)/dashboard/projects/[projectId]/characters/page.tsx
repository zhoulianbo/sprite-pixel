import { UserRound } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { CharacterCreateDialog } from '@/shared/blocks/projects/character-create-dialog';
import { CharacterListCard } from '@/shared/blocks/projects/character-list-card';
import { listProjectItemsWithPreview } from '@/shared/models/asset';

export default async function CharactersPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const t = await getTranslations('workspace.characters');
  const characters = await listProjectItemsWithPreview(projectId, 'character');
  return (
    <div className="w-full space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <h1 className="font-heading text-3xl font-semibold">{t('title')}</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {t('description')}
          </p>
        </div>
        <CharacterCreateDialog projectId={projectId} />
      </header>
      {characters.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {characters.map((character) => (
            <CharacterListCard
              key={character.id}
              projectId={projectId}
              character={character}
            />
          ))}
        </div>
      ) : (
        <div className="bg-card/25 flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
          <UserRound className="text-primary stroke-1.5 size-9" />
          <h2 className="font-heading mt-4 text-xl font-semibold">
            {t('emptyTitle')}
          </h2>
          <p className="text-muted-foreground mt-2 max-w-md text-sm">
            {t('emptyDescription')}
          </p>
        </div>
      )}
    </div>
  );
}
