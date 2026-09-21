'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/components/ui/drawer';
import { useAppContext } from '@/shared/contexts/app';
import { useMediaQuery } from '@/shared/hooks/use-media-query';

import { SignInForm } from './sign-in-form';
import { SignUpForm } from './sign-up-form';

function SignModalHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3.5 pr-8">
      <div className="relative shrink-0">
        <div
          aria-hidden
          className="bg-primary/25 absolute inset-0 rounded-lg blur-md"
        />
        <div className="bg-primary text-primary-foreground relative flex size-11 items-center justify-center rounded-lg shadow-sm">
          <Lock className="size-5" strokeWidth={2.25} />
        </div>
      </div>
      <div className="min-w-0 space-y-1 pt-0.5">
        <DialogTitle className="text-foreground text-xl font-semibold tracking-tight">
          {title}
        </DialogTitle>
        <DialogDescription className="text-muted-foreground text-sm">
          {description}
        </DialogDescription>
      </div>
    </div>
  );
}

export function SignModal({ callbackUrl = '/' }: { callbackUrl?: string }) {
  const t = useTranslations('common.sign');
  const { isShowSignModal, setIsShowSignModal } = useAppContext();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');

  const isDesktop = useMediaQuery('(min-width: 768px)');

  const handleOpenChange = (open: boolean) => {
    setIsShowSignModal(open);
    if (!open) {
      setMode('sign-in');
    }
  };

  const title = mode === 'sign-in' ? t('sign_in_title') : t('sign_up_title');
  const description =
    mode === 'sign-in' ? t('sign_in_description') : t('sign_up_description');

  const formContent =
    mode === 'sign-in' ? (
      <SignInForm
        callbackUrl={callbackUrl}
        onSwitchToSignUp={() => setMode('sign-up')}
      />
    ) : (
      <SignUpForm
        callbackUrl={callbackUrl}
        onSwitchToSignIn={() => setMode('sign-in')}
      />
    );

  if (isDesktop) {
    return (
      <Dialog open={isShowSignModal} onOpenChange={handleOpenChange}>
        <DialogContent className="border-border bg-card text-card-foreground **:data-[slot=dialog-close]:bg-secondary **:data-[slot=dialog-close]:text-secondary-foreground **:data-[slot=dialog-close]:hover:bg-accent **:data-[slot=dialog-close]:hover:text-accent-foreground gap-5 rounded-xl p-6 shadow-none **:data-[slot=dialog-close]:rounded-md **:data-[slot=dialog-close]:p-1.5 **:data-[slot=dialog-close]:opacity-100 sm:max-w-[425px]">
          <DialogHeader className="space-y-0 text-left">
            <SignModalHeader title={title} description={description} />
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isShowSignModal} onOpenChange={handleOpenChange}>
      <DrawerContent className="border-border bg-card text-card-foreground rounded-t-xl">
        <DrawerHeader className="text-left">
          <div className="flex items-start gap-3.5">
            <div className="relative shrink-0">
              <div
                aria-hidden
                className="bg-primary/25 absolute inset-0 rounded-lg blur-md"
              />
              <div className="bg-primary text-primary-foreground relative flex size-11 items-center justify-center rounded-lg shadow-sm">
                <Lock className="size-5" strokeWidth={2.25} />
              </div>
            </div>
            <div className="min-w-0 space-y-1 pt-0.5">
              <DrawerTitle className="text-xl font-semibold tracking-tight">
                {title}
              </DrawerTitle>
              <DrawerDescription>{description}</DrawerDescription>
            </div>
          </div>
        </DrawerHeader>
        {mode === 'sign-in' ? (
          <SignInForm
            callbackUrl={callbackUrl}
            className="mt-4 px-4"
            onSwitchToSignUp={() => setMode('sign-up')}
          />
        ) : (
          <SignUpForm
            callbackUrl={callbackUrl}
            className="mt-4 px-4"
            onSwitchToSignIn={() => setMode('sign-in')}
          />
        )}
        <DrawerFooter className="pt-4">
          <DrawerClose asChild>
            <Button variant="outline">{t('cancel_title')}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
