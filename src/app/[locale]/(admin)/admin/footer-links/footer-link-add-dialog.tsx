'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Form } from '@/shared/blocks/form';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import type { Form as FormType } from '@/shared/types/blocks/form';

import { addFooterLinkAction } from './actions';

export function FooterLinkAddDialog({
  form,
  title,
  description,
  failedMessage,
}: {
  form: FormType;
  title: string;
  description: string;
  failedMessage: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!submitting) setOpen(value);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          {title}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form
          {...form}
          submit={{
            ...form.submit,
            handler: async (data) => {
              setSubmitting(true);
              try {
                const result = await addFooterLinkAction(data);
                if (result.warning) toast.warning(result.warning);
                setOpen(false);
                router.refresh();
                return {
                  ...result,
                  message: result.warning ? '' : result.message,
                };
              } catch {
                return { status: 'error', message: failedMessage };
              } finally {
                setSubmitting(false);
              }
            },
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
