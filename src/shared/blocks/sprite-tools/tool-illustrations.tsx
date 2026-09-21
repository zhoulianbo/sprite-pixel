import {
  ArrowDown,
  FileArchive,
  FileImage,
  FileJson,
  Play,
} from 'lucide-react';

const sheet = '/imgs/demo/raccoon-forge-sprite-sheet-v1.webp';
export function SpriteArt({
  frame = 0,
  row = 1,
  className = '',
}: {
  frame?: number;
  row?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`block aspect-[3/4] bg-no-repeat ${className}`}
      style={{
        backgroundImage: `url(${sheet})`,
        backgroundSize: '800% 400%',
        backgroundPosition: `${(frame / 7) * 100}% ${(row / 3) * 100}%`,
        imageRendering: 'pixelated',
      }}
    />
  );
}
export function ToolIllustration({
  kind,
  splitter,
  labels,
  className = '',
}: {
  kind: 'workflow' | 'alignment' | 'motion';
  splitter: boolean;
  labels: {
    source: string;
    result: string;
    alignment: string;
    motion: string;
    selected: string;
    baseline: string;
  };
  className?: string;
}) {
  return (
    <div
      className={`bg-vault-navy relative flex min-h-[320px] flex-col justify-center overflow-hidden p-5 sm:min-h-[380px] sm:p-8 ${className}`}
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:24px_24px]" />
      {kind === 'workflow' ? (
        <div className="relative">
          <div className="text-muted-foreground mb-5 flex items-center justify-between font-mono text-[10px] tracking-wider">
            <span>{labels.source}</span>
            <span>{splitter ? '4 × 2' : '08 PNG'}</span>
          </div>
          <div
            className={`grid grid-cols-4 ${splitter ? 'border-accent-foreground/40 border-t border-l' : 'gap-2'}`}
          >
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className={`relative ${splitter ? `border-accent-foreground/40 border-r border-b ${i < 4 ? 'bg-accent-foreground/10' : 'opacity-30'}` : 'border-border bg-background/70 border'}`}
              >
                <SpriteArt frame={i} className="mx-auto w-full max-w-[70px]" />
                <span className="text-accent-foreground absolute top-1 left-1 font-mono text-[9px]">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
          <div className="text-primary my-4 flex items-center gap-3">
            <ArrowDown size={17} />
            <span className="font-mono text-[10px] tracking-wide">
              {labels.result}
            </span>
          </div>
          <div className="border-primary/25 bg-primary/5 flex items-center justify-between gap-3 border p-4">
            <div className="flex items-center gap-3">
              {splitter ? (
                <FileArchive size={24} className="text-primary" />
              ) : (
                <FileImage size={24} className="text-primary" />
              )}
              <div className="font-mono text-xs">
                <p>{splitter ? 'sprite-frames.zip' : 'sprite-sheet.png'}</p>
                <p className="text-muted-foreground mt-1 text-[10px]">
                  {splitter
                    ? '01.png · 02.png · 03.png · 04.png'
                    : '+ sprite-sheet.json'}
                </p>
              </div>
            </div>
            {!splitter && (
              <FileJson size={20} className="text-muted-foreground" />
            )}
          </div>
        </div>
      ) : kind === 'alignment' ? (
        <div className="relative">
          <div className="text-muted-foreground mb-8 flex justify-between font-mono text-[10px] tracking-wide">
            <span>{splitter ? labels.selected : labels.alignment}</span>
            <span>{splitter ? '01 → 04' : '1:1'}</span>
          </div>
          <div className="border-accent-foreground flex items-end justify-center gap-3 border-b border-dashed pb-0">
            {[0, 2, 4, 6].map((frame, i) => (
              <div
                key={frame}
                className={`relative flex h-44 min-w-0 flex-1 items-end justify-center border-x border-t ${splitter && i > 1 ? 'border-border opacity-25' : 'border-accent-foreground/40 bg-accent-foreground/5'}`}
              >
                <SpriteArt
                  frame={frame}
                  row={1}
                  className={
                    i % 2 ? 'w-full max-w-[90px]' : 'w-full max-w-[65px]'
                  }
                />
                <span className="text-accent-foreground absolute top-2 left-2 font-mono text-[10px]">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
          <div className="text-accent-foreground mt-4 flex justify-between font-mono text-[10px]">
            <span>{splitter ? '✓ 01   ✓ 02' : labels.baseline}</span>
            <span>PNG / α</span>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="text-muted-foreground flex items-center justify-between font-mono text-[10px] tracking-wider">
            <span>{labels.motion}</span>
            <span>12 FPS</span>
          </div>
          <SpriteArt frame={3} row={1} className="mx-auto w-40 sm:w-44" />
          <div className="border-border flex items-center gap-3 border-t pt-4">
            <span className="bg-primary text-primary-foreground flex h-9 w-9 shrink-0 items-center justify-center">
              <Play size={15} />
            </span>
            <div className="flex flex-1 gap-1">
              {Array.from({ length: 8 }, (_, i) => (
                <span
                  key={i}
                  className={`h-6 flex-1 ${i === 3 ? 'border-accent-foreground bg-accent-foreground/20 border' : 'bg-secondary'}`}
                />
              ))}
            </div>
            <span className="text-muted-foreground font-mono text-xs">
              04 / 08
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
