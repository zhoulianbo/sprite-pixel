'use client';

import type { ReactNode } from 'react';
import {
  Download,
  Maximize2,
  MoreVertical,
  Pencil,
  Star,
  Trash2,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';

export function AssetPreviewActions({
  url,
  alt,
  zoomLabel,
  downloadLabel,
  menuLabel,
  children,
  className,
  fileId,
  renameLabel,
  onRename,
  deleteLabel,
  onDelete,
  setActiveLabel,
  onSetActive,
}: {
  url: string;
  alt: string;
  zoomLabel: string;
  downloadLabel: string;
  menuLabel: string;
  children?: ReactNode;
  className?: string;
  fileId?: string;
  renameLabel?: string;
  onRename?: () => void;
  deleteLabel?: string;
  onDelete?: () => void;
  setActiveLabel?: string;
  onSetActive?: () => void;
}) {
  const hasMenu = Boolean(children || onRename || onDelete || onSetActive);

  return (
    <div
      className={cn(
        'pointer-events-none absolute top-2 right-2 z-10 flex gap-1 opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 has-data-[state=open]:pointer-events-auto has-data-[state=open]:opacity-100 max-sm:pointer-events-auto max-sm:opacity-100',
        className
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <Dialog>
        <DialogTrigger asChild>
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            aria-label={zoomLabel}
            className="bg-background/85 backdrop-blur-sm"
          >
            <Maximize2 className="size-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl rounded-xl p-4">
          <DialogTitle className="sr-only">{zoomLabel}</DialogTitle>
          <DialogDescription className="sr-only">{alt}</DialogDescription>
          <div className="bg-secondary/45 flex max-h-[80vh] min-h-64 items-center justify-center overflow-auto rounded-lg border p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={alt}
              className="max-h-[74vh] max-w-full object-contain [image-rendering:pixelated]"
            />
          </div>
        </DialogContent>
      </Dialog>
      <Button
        asChild
        size="icon-sm"
        variant="secondary"
        className="bg-background/85 backdrop-blur-sm"
      >
        <a
          href={fileId ? `/api/files/${fileId}?download=1` : url}
          aria-label={downloadLabel}
        >
          <Download className="size-3.5" />
        </a>
      </Button>
      {hasMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              aria-label={menuLabel}
              className="bg-background/85 backdrop-blur-sm data-[state=open]:opacity-100"
            >
              <MoreVertical className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-36">
            {onSetActive ? (
              <DropdownMenuItem
                onSelect={() => window.setTimeout(() => onSetActive(), 0)}
              >
                <Star className="size-4" />
                {setActiveLabel}
              </DropdownMenuItem>
            ) : null}
            {onRename ? (
              <DropdownMenuItem
                onSelect={() => window.setTimeout(() => onRename(), 0)}
              >
                <Pencil className="size-4" />
                {renameLabel}
              </DropdownMenuItem>
            ) : null}
            {children}
            {onDelete ? (
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => window.setTimeout(() => onDelete(), 0)}
              >
                <Trash2 className="size-4" />
                {deleteLabel}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
