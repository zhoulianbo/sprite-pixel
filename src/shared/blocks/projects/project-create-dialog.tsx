'use client';

import { useEffect, useRef, useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useRouter } from '@/core/i18n/navigation';
import { canCreateProject, getPlanEntitlements } from '@/config/plans';
import { PaywallDialog } from '@/shared/blocks/payment/paywall-dialog';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { useAppContext } from '@/shared/contexts/app';
import {
  apiErrorCode,
  readApiPayload,
  useProductApiFeedback,
} from '@/shared/lib/product-api-error';

import { ProjectFormFields, ProjectFormValues } from './project-form-fields';

export type ProjectSummary = {
  id: string;
  name: string;
  description?: string | null;
  settingsJson: string;
  gameGenre: string;
  artStyle: string;
};

function emptyValues(): ProjectFormValues {
  return {
    name: '',
    description: '',
    gameGenre: '',
    artStyle: 'pixel_art',
  };
}

function valuesFromProject(project: ProjectSummary): ProjectFormValues {
  return {
    name: project.name,
    description: project.description || '',
    gameGenre: project.gameGenre,
    artStyle: project.artStyle || 'pixel_art',
  };
}

export function ProjectCreateDialog({
  trigger,
  project,
  onCreated,
  activeProjectCount,
  planProductId,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: React.ReactNode | null;
  project?: ProjectSummary;
  onCreated?: (project: ProjectSummary) => void;
  activeProjectCount?: number;
  planProductId?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useTranslations('workspace.createProject');
  const notifyApiError = useProductApiFeedback();
  const { user } = useAppContext();
  const router = useRouter();
  const isEdit = Boolean(project);
  const [internalOpen, setInternalOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [values, setValues] = useState<ProjectFormValues>(
    project ? valuesFromProject(project) : emptyValues()
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const requestedOpen = controlledOpen ?? internalOpen;
  const productId =
    planProductId !== undefined
      ? planProductId
      : user?.currentSubscriptionProductId;
  const projectLimit = getPlanEntitlements(productId).maxProjects;
  const blocked =
    !isEdit &&
    typeof activeProjectCount === 'number' &&
    !canCreateProject(productId, activeProjectCount);
  const open = requestedOpen && !blocked;
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const setOpen = (next: boolean) => {
    if (next && blocked) {
      setPaywallOpen(true);
      return;
    }
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (!requestedOpen || !blocked) return;
    setPaywallOpen(true);
    if (controlledOpen === undefined) setInternalOpen(false);
    else onOpenChangeRef.current?.(false);
  }, [requestedOpen, blocked, controlledOpen]);

  const fillFromProject = () => {
    if (!project) return;
    setValues(valuesFromProject(project));
  };

  const reset = () => {
    setValues(project ? valuesFromProject(project) : emptyValues());
    setError(false);
  };

  const submit = async () => {
    setBusy(true);
    setError(false);
    try {
      const response = await fetch(
        isEdit ? `/api/projects/${project!.id}` : '/api/projects',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: values.name,
            gameGenre: values.gameGenre,
            artStyle: values.artStyle,
            description: values.description,
          }),
        }
      );
      const payload = await readApiPayload(response);
      if (!isEdit) {
        await readApiPayload(
          await fetch('/api/projects/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: payload.data.id }),
          })
        );
        onCreated?.(payload.data);
      }
      router.refresh();
      setOpen(false);
      reset();
    } catch (error) {
      if (apiErrorCode(error) === 'PROJECT_LIMIT') {
        setOpen(false);
        setPaywallOpen(true);
        return;
      }
      setError(true);
      notifyApiError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next && project) fillFromProject();
          if (!next && !busy) reset();
        }}
      >
        {trigger !== null && (
          <DialogTrigger asChild>
            {trigger === undefined ? (
              <Button>
                <FolderPlus className="size-4" />
                {t('title')}
              </Button>
            ) : (
              trigger
            )}
          </DialogTrigger>
        )}
        <DialogContent className="rounded-xl sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>{isEdit ? t('editTitle') : t('title')}</DialogTitle>
            <DialogDescription>
              {isEdit ? t('editDescription') : t('description')}
            </DialogDescription>
          </DialogHeader>
          <ProjectFormFields
            autoFocus
            values={values}
            onChange={(next) =>
              setValues((current) => ({ ...current, ...next }))
            }
          />
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {isEdit ? t('editError') : t('error')}
            </p>
          )}
          <DialogFooter>
            <Button
              onClick={submit}
              disabled={busy || !values.name.trim() || !values.gameGenre}
            >
              {busy
                ? isEdit
                  ? t('saving')
                  : t('creating')
                : isEdit
                  ? t('save')
                  : t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PaywallDialog
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        projectLimit={projectLimit ?? 1}
      />
    </>
  );
}
