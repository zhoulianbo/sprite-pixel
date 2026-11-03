'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  Download,
  Maximize2,
  MoreVertical,
  Pencil,
  Star,
  Trash2,
} from 'lucide-react';

import { useRouter } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';
import type { CharacterImageTarget } from '@/shared/services/character-image-repair';

import {
  CharacterImageDialog,
  characterImageEndpoint,
  type CharacterImageSaved,
} from './character-image-dialog';

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
  characterImage,
  onImageSaved,
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
  characterImage?: CharacterImageTarget;
  onImageSaved?: (result: CharacterImageSaved) => void;
}) {
  const router = useRouter();
  const [currentUrl, setCurrentUrl] = useState(url);
  useEffect(() => setCurrentUrl(url), [url]);
  const hasMenu = Boolean(children || onRename || onDelete || onSetActive);

  return (
    <div
      className={cn(
        'pointer-events-none absolute top-2 right-2 z-10 flex gap-1 opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 has-data-[state=open]:pointer-events-auto has-data-[state=open]:opacity-100 max-sm:pointer-events-auto max-sm:opacity-100',
        className
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <CharacterImageDialog
        url={currentUrl}
        alt={alt}
        title={zoomLabel}
        target={characterImage}
        onSaved={(result) => {
          setCurrentUrl(result.url);
          onImageSaved?.(result);
          router.refresh();
        }}
      >
        <Button
          type="button"
          size="icon-sm"
          variant="secondary"
          aria-label={zoomLabel}
          className="bg-background/85 backdrop-blur-sm"
        >
          <Maximize2 className="size-3.5" />
        </Button>
      </CharacterImageDialog>
      <Button
        asChild
        size="icon-sm"
        variant="secondary"
        className="bg-background/85 backdrop-blur-sm"
      >
        <a
          href={
            fileId
              ? `/api/files/${fileId}?download=1`
              : characterImage
                ? `${characterImageEndpoint(characterImage)}&download=1`
                : currentUrl
          }
          download={characterImage ? 'character.png' : ''}
          onClickCapture={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
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

/** Character thumbnail and actions share the same replacement state. */
export function CharacterImagePreview({
  url,
  fileId,
  alt,
  zoomLabel,
  downloadLabel,
  children,
}: {
  url: string;
  fileId: string;
  alt: string;
  zoomLabel: string;
  downloadLabel: string;
  children?: ReactNode;
}) {
  const [currentUrl, setCurrentUrl] = useState(url);
  useEffect(() => setCurrentUrl(url), [url]);
  return (
    <div className="group relative size-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentUrl}
        alt={alt}
        className="size-full object-contain [image-rendering:pixelated]"
      />
      {children}
      <AssetPreviewActions
        url={currentUrl}
        alt={alt}
        fileId={fileId}
        characterImage={{ fileId }}
        zoomLabel={zoomLabel}
        downloadLabel={downloadLabel}
        menuLabel={zoomLabel}
        onImageSaved={(result) => setCurrentUrl(result.url)}
      />
    </div>
  );
}
