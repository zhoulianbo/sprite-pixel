'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { FcGoogle } from 'react-icons/fc';
import { RiGithubFill } from 'react-icons/ri';
import { toast } from 'sonner';

import { signIn } from '@/core/auth/client';
import { defaultLocale } from '@/config/locale';
import { Button } from '@/shared/components/ui/button';
import { useAppContext } from '@/shared/contexts/app';
import { Button as ButtonType } from '@/shared/types/blocks/common';

export function SocialProviders({
  configs,
  callbackUrl,
  loading,
  setLoading,
}: {
  configs: Record<string, string>;
  callbackUrl: string;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}) {
  const t = useTranslations('common.sign');
  const locale = useLocale();

  const { setIsShowSignModal } = useAppContext();
  const popupRef = useRef<Window | null>(null);
  const popupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (callbackUrl) {
    if (
      locale !== defaultLocale &&
      callbackUrl.startsWith('/') &&
      !callbackUrl.startsWith(`/${locale}`)
    ) {
      callbackUrl = `/${locale}${callbackUrl}`;
    }
  }

  const cleanupPopup = useCallback(() => {
    if (popupTimerRef.current) {
      clearInterval(popupTimerRef.current);
      popupTimerRef.current = null;
    }
    popupRef.current = null;
  }, []);

  const handleAuthCallback = useCallback(() => {
    cleanupPopup();
    setIsShowSignModal(false);
    // Hard reload the page so the browser picks up the new session cookie
    window.location.reload();
  }, [cleanupPopup, setIsShowSignModal]);

  // Listen for localStorage event from the popup callback page
  // (works even when COOP blocks window.opener / postMessage)
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'auth-callback-success') {
        handleAuthCallback();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [handleAuthCallback]);

  const handleSignIn = async ({ provider }: { provider: string }) => {
    setLoading(true);

    // Open popup to the intermediate page that triggers signIn.social()
    const popupPath =
      locale !== defaultLocale
        ? `/${locale}/auth-popup?provider=${provider}`
        : `/auth-popup?provider=${provider}`;
    const popupUrl = `${window.location.origin}${popupPath}`;

    // Open centered popup window
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      popupUrl,
      'oauth-popup',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
    );

    if (!popup) {
      // Popup blocked - fall back to redirect
      toast.error('Popup blocked. Trying redirect...');
      setLoading(false);
      await signIn.social(
        { provider, callbackURL: callbackUrl },
        {
          onRequest: () => setLoading(true),
          onSuccess: () => setIsShowSignModal(false),
          onError: (e: any) => {
            toast.error(e?.error?.message || 'Sign in failed');
            setLoading(false);
          },
        }
      );
      return;
    }

    popupRef.current = popup;

    // Poll to detect if popup was closed manually (without completing auth)
    popupTimerRef.current = setInterval(() => {
      try {
        if (popup.closed) {
          cleanupPopup();
          setLoading(false);
        }
      } catch {
        // COOP may block access to popup.closed; ignore and keep polling
      }
    }, 500);
  };

  const providers: ButtonType[] = [];

  if (configs.google_auth_enabled === 'true') {
    providers.push({
      name: 'google',
      title: t('google_sign_in_title'),
      icon: (
        <span className="flex size-5 items-center justify-center rounded-full bg-white shadow-sm">
          <FcGoogle className="size-3.5" />
        </span>
      ),
      onClick: () => handleSignIn({ provider: 'google' }),
    });
  }

  if (configs.github_auth_enabled === 'true') {
    providers.push({
      name: 'github',
      title: t('github_sign_in_title'),
      icon: <RiGithubFill className="size-4" />,
      onClick: () => handleSignIn({ provider: 'github' }),
    });
  }

  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-2.5">
      {providers.map((provider) => {
        const isGoogle = provider.name === 'google';

        return (
          <Button
            key={provider.name}
            type="button"
            variant={isGoogle ? 'default' : 'outline'}
            className="h-11 w-full gap-2.5 rounded-xl text-sm font-medium"
            disabled={loading}
            onClick={provider.onClick}
          >
            {provider.icon}
            <span>{provider.title}</span>
          </Button>
        );
      })}
    </div>
  );
}
