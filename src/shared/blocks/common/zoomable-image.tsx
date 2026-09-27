'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { cn } from '@/shared/lib/utils';

export function ZoomableImage({
  src,
  alt,
  zoomLabel,
  className,
  imageClassName,
}: {
  src: string;
  alt: string;
  zoomLabel: string;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          aria-label={zoomLabel}
          className={cn(
            'cursor-zoom-in block size-full rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden',
            className
          )}
          type="button"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={alt}
            className={cn(
              'size-full object-contain [image-rendering:pixelated]',
              imageClassName
            )}
            src={src}
          />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl rounded-xl p-4">
        <DialogTitle className="sr-only">{zoomLabel}</DialogTitle>
        <DialogDescription className="sr-only">{alt}</DialogDescription>
        <div className="bg-secondary/45 flex max-h-[80vh] min-h-64 items-center justify-center overflow-auto rounded-lg border p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={alt}
            className="max-h-[74vh] max-w-full object-contain [image-rendering:pixelated]"
            src={src}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
