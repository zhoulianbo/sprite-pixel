'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';

export function GalleryPublishButton({
  kind,
  sourceId,
  eligible,
  published,
  publishLabel,
  unpublishLabel,
  privateLabel,
  errorLabel,
}: {
  kind: 'character' | 'animation';
  sourceId: string;
  eligible: boolean;
  published: boolean;
  publishLabel: string;
  unpublishLabel: string;
  privateLabel: string;
  errorLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!eligible && !published) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
        <LockKeyhole className="size-3.5" aria-hidden="true" />
        {privateLabel}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        size="sm"
        variant={published ? 'outline' : 'default'}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setFailed(false);
          try {
            const response = await fetch('/api/admin/gallery', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                kind,
                sourceId,
                published: !published,
              }),
            });
            const result = await response.json();
            if (!response.ok || result.code !== 0) throw new Error();
            router.refresh();
          } catch {
            setFailed(true);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : published ? (
          <EyeOff className="size-3.5" />
        ) : (
          <Eye className="size-3.5" />
        )}
        {published ? unpublishLabel : publishLabel}
      </Button>
      {failed ? (
        <p className="text-destructive text-xs" role="alert">
          {errorLabel}
        </p>
      ) : null}
    </div>
  );
}
