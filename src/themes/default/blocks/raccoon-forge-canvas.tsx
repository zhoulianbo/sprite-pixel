'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';

const SCENE_WIDTH = 640;
const SCENE_HEIGHT = 360;
const LOOP_DURATION = 7800;
const SPRITE_COLUMNS = 8;
const SPRITE_ROWS = 4;
const ASSET_COLUMNS = 4;

const palette = {
  background: '#0d1625',
  surface: '#111c2d',
  elevated: '#18263b',
  border: '#283b52',
  cyan: '#35c2ff',
  gold: '#f6c453',
  green: '#7cff8a',
  text: '#f8fafc',
  muted: '#7e8ca5',
};

type ForgePhase = 0 | 1 | 2 | 3;

type SceneImages = {
  raccoon: HTMLImageElement;
  assets: HTMLImageElement;
  dummy: HTMLImageElement;
};

type ForgeCopy = {
  phaseLabels: string[];
  projectLabel: string;
  savedLabel: string;
  footerStatuses: string[];
  loadError: string;
  ariaLabel: string;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - clamp(value), 3);
}

function drawLabel(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  align: CanvasTextAlign = 'left'
) {
  context.save();
  context.fillStyle = color;
  context.font = '700 9px ui-monospace, SFMono-Regular, Menlo, monospace';
  context.letterSpacing = '1px';
  context.textAlign = align;
  context.textBaseline = 'middle';
  context.fillText(text, x, y);
  context.restore();
}

function drawSpriteFrame(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  row: number,
  frame: number,
  x: number,
  y: number,
  width: number,
  alpha = 1
) {
  const sourceWidth = image.naturalWidth / SPRITE_COLUMNS;
  const sourceHeight = image.naturalHeight / SPRITE_ROWS;
  const height = width * (sourceHeight / sourceWidth);

  context.save();
  context.globalAlpha = alpha;
  context.drawImage(
    image,
    Math.floor(frame % SPRITE_COLUMNS) * sourceWidth,
    Math.floor(row % SPRITE_ROWS) * sourceHeight,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height
  );
  context.restore();
}

function drawAsset(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  index: number,
  x: number,
  y: number,
  size: number,
  alpha = 1
) {
  const sourceWidth = image.naturalWidth / ASSET_COLUMNS;

  context.save();
  context.globalAlpha = alpha;
  context.drawImage(
    image,
    index * sourceWidth,
    0,
    sourceWidth,
    image.naturalHeight,
    x,
    y,
    size,
    size
  );
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  images: SceneImages,
  elapsed: number,
  copy: ForgeCopy
) {
  const time = elapsed % LOOP_DURATION;
  const phase: ForgePhase =
    time < 3500 ? 0 : time < 5000 ? 1 : time < 6500 ? 2 : 3;

  context.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
  context.fillStyle = palette.background;
  context.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);

  context.strokeStyle = 'rgba(53, 194, 255, 0.065)';
  context.lineWidth = 1;
  for (let x = 0; x <= SCENE_WIDTH; x += 32) {
    context.beginPath();
    context.moveTo(x + 0.5, 0);
    context.lineTo(x + 0.5, SCENE_HEIGHT);
    context.stroke();
  }
  for (let y = 0; y <= SCENE_HEIGHT; y += 32) {
    context.beginPath();
    context.moveTo(0, y + 0.5);
    context.lineTo(SCENE_WIDTH, y + 0.5);
    context.stroke();
  }

  copy.phaseLabels.forEach((label, index) => {
    const x = 18 + index * 153;
    const active = index === phase;
    context.fillStyle = active ? palette.cyan : palette.border;
    context.fillRect(x, 18, 137, 2);
    drawLabel(
      context,
      `0${index + 1} / ${label}`,
      x,
      34,
      active ? palette.text : palette.muted
    );
  });

  context.fillStyle = palette.surface;
  context.fillRect(18, 302, 604, 40);
  context.strokeStyle = palette.border;
  context.strokeRect(18.5, 302.5, 603, 39);
  drawLabel(context, copy.projectLabel, 32, 323, palette.muted);

  const slotStartX = 334;
  const slotY = 66;
  const slotSize = 62;
  const visibleAssets =
    time < 3500 ? 0 : time < 5000 ? Math.ceil(((time - 3500) / 1500) * 4) : 4;

  for (let index = 0; index < 4; index += 1) {
    const x = slotStartX + index * 70;
    const isVisible = index < visibleAssets;
    const isSaved = phase === 3;
    context.fillStyle = isVisible ? palette.elevated : 'rgba(17, 28, 45, 0.5)';
    context.fillRect(x, slotY, slotSize, slotSize);
    context.strokeStyle = isSaved
      ? palette.green
      : isVisible
        ? palette.cyan
        : palette.border;
    context.strokeRect(x + 0.5, slotY + 0.5, slotSize - 1, slotSize - 1);

    if (isVisible) {
      const revealStart = 3500 + index * 260;
      const reveal = clamp((time - revealStart) / 260);
      const lift = (1 - easeOutCubic(reveal)) * 12;
      drawAsset(
        context,
        images.assets,
        index,
        x + 6,
        slotY + 6 - lift,
        slotSize - 12,
        reveal
      );
      if (isSaved) {
        context.fillStyle = palette.green;
        context.fillRect(x + slotSize - 13, slotY + 5, 7, 7);
      }
    } else {
      drawLabel(
        context,
        `0${index + 1}`,
        x + slotSize / 2,
        slotY + 31,
        palette.border,
        'center'
      );
    }
  }

  if (time < 1800) {
    const walkProgress = easeOutCubic(time / 1800);
    drawSpriteFrame(
      context,
      images.raccoon,
      1,
      Math.floor(time / 110),
      -38 + walkProgress * 186,
      78,
      168
    );
  } else if (time < 3500) {
    drawSpriteFrame(
      context,
      images.raccoon,
      2,
      Math.floor((time - 1800) / 145),
      128,
      63,
      180
    );

    const pulse = 0.5 + Math.sin(time / 120) * 0.5;
    context.strokeStyle = `rgba(53, 194, 255, ${0.25 + pulse * 0.4})`;
    context.strokeRect(
      300.5 - pulse * 4,
      145.5 - pulse * 4,
      48 + pulse * 8,
      48 + pulse * 8
    );
  } else if (time < 5000) {
    drawSpriteFrame(
      context,
      images.raccoon,
      0,
      Math.floor((time - 3500) / 180),
      130,
      78,
      168
    );

    for (let index = 0; index < 9; index += 1) {
      const travel = ((time - 3500) / 900 + index / 9) % 1;
      context.fillStyle = index % 2 === 0 ? palette.gold : palette.cyan;
      context.globalAlpha = 1 - travel;
      context.fillRect(
        287 + travel * 74,
        165 - Math.sin(travel * Math.PI) * 46 + index * 2,
        3,
        3
      );
    }
    context.globalAlpha = 1;
  } else if (time < 6500) {
    const attackFrame = Math.floor((time - 5000) / 150) % 8;
    drawSpriteFrame(context, images.raccoon, 3, attackFrame, 134, 72, 180);
    context.drawImage(images.dummy, 430, 142, 92, 138);

    if (attackFrame >= 3 && attackFrame <= 5) {
      const hitAlpha = 1 - Math.abs(4 - attackFrame) * 0.28;
      context.save();
      context.globalAlpha = hitAlpha;
      context.strokeStyle = palette.gold;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(425, 170);
      context.lineTo(443, 154);
      context.moveTo(425, 154);
      context.lineTo(443, 170);
      context.stroke();
      context.restore();
    }
  } else {
    drawSpriteFrame(
      context,
      images.raccoon,
      0,
      Math.floor((time - 6500) / 180),
      130,
      78,
      168
    );

    context.fillStyle = 'rgba(124, 255, 138, 0.08)';
    context.fillRect(326, 58, 296, 79);
    drawLabel(context, copy.savedLabel, 478, 150, palette.green, 'center');
  }

  const footerStatus = copy.footerStatuses[phase] ?? '';
  drawLabel(
    context,
    footerStatus,
    606,
    323,
    phase === 3 ? palette.green : palette.cyan,
    'right'
  );
}

export function RaccoonForgeCanvas() {
  const t = useTranslations('pages.index.messages.forgeCanvas');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copy = useMemo<ForgeCopy>(
    () => ({
      phaseLabels: t.raw('phaseLabels') as string[],
      projectLabel: t('projectLabel'),
      savedLabel: t('savedLabel'),
      footerStatuses: t.raw('footerStatuses') as string[],
      loadError: t('loadError'),
      ariaLabel: t('ariaLabel'),
    }),
    [t]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animationFrame = 0;
    let isVisible = true;
    let isDocumentVisible = document.visibilityState === 'visible';
    let isDisposed = false;
    let startTime = performance.now();
    let images: SceneImages | null = null;

    const loadImage = (source: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = source;
      });

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(bounds.width * ratio));
      canvas.height = Math.max(1, Math.round(bounds.height * ratio));
      context.setTransform(
        canvas.width / SCENE_WIDTH,
        0,
        0,
        canvas.height / SCENE_HEIGHT,
        0,
        0
      );
      context.imageSmoothingEnabled = false;

      if (images) {
        drawScene(context, images, reduceMotion.matches ? 7100 : 0, copy);
      }
    };

    const animate = (now: number) => {
      if (!images || !isVisible || !isDocumentVisible || reduceMotion.matches)
        return;

      drawScene(context, images, now - startTime, copy);
      animationFrame = window.requestAnimationFrame(animate);
    };

    const updatePlayback = () => {
      window.cancelAnimationFrame(animationFrame);

      if (!images) return;

      if (reduceMotion.matches) {
        drawScene(context, images, 7100, copy);
        return;
      }

      if (!isVisible || !isDocumentVisible) return;

      startTime = performance.now();
      animationFrame = window.requestAnimationFrame(animate);
    };

    const handleMotionPreference = () => {
      updatePlayback();
    };

    const handleVisibility = () => {
      isDocumentVisible = document.visibilityState === 'visible';
      updatePlayback();
    };

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      updatePlayback();
    });

    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    document.addEventListener('visibilitychange', handleVisibility);
    reduceMotion.addEventListener('change', handleMotionPreference);

    Promise.all([
      loadImage('/imgs/demo/raccoon-forge-sprite-sheet-v1.webp'),
      loadImage('/imgs/demo/raccoon-project-assets-v1.webp'),
      loadImage('/imgs/demo/raccoon-training-dummy-v1.webp'),
    ])
      .then(([raccoon, assets, dummy]) => {
        if (isDisposed) return;
        images = { raccoon, assets, dummy };
        resize();
        updatePlayback();
      })
      .catch(() => {
        if (isDisposed) return;
        resize();
        context.fillStyle = palette.background;
        context.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
        drawLabel(
          context,
          copy.loadError,
          SCENE_WIDTH / 2,
          SCENE_HEIGHT / 2,
          palette.muted,
          'center'
        );
      });

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      reduceMotion.removeEventListener('change', handleMotionPreference);
    };
  }, [copy]);

  return (
    <div className="aspect-video min-h-[360px] w-full max-[760px]:min-h-[290px]">
      <canvas
        ref={canvasRef}
        className={
          'block h-full min-h-[360px] w-full [image-rendering:pixelated] max-[760px]:min-h-[290px]'
        }
        role="img"
        aria-label={copy.ariaLabel}
      />
    </div>
  );
}
