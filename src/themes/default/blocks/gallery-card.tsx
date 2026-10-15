'use client';

import { useState } from 'react';
import { Download, Heart, ImageIcon } from 'lucide-react';

import { AnimationThumbnail } from '@/shared/blocks/assets/animation-thumbnail';
import { Button } from '@/shared/components/ui/button';
import { useAppContext } from '@/shared/contexts/app';
import { cn } from '@/shared/lib/utils';

export type PublicGalleryItem = {
  id: string;
  type: string;
  name: string;
  category: string;
  categoryLabel: string;
  width: number | null;
  height: number | null;
  prompt: string | null;
  downloadCount: number;
  likeCount: number;
  sourceCreatedAt: string;
  previewUrl: string | null;
  liked: boolean;
};

export function GalleryCard({
  item,
  locale,
  labels,
}: {
  item: PublicGalleryItem;
  locale: string;
  labels: {
    animation: string;
    character: string;
    like: string;
    download: string;
    noPreview: string;
  };
}) {
  const { user, setIsShowSignModal } = useAppContext();
  const [liked, setLiked] = useState(item.liked);
  const [likeCount, setLikeCount] = useState(item.likeCount);
  const [downloadCount, setDownloadCount] = useState(item.downloadCount);
  const [busyLike, setBusyLike] = useState(false);

  const download = async () => {
    if (!item.previewUrl) return;
    try {
      const response = await fetch(`/api/gallery/${item.id}/download`, {
        method: 'POST',
      });
      const result = await response.json();
      if (response.ok && result.code === 0) {
        setDownloadCount(result.data.downloadCount);
      }
    } finally {
      const anchor = document.createElement('a');
      anchor.href = item.previewUrl;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.download = item.name;
      anchor.click();
    }
  };

  const toggleLike = async () => {
    if (!user) {
      setIsShowSignModal(true);
      return;
    }
    if (busyLike) return;
    setBusyLike(true);
    try {
      const response = await fetch(`/api/gallery/${item.id}/like`, {
        method: 'POST',
      });
      const result = await response.json();
      if (response.ok && result.code === 0) {
        setLiked(result.data.liked);
        setLikeCount(result.data.likeCount);
      }
    } finally {
      setBusyLike(false);
    }
  };

  return (
    <article className="border-border bg-card overflow-hidden rounded-xl border">
      <div className="bg-muted/35 aspect-[4/3] overflow-hidden">
        {item.type === 'animation' ? (
          <AnimationThumbnail
            autoPlay
            imageUrl={item.previewUrl}
            label={item.name}
            previewEndpoint={`/api/gallery/${item.id}/preview`}
          />
        ) : item.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.previewUrl}
            alt={item.name}
            className="size-full object-contain p-4 [image-rendering:pixelated]"
            loading="lazy"
          />
        ) : (
          <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-2">
            <ImageIcon className="size-8 stroke-1" />
            <span className="text-xs">{labels.noPreview}</span>
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-heading truncate text-lg font-semibold">
              {item.name}
            </h2>
            <p className="text-muted-foreground mt-1 text-xs">
              {item.type === 'animation' ? labels.animation : labels.character}
              {item.categoryLabel ? ` · ${item.categoryLabel}` : ''}
              {item.width && item.height
                ? ` · ${item.width}×${item.height}`
                : ''}
            </p>
          </div>
          <time
            className="text-muted-foreground shrink-0 text-[11px]"
            dateTime={item.sourceCreatedAt}
          >
            {new Intl.DateTimeFormat(locale, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }).format(new Date(item.sourceCreatedAt))}
          </time>
        </div>
        {item.prompt ? (
          <p className="text-muted-foreground line-clamp-2 min-h-10 text-sm leading-5">
            {item.prompt}
          </p>
        ) : null}
        <div className="flex items-center justify-end gap-2 border-t pt-3">
          <Button
            aria-pressed={liked}
            disabled={busyLike}
            onClick={toggleLike}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Heart
              className={cn('size-4', liked && 'fill-current text-rose-400')}
            />
            <span className="sr-only">{labels.like}</span>
            {likeCount}
          </Button>
          <Button
            disabled={!item.previewUrl}
            onClick={download}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Download className="size-4" />
            <span className="sr-only">{labels.download}</span>
            {downloadCount}
          </Button>
        </div>
      </div>
    </article>
  );
}
