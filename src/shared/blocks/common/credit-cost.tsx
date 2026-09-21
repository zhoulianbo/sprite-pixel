import { Coins } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

export function CreditCostMark({
  credits,
  className,
}: {
  credits: number;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="bg-current/40 h-3.5 w-px shrink-0" aria-hidden="true" />
      <Coins className="size-3.5" aria-hidden="true" />
      <span className="font-mono tabular-nums">{credits}</span>
    </span>
  );
}
