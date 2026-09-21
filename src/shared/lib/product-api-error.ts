'use client';

import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { useAppContext } from '@/shared/contexts/app';

export function apiErrorCode(error: unknown) {
  if (typeof error === 'string' && error.trim()) return error.trim();
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return 'GENERIC';
}

export async function readApiPayload(response: Response) {
  const payload = await response.json();
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || 'GENERIC');
  }
  return payload;
}

export function useProductApiFeedback() {
  const t = useTranslations('workspace.errors');
  const { setIsShowSignModal } = useAppContext();
  const tRef = useRef(t);
  const setIsShowSignModalRef = useRef(setIsShowSignModal);
  tRef.current = t;
  setIsShowSignModalRef.current = setIsShowSignModal;

  return useCallback((error: unknown) => {
    const code = apiErrorCode(error);
    const known = tRef.current.has(code as never) ? code : 'GENERIC';
    const message = tRef.current(known as never);
    toast.error(message);
    if (known === 'UNAUTHORIZED') {
      setIsShowSignModalRef.current(true);
    }
    return message;
  }, []);
}
