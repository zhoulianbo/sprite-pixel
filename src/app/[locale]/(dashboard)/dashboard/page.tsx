import { getTranslations } from 'next-intl/server';

import { Empty, SmartIcon } from '@/shared/blocks/common';
import { MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { ApikeyStatus, getApikeysCount } from '@/shared/models/apikey';
import { getRemainingCredits } from '@/shared/models/credit';
import {
  getOrders,
  getOrdersCount,
  Order,
  OrderStatus,
} from '@/shared/models/order';
import { getSubscriptionsCount } from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/models/user';
import { Table } from '@/shared/types/blocks/table';

function formatOrderAmount(order: Order, locale: string) {
  const currency = (order.paymentCurrency || order.currency || 'USD')
    .toUpperCase()
    .trim();
  const amount = (order.paymentAmount || order.amount || 0) / 100;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getUserInfo();

  if (!user) {
    return <Empty message="no auth" />;
  }

  const t = await getTranslations('dashboard');
  const [
    remainingCredits,
    activeApiKeys,
    paidOrders,
    subscriptions,
    recentOrders,
  ] = await Promise.all([
    getRemainingCredits(user.id),
    getApikeysCount({
      userId: user.id,
      status: ApikeyStatus.ACTIVE,
    }),
    getOrdersCount({
      userId: user.id,
      status: OrderStatus.PAID,
    }),
    getSubscriptionsCount({ userId: user.id }),
    getOrders({
      userId: user.id,
      status: OrderStatus.PAID,
      page: 1,
      limit: 8,
    }),
  ]);

  const summaries = [
    {
      title: t('summaries.credits.title'),
      value: remainingCredits,
      description: t('summaries.credits.description'),
      icon: 'Coins',
    },
    {
      title: t('summaries.api_keys.title'),
      value: activeApiKeys,
      description: t('summaries.api_keys.description'),
      icon: 'KeyRound',
    },
    {
      title: t('summaries.payments.title'),
      value: paidOrders,
      description: t('summaries.payments.description'),
      icon: 'ReceiptText',
    },
    {
      title: t('summaries.subscriptions.title'),
      value: subscriptions,
      description: t('summaries.subscriptions.description'),
      icon: 'RefreshCw',
    },
  ];

  const table: Table = {
    columns: [
      {
        name: 'orderNo',
        title: t('recent.columns.order_no'),
        type: 'copy',
      },
      {
        name: 'productName',
        title: t('recent.columns.product'),
        placeholder: '-',
      },
      {
        name: 'status',
        title: t('recent.columns.status'),
        type: 'label',
        metadata: { variant: 'outline' },
      },
      {
        name: 'paymentType',
        title: t('recent.columns.type'),
        type: 'label',
        metadata: { variant: 'outline' },
      },
      {
        title: t('recent.columns.amount'),
        callback: (order: Order) => formatOrderAmount(order, locale),
      },
      {
        name: 'createdAt',
        title: t('recent.columns.created_at'),
        type: 'time',
      },
    ],
    data: recentOrders,
    emptyMessage: t('recent.empty'),
  };

  return (
    <div className="space-y-8">
      <MainHeader title={t('title')} description={t('description')} />

      <section
        aria-label={t('summaries.label')}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {summaries.map((summary) => (
          <Card key={summary.title} className="gap-4 py-5 shadow-none">
            <CardHeader className="grid grid-cols-[1fr_auto] items-start gap-3 px-5">
              <div className="space-y-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {summary.title}
                </CardTitle>
                <div className="text-3xl font-semibold tracking-tight">
                  {summary.value}
                </div>
              </div>
              <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg border">
                <SmartIcon name={summary.icon} size={17} />
              </div>
            </CardHeader>
            <CardContent className="text-muted-foreground px-5 text-xs">
              {summary.description}
            </CardContent>
          </Card>
        ))}
      </section>

      <TableCard
        title={t('recent.title')}
        description={t('recent.description')}
        table={table}
      />
    </div>
  );
}
