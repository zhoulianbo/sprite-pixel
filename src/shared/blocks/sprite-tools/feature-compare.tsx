'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowLeftRight } from 'lucide-react';

type Example = {
  title: string;
  text: string;
  before: string;
  after: string;
};

function CompareSlider({
  before,
  after,
  title,
  transparentLabel,
  originalLabel,
  compareLabel,
}: {
  before: string;
  after: string;
  title: string;
  transparentLabel: string;
  originalLabel: string;
  compareLabel: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(58);
  function move(clientX: number) {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect?.width) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setSplit(Math.min(92, Math.max(8, next)));
  }
  return (
    <div
      ref={frame}
      role="slider"
      tabIndex={0}
      aria-label={compareLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(split)}
      aria-valuetext={`${transparentLabel} / ${originalLabel}`}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event.clientX);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          move(event.clientX);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft')
          setSplit((value) => Math.max(8, value - 4));
        if (event.key === 'ArrowRight')
          setSplit((value) => Math.min(92, value + 4));
      }}
      className="focus-visible:outline-ring relative aspect-video cursor-ew-resize touch-none overflow-hidden rounded-xl border select-none focus-visible:outline-2"
    >
      <div className="absolute inset-0 bg-[conic-gradient(var(--color-secondary)_25%,transparent_0_50%,var(--color-secondary)_0_75%,transparent_0)] bg-[length:20px_20px]" />
      <Image
        src={after}
        alt=""
        fill
        draggable={false}
        sizes="(min-width: 768px) 560px, 100vw"
        className="pointer-events-none object-contain [image-rendering:pixelated]"
      />
      <Image
        src={before}
        alt={title}
        fill
        draggable={false}
        sizes="(min-width: 768px) 560px, 100vw"
        className="pointer-events-none object-contain [image-rendering:pixelated]"
        style={{ clipPath: `inset(0 0 0 ${split}%)` }}
      />
      <div
        className="bg-background pointer-events-none absolute inset-y-0 w-0.5"
        style={{ left: `${split}%` }}
      />
      <div
        className="border-border bg-background pointer-events-none absolute top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border shadow-md"
        style={{ left: `${split}%` }}
      >
        <ArrowLeftRight size={16} aria-hidden="true" />
      </div>
      <span className="bg-background/90 absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-xs">
        {transparentLabel}
      </span>
      <span className="bg-background/90 absolute right-3 bottom-3 rounded-full px-2.5 py-1 text-xs">
        {originalLabel}
      </span>
    </div>
  );
}

export function FeatureCompare({
  items,
  transparentLabel,
  originalLabel,
  compareLabel,
}: {
  items: Example[];
  transparentLabel: string;
  originalLabel: string;
  compareLabel: string;
}) {
  return (
    <div className="grid gap-16 md:gap-24">
      {items.map((item, index) => (
        <article
          key={item.title}
          className="grid items-center gap-8 md:grid-cols-2 md:gap-14"
        >
          <div className={index % 2 ? 'md:order-2' : undefined}>
            <p className="text-primary font-mono text-[11px] font-bold tracking-[0.12em]">
              {String(index + 1).padStart(2, '0')}
            </p>
            <h3 className="mt-4 max-w-md text-[26px] leading-tight font-medium">
              {item.title}
            </h3>
            <p className="text-muted-foreground mt-3 max-w-md text-sm leading-[1.7]">
              {item.text}
            </p>
          </div>
          <CompareSlider
            before={item.before}
            after={item.after}
            title={item.title}
            transparentLabel={transparentLabel}
            originalLabel={originalLabel}
            compareLabel={compareLabel}
          />
        </article>
      ))}
    </div>
  );
}
