import { Construction } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';

export async function ProjectEmptySection({
  projectId,
  section,
}: {
  projectId: string;
  section: string;
}) {
  const t = await getTranslations('workspace.emptySection');
  return (
    <div className="bg-card/30 flex min-h-[52vh] w-full flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
      <div className="text-primary bg-primary/10 mb-5 flex size-12 items-center justify-center rounded-lg border">
        <Construction className="size-5" />
      </div>
      <h1 className="font-heading text-2xl font-semibold">
        {t('title', { section })}
      </h1>
      <p className="text-muted-foreground mt-3 max-w-md text-sm leading-6">
        {t('description')}
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href={`/dashboard/projects/${projectId}/characters`}>
          {t('back')}
        </Link>
      </Button>
    </div>
  );
}
