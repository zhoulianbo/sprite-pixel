'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  PricingItem,
  Pricing as PricingSection,
} from '@/shared/types/blocks/pricing';
import { Pricing } from '@/themes/default/blocks/pricing';

function monthlyPaidPlans(section: PricingSection): PricingItem[] {
  return (section.items ?? [])
    .filter(
      (item) =>
        item.group === 'monthly' &&
        item.amount > 0 &&
        (item.product_id.startsWith('indie') ||
          item.product_id.startsWith('pro'))
    )
    .map((item) => ({
      ...item,
      group: undefined,
      tip: undefined,
      features: item.features?.slice(0, 2),
    }));
}

export function PaywallDialog({
  open,
  onOpenChange,
  projectLimit,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectLimit?: number;
  title?: string;
  description?: string;
}) {
  const t = useTranslations('workspace.paywall');
  const pricing = useTranslations('pages.pricing');
  const source = pricing.raw('page.sections.pricing') as PricingSection;
  const section: PricingSection = {
    items: monthlyPaidPlans(source),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl p-5 sm:max-w-3xl sm:p-6">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="font-heading text-2xl">
            {title ?? t('projectsTitle')}
          </DialogTitle>
          <DialogDescription className="text-sm leading-6">
            {description ??
              t('projectsDescription', { limit: projectLimit ?? 1 })}
          </DialogDescription>
        </DialogHeader>
        <Pricing compact section={section} />
        <div className="flex justify-center">
          <Button asChild variant="outline">
            <Link href="/pricing">{t('viewDetails')}</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
