'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  readApiPayload,
  useProductApiFeedback,
} from '@/shared/lib/product-api-error';

export function CharacterRenameDialog({
  open,
  onOpenChange,
  projectId,
  itemId,
  name,
  onRenamed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  itemId: string;
  name: string;
  onRenamed?: (name: string) => void;
}) {
  const t = useTranslations('workspace.characters');
  const tp = useTranslations('workspace.projects');
  const notifyApiError = useProductApiFeedback();
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const save = async () => {
    const next = value.trim();
    if (!next) return;
    setBusy(true);
    setError(false);
    try {
      await readApiPayload(
        await fetch(`/api/projects/${projectId}/characters/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: next }),
        })
      );
      onOpenChange(false);
      onRenamed?.(next);
    } catch (reason) {
      setError(true);
      notifyApiError(reason);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
        setError(false);
        if (next) setValue(name);
      }}
    >
      <DialogContent className="rounded-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('renameTitle')}</DialogTitle>
          <DialogDescription>{t('renameDescription')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`character-name-${itemId}`}>{t('nameLabel')}</Label>
          <Input
            id={`character-name-${itemId}`}
            value={value}
            maxLength={80}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void save();
              }
            }}
          />
        </div>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {t('renameError')}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {tp('cancel')}
          </Button>
          <Button
            type="button"
            disabled={busy || !value.trim()}
            onClick={() => void save()}
          >
            {busy ? t('saving') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CharacterDeleteDialog({
  open,
  onOpenChange,
  projectId,
  itemId,
  name,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  itemId: string;
  name: string;
  onDeleted?: () => void;
}) {
  const t = useTranslations('workspace.characters');
  const tp = useTranslations('workspace.projects');
  const notifyApiError = useProductApiFeedback();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const remove = async () => {
    setBusy(true);
    setError(false);
    try {
      await readApiPayload(
        await fetch(`/api/projects/${projectId}/characters/${itemId}`, {
          method: 'DELETE',
        })
      );
      onOpenChange(false);
      onDeleted?.();
    } catch (reason) {
      setError(true);
      notifyApiError(reason);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
        setError(false);
      }}
    >
      <DialogContent className="rounded-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('deleteCharacterTitle')}</DialogTitle>
          <DialogDescription>
            {t('deleteCharacterDescription', { name })}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {t('deleteCharacterError')}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {tp('cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={() => void remove()}
          >
            {busy ? t('deletingCharacter') : tp('delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CharacterImageRenameDialog({
  open,
  onOpenChange,
  projectId,
  itemId,
  fileId,
  name,
  onRenamed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  itemId: string;
  fileId: string;
  name: string;
  onRenamed?: (name: string) => void;
}) {
  const t = useTranslations('workspace.characters');
  const tp = useTranslations('workspace.projects');
  const notifyApiError = useProductApiFeedback();
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const save = async () => {
    const next = value.trim();
    if (!next) return;
    setBusy(true);
    setError(false);
    try {
      await readApiPayload(
        await fetch(
          `/api/projects/${projectId}/characters/${itemId}/files/${fileId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: next }),
          }
        )
      );
      onOpenChange(false);
      onRenamed?.(next);
    } catch (reason) {
      setError(true);
      notifyApiError(reason);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
        setError(false);
        if (next) setValue(name);
      }}
    >
      <DialogContent className="rounded-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('renameImageTitle')}</DialogTitle>
          <DialogDescription>{t('renameImageDescription')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`image-name-${fileId}`}>{t('imageNameLabel')}</Label>
          <Input
            id={`image-name-${fileId}`}
            value={value}
            maxLength={80}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void save();
              }
            }}
          />
        </div>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {t('renameError')}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {tp('cancel')}
          </Button>
          <Button
            type="button"
            disabled={busy || !value.trim()}
            onClick={() => void save()}
          >
            {busy ? t('saving') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CharacterImageDeleteDialog({
  open,
  onOpenChange,
  projectId,
  itemId,
  fileId,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  itemId: string;
  fileId: string;
  onDeleted?: () => void;
}) {
  const t = useTranslations('workspace.characters');
  const tp = useTranslations('workspace.projects');
  const notifyApiError = useProductApiFeedback();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const remove = async () => {
    setBusy(true);
    setError(false);
    try {
      await readApiPayload(
        await fetch(
          `/api/projects/${projectId}/characters/${itemId}/files/${fileId}`,
          { method: 'DELETE' }
        )
      );
      onOpenChange(false);
      onDeleted?.();
    } catch (reason) {
      setError(true);
      notifyApiError(reason);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
        setError(false);
      }}
    >
      <DialogContent className="rounded-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('deleteImageTitle')}</DialogTitle>
          <DialogDescription>{t('deleteImageDescription')}</DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {t('deleteImageError')}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {tp('cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={() => void remove()}
          >
            {busy ? t('deletingImage') : t('deleteImage')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
