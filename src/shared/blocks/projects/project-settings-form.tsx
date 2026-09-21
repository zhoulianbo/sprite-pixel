'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { useRouter } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';
import {
  readApiPayload,
  useProductApiFeedback,
} from '@/shared/lib/product-api-error';

import { ProjectSummary } from './project-create-dialog';
import { ProjectDeleteDialog } from './project-delete-dialog';
import { ProjectFormFields, ProjectFormValues } from './project-form-fields';

export function ProjectSettingsForm({
  project,
  title,
}: {
  project: ProjectSummary;
  title: string;
}) {
  const t = useTranslations('workspace.createProject');
  const tp = useTranslations('workspace.projects');
  const ts = useTranslations('workspace.projectSettings');
  const notifyApiError = useProductApiFeedback();
  const router = useRouter();
  const [values, setValues] = useState<ProjectFormValues>({
    name: project.name,
    description: project.description || '',
    gameGenre: project.gameGenre,
    artStyle: project.artStyle || 'pixel_art',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const save = async () => {
    setBusy(true);
    setError(false);
    try {
      await readApiPayload(
        await fetch(`/api/projects/${project.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: values.name,
            gameGenre: values.gameGenre,
            artStyle: values.artStyle,
            description: values.description,
          }),
        })
      );
      router.refresh();
    } catch (error) {
      setError(true);
      notifyApiError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card className="rounded-xl p-6 shadow-none">
        <div className="space-y-6">
          <ProjectFormFields
            idPrefix="project-settings"
            values={values}
            onChange={(next) =>
              setValues((current) => ({ ...current, ...next }))
            }
          />
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {t('editError')}
            </p>
          ) : null}
          <Button
            type="button"
            className="h-10"
            disabled={busy || !values.name.trim() || !values.gameGenre}
            onClick={() => void save()}
          >
            {busy ? t('saving') : t('save')}
          </Button>
        </div>
        <Separator className="my-8" />
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">{ts('deleteHeading')}</h2>
            <p className="text-muted-foreground text-sm leading-6">
              {tp('deleteDescription', { name: title })}
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            className="h-10"
            onClick={() => setDeleteOpen(true)}
          >
            {tp('delete')}
          </Button>
        </div>
      </Card>
      <ProjectDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        projectId={project.id}
        projectName={title}
        onDeleted={() => router.push('/dashboard')}
      />
    </>
  );
}
