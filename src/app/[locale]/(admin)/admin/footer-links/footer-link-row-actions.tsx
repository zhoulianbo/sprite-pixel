'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { Form } from '@/shared/blocks/form';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import type { Form as FormType } from '@/shared/types/blocks/form';

import { deleteFooterLinkAction, updateFooterLinkAction } from './actions';

type FooterLinkActionLabels = {
  menu: string;
  edit: string;
  editTitle: string;
  editDescription: string;
  editFailed: string;
  deleteAction: string;
  deleteTitle: string;
  deleteDescription: string;
  cancel: string;
  confirm: string;
  confirming: string;
  success: string;
  failed: string;
  cacheWarning: string;
};

export function FooterLinkRowActions({
  footerLinkId,
  editForm,
  labels,
}: {
  footerLinkId: string;
  editForm: FormType;
  labels: FooterLinkActionLabels;
}) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const result = await deleteFooterLinkAction(footerLinkId);
      if (result.cacheSynced) toast.success(labels.success);
      else toast.warning(labels.cacheWarning);
      setIsDeleteOpen(false);
      router.refresh();
    } catch {
      toast.error(labels.failed);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted flex h-8 w-8 p-0"
          >
            <MoreHorizontal />
            <span className="sr-only">{labels.menu}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
            <SmartIcon name="RiEditLine" className="h-4 w-4" />
            {labels.edit}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setIsDeleteOpen(true)}
          >
            <SmartIcon name="RiDeleteBinLine" className="h-4 w-4" />
            {labels.deleteAction}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          if (!isSaving) setIsEditOpen(open);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{labels.editTitle}</DialogTitle>
            <DialogDescription>{labels.editDescription}</DialogDescription>
          </DialogHeader>
          <Form
            {...editForm}
            submit={{
              ...editForm.submit,
              handler: async (data) => {
                setIsSaving(true);
                try {
                  const result = await updateFooterLinkAction(
                    footerLinkId,
                    data
                  );
                  if (result.status === 'error') return result;
                  if (result.warning) toast.warning(result.warning);
                  setIsEditOpen(false);
                  router.refresh();
                  return {
                    ...result,
                    message: result.warning ? '' : result.message,
                  };
                } catch {
                  return { status: 'error', message: labels.editFailed };
                } finally {
                  setIsSaving(false);
                }
              },
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          if (!isDeleting) setIsDeleteOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.deleteTitle}</DialogTitle>
            <DialogDescription>{labels.deleteDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setIsDeleteOpen(false)}
            >
              {labels.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : null}
              {isDeleting ? labels.confirming : labels.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
