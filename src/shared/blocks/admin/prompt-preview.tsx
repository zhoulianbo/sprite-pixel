'use client';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';

export function PromptPreview({
  text,
  moreLabel,
  title,
}: {
  text: string;
  moreLabel: string;
  title: string;
}) {
  const characters = Array.from(text.trim());
  const truncated = characters.length > 64;

  return (
    <div className="w-80 max-w-80 space-y-1 text-sm break-words whitespace-normal">
      <p>
        {characters.slice(0, 64).join('').replace(/\s+/g, ' ')}
        {truncated ? '…' : ''}
      </p>
      {truncated && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="link" size="sm" className="h-auto p-0">
              {moreLabel}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-xl sm:max-w-2xl">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="text-foreground text-sm break-words whitespace-pre-wrap">
              {text}
            </DialogDescription>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
