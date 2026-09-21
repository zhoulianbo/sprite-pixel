'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Check, CircleCheck, Coins, Loader2, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { SmartIcon } from '@/shared/blocks/common';
import { PaymentModal } from '@/shared/blocks/payment/payment-modal';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useAppContext } from '@/shared/contexts/app';
import { getCookie } from '@/shared/lib/cookie';
import { cn } from '@/shared/lib/utils';
import { Subscription } from '@/shared/models/subscription';
import {
  PricingCompareColumn,
  PricingCurrency,
  PricingItem,
  Pricing as PricingType,
} from '@/shared/types/blocks/pricing';

// Helper function to get all available currencies from a pricing item
function getCurrenciesFromItem(item: PricingItem | null): PricingCurrency[] {
  if (!item) return [];

  // Always include the default currency first
  const defaultCurrency: PricingCurrency = {
    currency: item.currency,
    amount: item.amount,
    price: item.price || '',
    original_price: item.original_price || '',
  };

  // Add additional currencies if available
  if (item.currencies && item.currencies.length > 0) {
    return [defaultCurrency, ...item.currencies];
  }

  return [defaultCurrency];
}

function getCompareColumn(
  column: string | PricingCompareColumn
): PricingCompareColumn {
  return typeof column === 'string' ? { title: column } : column;
}

function isAffirmativeValue(value: string) {
  return ['yes', 'y', 'true', '支持', '✓', '✔'].includes(
    value.trim().toLowerCase()
  );
}

function isNegativeValue(value: string) {
  return ['—', '–', '-', 'no', 'n', 'false', '×', '✗'].includes(
    value.trim().toLowerCase()
  );
}

function SectionEyebrow({
  icon: Icon,
  children,
}: {
  icon: typeof CircleCheck;
  children: ReactNode;
}) {
  return (
    <div className="text-primary mb-4 inline-flex items-center gap-1.5 text-sm font-medium">
      <Icon className="size-4" aria-hidden="true" />
      {children}
    </div>
  );
}

// Helper function to select initial currency based on locale
function getInitialCurrency(
  currencies: PricingCurrency[],
  locale: string,
  defaultCurrency: string
): string {
  if (currencies.length === 0) return defaultCurrency;

  // If locale is 'zh', prefer CNY
  if (locale === 'zh') {
    const cnyCurrency = currencies.find(
      (c) => c.currency.toLowerCase() === 'cny'
    );
    if (cnyCurrency) {
      return cnyCurrency.currency;
    }
  }

  // Otherwise return default currency
  return defaultCurrency;
}

export function Pricing({
  section,
  className,
  currentSubscription,
  compact = false,
}: {
  section: PricingType;
  className?: string;
  currentSubscription?: Subscription;
  compact?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations('pages.pricing.messages');

  const {
    user,
    isShowPaymentModal,
    setIsShowSignModal,
    setIsShowPaymentModal,
    configs,
  } = useAppContext();
  const currentSubscriptionProductId =
    currentSubscription?.productId || user?.currentSubscriptionProductId;

  const [group, setGroup] = useState(() => {
    const featuredGroup = section.groups?.find((g) => g.is_featured);
    return featuredGroup?.name || section.groups?.[0]?.name;
  });

  // current pricing item
  const [pricingItem, setPricingItem] = useState<PricingItem | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);

  // Currency state management for each item
  // Store selected currency and displayed item for each product_id
  const [itemCurrencies, setItemCurrencies] = useState<
    Record<string, { selectedCurrency: string; displayedItem: PricingItem }>
  >({});

  // Initialize currency states for all items
  useEffect(() => {
    if (section.items && section.items.length > 0) {
      const initialCurrencyStates: Record<
        string,
        { selectedCurrency: string; displayedItem: PricingItem }
      > = {};

      section.items.forEach((item) => {
        const currencies = getCurrenciesFromItem(item);
        const selectedCurrency = getInitialCurrency(
          currencies,
          locale,
          item.currency
        );

        // Create displayed item with selected currency
        const currencyData = currencies.find(
          (c) => c.currency.toLowerCase() === selectedCurrency.toLowerCase()
        );

        const displayedItem = currencyData
          ? {
              ...item,
              currency: currencyData.currency,
              amount: currencyData.amount,
              price: currencyData.price,
              original_price: currencyData.original_price,
              // Override with currency-specific payment settings if available
              payment_product_id:
                currencyData.payment_product_id || item.payment_product_id,
              payment_providers:
                currencyData.payment_providers || item.payment_providers,
            }
          : item;

        initialCurrencyStates[item.product_id] = {
          selectedCurrency,
          displayedItem,
        };
      });

      setItemCurrencies(initialCurrencyStates);
    }
  }, [section.items, locale]);

  // Handler for currency change
  const handleCurrencyChange = (productId: string, currency: string) => {
    const item = section.items?.find((i) => i.product_id === productId);
    if (!item) return;

    const currencies = getCurrenciesFromItem(item);
    const currencyData = currencies.find(
      (c) => c.currency.toLowerCase() === currency.toLowerCase()
    );

    if (currencyData) {
      const displayedItem = {
        ...item,
        currency: currencyData.currency,
        amount: currencyData.amount,
        price: currencyData.price,
        original_price: currencyData.original_price,
        // Override with currency-specific payment settings if available
        payment_product_id:
          currencyData.payment_product_id || item.payment_product_id,
        payment_providers:
          currencyData.payment_providers || item.payment_providers,
      };

      setItemCurrencies((prev) => ({
        ...prev,
        [productId]: {
          selectedCurrency: currency,
          displayedItem,
        },
      }));
    }
  };

  const handlePayment = async (item: PricingItem) => {
    if (!item.amount) {
      return;
    }

    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    // Use displayed item with selected currency
    const displayedItem =
      itemCurrencies[item.product_id]?.displayedItem || item;

    if (configs.select_payment_enabled === 'true') {
      setPricingItem(displayedItem);
      setIsShowPaymentModal(true);
    } else {
      handleCheckout(displayedItem, configs.default_payment_provider);
    }
  };

  const getAffiliateMetadata = ({
    paymentProvider,
  }: {
    paymentProvider: string;
  }) => {
    const affiliateMetadata: Record<string, string> = {};

    // get Affonso referral
    if (
      configs.affonso_enabled === 'true' &&
      ['stripe', 'creem'].includes(paymentProvider)
    ) {
      const affonsoReferral = getCookie('affonso_referral') || '';
      affiliateMetadata.affonso_referral = affonsoReferral;
    }

    // get PromoteKit referral
    if (
      configs.promotekit_enabled === 'true' &&
      ['stripe'].includes(paymentProvider)
    ) {
      const promotekitReferral =
        typeof window !== 'undefined' && (window as any).promotekit_referral
          ? (window as any).promotekit_referral
          : getCookie('promotekit_referral') || '';
      affiliateMetadata.promotekit_referral = promotekitReferral;
    }

    return affiliateMetadata;
  };

  const handleCheckout = async (
    item: PricingItem,
    paymentProvider?: string
  ) => {
    try {
      if (!user) {
        setIsShowSignModal(true);
        return;
      }

      const affiliateMetadata = getAffiliateMetadata({
        paymentProvider: paymentProvider || '',
      });

      const params = {
        product_id: item.product_id,
        currency: item.currency,
        locale: locale || 'en',
        payment_provider: paymentProvider || '',
        metadata: affiliateMetadata,
      };

      setIsLoading(true);
      setProductId(item.product_id);

      const response = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (response.status === 401) {
        setIsLoading(false);
        setProductId(null);
        setPricingItem(null);
        setIsShowSignModal(true);
        return;
      }

      if (!response.ok) {
        throw new Error(`request failed with status ${response.status}`);
      }

      const { code, message, data } = await response.json();
      if (code !== 0) {
        throw new Error(message);
      }

      const { checkoutUrl } = data;
      if (!checkoutUrl) {
        throw new Error('checkout url not found');
      }

      window.location.href = checkoutUrl;
    } catch (e: any) {
      console.log('checkout failed: ', e);
      toast.error('checkout failed: ' + e.message);

      setIsLoading(false);
      setProductId(null);
    }
  };

  useEffect(() => {
    if (section.items) {
      const featuredItem = section.items.find((i) => i.is_featured);
      setProductId(featuredItem?.product_id || section.items[0]?.product_id);
      setIsLoading(false);
    }
  }, [section.items]);

  const visibleItems =
    section.items?.filter((item) => !item.group || item.group === group) || [];
  const showPacksIntro = group === 'one-time' && section.packs_title;

  return (
    <section
      id={compact ? undefined : section.id}
      className={cn(section.className, className)}
    >
      <div className={cn(!compact && 'py-24 md:py-36')}>
      {!compact ? (
        <div className="mx-auto mb-12 px-4 text-center md:px-8">
          {section.sr_only_title && (
            <h1 className="sr-only">{section.sr_only_title}</h1>
          )}
          <h2 className="mb-6 text-3xl font-bold text-pretty lg:text-4xl">
            {section.title}
          </h2>
          <p className="text-muted-foreground mx-auto mb-4 max-w-2xl text-pretty lg:text-lg">
            {section.description}
          </p>
        </div>
      ) : null}

      <div className={cn(!compact && 'container')}>
        {section.groups && section.groups.length > 0 && (
          <div
            className={cn(
              'mx-auto flex w-full justify-center md:max-w-2xl',
              compact ? 'mb-10' : 'mt-8 mb-16'
            )}
          >
            <Tabs value={group} onValueChange={setGroup}>
              <TabsList className="h-auto min-h-10 flex-wrap">
                {section.groups.map((item, i) => {
                  return (
                    <TabsTrigger key={i} value={item.name || ''}>
                      {item.title}
                      {item.label && (
                        <Badge className="ml-2">{item.label}</Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>
        )}

        {showPacksIntro ? (
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h3 className="text-xl font-semibold">{section.packs_title}</h3>
            {section.packs_description ? (
              <p className="text-muted-foreground mt-2 text-sm lg:text-base">
                {section.packs_description}
              </p>
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            'mx-auto mt-0 grid w-full gap-6',
            visibleItems.length >= 3
              ? 'md:grid-cols-3'
              : visibleItems.length === 2
                ? 'md:grid-cols-2'
                : 'md:grid-cols-1'
          )}
        >
          {visibleItems.map((item: PricingItem, idx) => {
            const isFreePlan = !item.amount;
            let isCurrentPlan = false;
            if (currentSubscriptionProductId === item.product_id) {
              isCurrentPlan = true;
            } else if (user && !currentSubscriptionProductId && isFreePlan) {
              isCurrentPlan = true;
            }

            const currencyState = itemCurrencies[item.product_id];
            const displayedItem = currencyState?.displayedItem || item;
            const selectedCurrency =
              currencyState?.selectedCurrency || item.currency;
            const currencies = getCurrenciesFromItem(item);
            const showCurrencySelect =
              item.group !== 'one-time' && currencies.length > 1;
            const freeHref = user
              ? '/dashboard'
              : item.button?.url || '/sign-up';

            return (
              <Card
                key={idx}
                className={cn(
                  'relative',
                  item.is_featured && 'border-accent-foreground/40 bg-accent/20'
                )}
              >
                {item.label && (
                  <span className="absolute inset-x-0 -top-3 mx-auto flex h-6 w-fit items-center rounded-full bg-linear-to-br/increasing from-purple-400 to-amber-300 px-3 py-1 text-xs font-medium text-amber-950 ring-1 ring-white/20 ring-offset-1 ring-offset-gray-950/5 ring-inset">
                    {item.label}
                  </span>
                )}

                <CardHeader>
                  <CardTitle className="font-medium">
                    <h3 className="text-sm font-medium">{item.title}</h3>
                  </CardTitle>

                  <div className="my-3 flex items-baseline gap-2">
                    {displayedItem.original_price && (
                      <span className="text-muted-foreground text-sm line-through">
                        {displayedItem.original_price}
                      </span>
                    )}

                    <div className="my-3 block text-2xl font-semibold">
                      <span className="text-primary">
                        {displayedItem.price}
                      </span>{' '}
                      {displayedItem.unit ? (
                        <span className="text-muted-foreground text-sm font-normal">
                          {displayedItem.unit}
                        </span>
                      ) : (
                        ''
                      )}
                    </div>

                    {showCurrencySelect && (
                      <Select
                        value={selectedCurrency}
                        onValueChange={(currency) =>
                          handleCurrencyChange(item.product_id, currency)
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          className="border-muted-foreground/30 bg-background/50 h-6 min-w-[60px] px-2 text-xs"
                        >
                          <SelectValue placeholder="Currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem
                              key={currency.currency}
                              value={currency.currency}
                              className="text-xs"
                            >
                              {currency.currency.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <CardDescription className="text-sm">
                    {item.description}
                  </CardDescription>
                  {item.tip && (
                    <span className="text-muted-foreground text-sm">
                      {item.tip}
                    </span>
                  )}

                  {isCurrentPlan ? (
                    <Button
                      variant="outline"
                      className="mt-4 h-9 w-full px-4 py-2"
                      disabled
                    >
                      <span className="hidden text-sm md:block">
                        {t('current_plan')}
                      </span>
                    </Button>
                  ) : isFreePlan ? (
                    <Button
                      asChild
                      variant="outline"
                      className="mt-4 h-9 w-full px-4 py-2"
                    >
                      <Link href={freeHref}>
                        {item.button?.icon && (
                          <SmartIcon
                            name={item.button?.icon as string}
                            className="size-4"
                          />
                        )}
                        <span className="block">{item.button?.title}</span>
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handlePayment(item)}
                      disabled={isLoading}
                      className={cn(
                        'focus-visible:ring-ring inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
                        'mt-4 h-9 w-full px-4 py-2',
                        'bg-primary text-primary-foreground hover:bg-primary/90 border-[0.5px] border-white/25 shadow-md shadow-black/20'
                      )}
                    >
                      {isLoading && item.product_id === productId ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          <span className="block">{t('processing')}</span>
                        </>
                      ) : (
                        <>
                          {item.button?.icon && (
                            <SmartIcon
                              name={item.button?.icon as string}
                              className="size-4"
                            />
                          )}
                          <span className="block">{item.button?.title}</span>
                        </>
                      )}
                    </Button>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  <hr className="border-dashed" />

                  {item.features_title && (
                    <p className="text-sm font-medium">{item.features_title}</p>
                  )}
                  <ul className="list-outside space-y-3 text-sm">
                    {item.features?.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="size-3" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      </div>

      {!compact && section.compare?.rows?.length ? (
        <div className="bg-vault-navy py-24 md:py-28">
          <div className="container">
            {section.compare.badge ? (
              <SectionEyebrow icon={CircleCheck}>
                {section.compare.badge}
              </SectionEyebrow>
            ) : null}
            {section.compare.title ? (
              <h3 className="mb-3 text-2xl font-semibold lg:text-3xl">
                {section.compare.title}
              </h3>
            ) : null}
            {section.compare.description ? (
              <p className="text-muted-foreground mb-10 max-w-3xl text-sm leading-6 lg:text-base">
                {section.compare.description}
              </p>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr>
                    <th className="text-muted-foreground px-5 py-4 font-medium">
                      {section.compare.feature_label}
                    </th>
                    {section.compare.columns?.map((column) => {
                      const item = getCompareColumn(column);
                      return (
                        <th
                          key={item.title}
                          className={cn(
                            'border-border border-l px-5 py-4 font-semibold',
                            item.featured && 'bg-card'
                          )}
                        >
                          <span className="inline-flex flex-wrap items-center gap-2">
                            {item.title}
                            {item.label ? (
                              <Badge
                                variant={item.featured ? 'default' : 'outline'}
                                className={cn(
                                  'rounded-full',
                                  !item.featured &&
                                    'border-primary/40 bg-primary/10 text-primary'
                                )}
                              >
                                {item.label}
                              </Badge>
                            ) : null}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {section.compare.rows.map((row, rowIndex) => {
                    const isLast = rowIndex === section.compare!.rows!.length - 1;
                    return (
                      <tr
                        key={row.key || row.label}
                        className="border-border border-t"
                      >
                        <th className="px-5 py-4 font-medium">{row.label}</th>
                        {row.values.map((value, index) => {
                          const column = getCompareColumn(
                            section.compare!.columns?.[index] || ''
                          );
                          const showBoolean = row.kind === 'boolean';
                          const yes = showBoolean && isAffirmativeValue(value);
                          const no = showBoolean && isNegativeValue(value);

                          return (
                            <td
                              key={`${row.label}-${index}`}
                              className={cn(
                                'border-border border-l px-5 py-4',
                                column.featured && 'bg-card'
                              )}
                            >
                              {showBoolean && (yes || no) ? (
                                <span
                                  className="inline-flex"
                                  title={value}
                                  aria-label={value}
                                >
                                  {yes ? (
                                    <Check
                                      className="text-primary size-4"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <X
                                      className="text-muted-foreground size-4"
                                      aria-hidden="true"
                                    />
                                  )}
                                </span>
                              ) : (
                                value
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {!compact &&
      (section.credits_guide?.rows?.length || section.rules?.items?.length) ? (
        <div className="py-24 md:py-28">
          <div className="container grid gap-6 md:grid-cols-2 lg:gap-8">
            {section.credits_guide?.rows?.length ? (
              <div className="border-border bg-card rounded-xl border p-6 md:p-8">
                {section.credits_guide.badge ? (
                  <SectionEyebrow icon={Coins}>
                    {section.credits_guide.badge}
                  </SectionEyebrow>
                ) : null}
                {section.credits_guide.title ? (
                  <h3 className="mb-6 text-xl font-semibold lg:text-2xl">
                    {section.credits_guide.title}
                  </h3>
                ) : null}
                <ul className="space-y-2.5">
                  {section.credits_guide.rows.map((row) => (
                    <li
                      key={row.action}
                      className="bg-background flex items-center justify-between gap-4 rounded-lg px-4 py-3 text-sm"
                    >
                      <span>{row.action}</span>
                      <span className="text-primary shrink-0 font-medium">
                        {row.cost}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {section.rules?.items?.length ? (
              <div className="border-border bg-card rounded-xl border p-6 md:p-8">
                {section.rules.badge ? (
                  <SectionEyebrow icon={CircleCheck}>
                    {section.rules.badge}
                  </SectionEyebrow>
                ) : null}
                {section.rules.title ? (
                  <h3 className="mb-3 text-xl font-semibold lg:text-2xl">
                    {section.rules.title}
                  </h3>
                ) : null}
                {section.rules.description ? (
                  <p className="text-muted-foreground mb-6 text-sm leading-6">
                    {section.rules.description}
                  </p>
                ) : null}
                <ul className="space-y-2.5">
                  {section.rules.items.map((rule) => (
                    <li
                      key={rule.title}
                      className="bg-background flex items-start gap-3 rounded-lg px-4 py-3 text-sm"
                    >
                      <Check
                        className="text-primary mt-0.5 size-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="leading-6">
                        <span className="font-medium">{rule.title}</span>
                        {rule.description ? ` ${rule.description}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <PaymentModal
        isLoading={isLoading}
        pricingItem={pricingItem}
        onCheckout={(item, paymentProvider) =>
          handleCheckout(item, paymentProvider)
        }
      />
    </section>
  );
}
