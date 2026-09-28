'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Gift } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { PaywallDialog } from '@/shared/blocks/payment/paywall-dialog';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { useAppContext } from '@/shared/contexts/app';
import { calendarDateParts, DailyCheckInStatus } from '@/shared/lib/check-in';
import { cn } from '@/shared/lib/utils';

export function DailyCheckIn({
  initialStatus,
}: {
  initialStatus: DailyCheckInStatus | null;
}) {
  const t = useTranslations('workspace.checkIn');
  const locale = useLocale();
  const { fetchUserCredits } = useAppContext();
  const [status, setStatus] = useState(initialStatus);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [rewardCredits, setRewardCredits] = useState(
    initialStatus?.credits ?? 1
  );
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const successTimer = useRef<number | null>(null);
  const checkedIn = Boolean(status?.checkedInToday);

  useEffect(() => {
    return () => {
      if (successTimer.current) window.clearTimeout(successTimer.current);
    };
  }, []);

  function openCheckIn() {
    if (!status) {
      setPaywallOpen(true);
      return;
    }
    if (status.checkedInToday) return;
    setDialogOpen(true);
  }

  async function claim() {
    setClaiming(true);
    try {
      const response = await fetch('/api/check-in', { method: 'POST' });
      const payload = await response.json();
      if (
        response.status === 401 ||
        response.status === 403 ||
        payload?.message === 'UNAUTHORIZED' ||
        payload?.message === 'SUBSCRIPTION_REQUIRED'
      ) {
        setDialogOpen(false);
        setPaywallOpen(true);
        return;
      }
      if (!response.ok || payload?.code !== 0) {
        throw new Error(payload?.message || 'CHECK_IN_FAILED');
      }
      const next = payload.data as DailyCheckInStatus;
      setStatus(next);
      setRewardCredits(next.credits);
      void fetchUserCredits();
      successTimer.current = window.setTimeout(() => {
        setDialogOpen(false);
        setSuccessOpen(true);
      }, 420);
    } catch {
      toast.error(t('failed'));
    } finally {
      setClaiming(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={checkedIn ? 'secondary' : 'default'}
        disabled={checkedIn}
        onClick={openCheckIn}
        className={cn(
          'h-8 shrink-0 gap-2 px-3 text-sm',
          checkedIn
            ? 'border-border text-secondary-foreground disabled:opacity-100'
            : 'animate-check-in-glow motion-reduce:animate-none'
        )}
      >
        <Gift className="size-4" />
        {checkedIn ? t('checked') : t('button')}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-xl sm:max-w-xl">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle className="font-heading text-2xl">
              {t('title')}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {t('description')}
            </DialogDescription>
          </DialogHeader>

          {status ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="bg-secondary rounded-lg px-2 py-2 text-center">
                  <div className="text-primary font-medium">
                    +{status.credits}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {t('todayReward')}
                  </div>
                </div>
                <div className="bg-secondary rounded-lg px-2 py-2 text-center">
                  <div className="font-medium">{status.weekCount}</div>
                  <div className="text-muted-foreground text-xs">
                    {t('weekLabel')}
                  </div>
                </div>
                <div className="bg-secondary rounded-lg px-2 py-2 text-center">
                  <div className="font-medium">{status.streak}</div>
                  <div className="text-muted-foreground text-xs">
                    {t('streakLabel')}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {status.week.map((date) => {
                  const parts = calendarDateParts(date, locale);
                  const claimed = status.checkedDates.includes(date);
                  const isToday = date === status.today;
                  const claimable = isToday && !claimed;
                  return (
                    <div
                      key={date}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-lg border px-1 py-3',
                        isToday
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-card'
                      )}
                    >
                      <span className="text-muted-foreground text-xs">
                        {parts.weekday}
                      </span>
                      <span
                        className={cn(
                          'font-heading text-lg leading-none',
                          isToday && 'text-primary'
                        )}
                      >
                        {parts.day}
                      </span>
                      <div className="flex h-8 items-center justify-center">
                        {claimable ? (
                          <button
                            type="button"
                            aria-label={t('claimAria')}
                            disabled={claiming}
                            onClick={claim}
                            className="text-primary hover:bg-primary/15 flex size-8 items-center justify-center rounded-md disabled:opacity-60"
                          >
                            <Gift className="animate-check-in-nudge size-4 origin-center motion-reduce:animate-none" />
                          </button>
                        ) : claimed ? (
                          <span className="flex size-8 items-center justify-center text-emerald-400">
                            <Check className="size-4" strokeWidth={2.5} />
                          </span>
                        ) : (
                          <span className="bg-border size-1.5 rounded-full" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="rounded-xl sm:max-w-sm">
          <DialogHeader className="items-center text-center">
            <div className="bg-primary text-primary-foreground mb-1 flex size-12 items-center justify-center rounded-lg">
              <Gift className="size-5" />
            </div>
            <DialogTitle className="font-heading text-2xl">
              {t('successTitle', { credits: rewardCredits })}
            </DialogTitle>
          </DialogHeader>
          <Button type="button" onClick={() => setSuccessOpen(false)}>
            {t('successConfirm')}
          </Button>
        </DialogContent>
      </Dialog>

      <PaywallDialog
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        title={t('paywallTitle')}
        description={t('paywallDescription')}
      />
    </>
  );
}
