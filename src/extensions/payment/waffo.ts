import { createPrivateKey } from 'node:crypto';
import {
  Environment,
  WaffoPancake,
  WebhookEventType,
  type CreateCheckoutSessionParams,
  type WebhookEvent,
  type WebhookEventData,
} from '@waffo/pancake-ts';

import {
  CheckoutSession,
  PaymentConfigs,
  PaymentEvent,
  PaymentEventType,
  PaymentInfo,
  PaymentInterval,
  PaymentOrder,
  PaymentProvider,
  PaymentSession,
  PaymentStatus,
  SubscriptionCycleType,
  SubscriptionInfo,
  SubscriptionStatus,
} from './types';

/**
 * Waffo Pancake payment provider configs.
 * @docs https://docs.waffo.ai/
 */
export interface WaffoConfigs extends PaymentConfigs {
  merchantId: string;
  privateKey: string;
  environment?: 'test' | 'prod';
  fetch?: typeof fetch;
}

/**
 * Admins only need to store the Base64 body of the downloaded API private key.
 * Full private-key PEM values remain supported for environment configurations.
 */
export function normalizeWaffoPrivateKey(rawPrivateKey: string) {
  const normalized = rawPrivateKey.trim().replace(/\\n/g, '\n');
  if (!normalized) {
    throw new Error('Waffo private key is empty');
  }
  if (/-----BEGIN (?:RSA )?PUBLIC KEY-----/.test(normalized)) {
    throw new Error(
      'Waffo checkout requires the downloaded API private key, not a public key'
    );
  }

  const isPkcs1 = normalized.includes('-----BEGIN RSA PRIVATE KEY-----');
  const isPkcs8 = normalized.includes('-----BEGIN PRIVATE KEY-----');
  const base64Body = normalized
    .replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----/g, '')
    .replace(/-----END (?:RSA )?PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');

  if (!base64Body || !/^[A-Za-z0-9+/]+=*$/.test(base64Body)) {
    throw new Error(
      'Waffo private key must contain only the Base64 body of the downloaded API private key'
    );
  }

  const wrappedBody = base64Body.match(/.{1,64}/g)!.join('\n');
  const labels = isPkcs1
    ? ['RSA PRIVATE KEY']
    : isPkcs8
      ? ['PRIVATE KEY']
      : ['PRIVATE KEY', 'RSA PRIVATE KEY'];

  for (const label of labels) {
    const privateKey = `-----BEGIN ${label}-----\n${wrappedBody}\n-----END ${label}-----`;
    try {
      createPrivateKey(privateKey);
      return privateKey;
    } catch {
      // Try the other supported private-key container for a headerless value.
    }
  }

  throw new Error(
    'Waffo key content is not a valid RSA private key. Use the downloaded API private key, not a public key'
  );
}

function normalizeMetadata(metadata?: Record<string, any>) {
  if (!metadata) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [
        key,
        typeof value === 'string' ? value : JSON.stringify(value),
      ])
  );
}

function getEventMetadata(data: WebhookEventData) {
  const metadata = { ...(data.orderMetadata || {}) };
  if (!metadata.order_no && data.orderMerchantExternalId) {
    metadata.order_no = data.orderMerchantExternalId;
  }
  return metadata;
}

function toMinorUnits(amount: string | undefined, currency: string) {
  const numericAmount = Number(amount || 0);
  if (!Number.isFinite(numericAmount)) {
    return 0;
  }

  let fractionDigits = 2;
  try {
    fractionDigits =
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    // Keep the conventional two-decimal fallback for an unknown currency.
  }

  return Math.round(numericAmount * 10 ** fractionDigits);
}

function mapBillingPeriod(billingPeriod?: string) {
  switch (billingPeriod) {
    case 'weekly':
      return { interval: PaymentInterval.WEEK, intervalCount: 1 };
    case 'monthly':
      return { interval: PaymentInterval.MONTH, intervalCount: 1 };
    case 'quarterly':
      return { interval: PaymentInterval.MONTH, intervalCount: 3 };
    case 'yearly':
      return { interval: PaymentInterval.YEAR, intervalCount: 1 };
    default:
      throw new Error(`Unknown Waffo billing period: ${billingPeriod}`);
  }
}

function mapSubscriptionStatus(status?: string) {
  switch (status) {
    case 'active':
      return SubscriptionStatus.ACTIVE;
    case 'canceling':
      return SubscriptionStatus.PENDING_CANCEL;
    case 'canceled':
      return SubscriptionStatus.CANCELED;
    case 'trialing':
      return SubscriptionStatus.TRIALING;
    case 'past_due':
      return SubscriptionStatus.PAUSED;
    default:
      throw new Error(`Unknown Waffo subscription status: ${status}`);
  }
}

function buildPaymentInfo(
  event: WebhookEvent<WebhookEventData>,
  cycleType?: SubscriptionCycleType
): PaymentInfo {
  const { data } = event;
  const currency = data.currency.toLowerCase();
  const paymentAmount = toMinorUnits(data.total || data.amount, currency);

  return {
    description: data.productName,
    transactionId: data.paymentId || event.eventId,
    amount: toMinorUnits(data.amount, currency),
    currency,
    paymentAmount,
    paymentCurrency: currency,
    paymentEmail: data.buyerEmail,
    paymentUserId: data.merchantProvidedBuyerIdentity,
    paidAt: data.paymentDate
      ? new Date(`${data.paymentDate}T00:00:00.000Z`)
      : new Date(event.timestamp),
    subscriptionCycleType: cycleType,
  };
}

function buildSubscriptionInfo(
  event: WebhookEvent<WebhookEventData>
): SubscriptionInfo {
  const { data } = event;
  if (!data.currentPeriodStart || !data.currentPeriodEnd) {
    throw new Error(
      `Waffo event ${event.eventType} is missing subscription period`
    );
  }

  const { interval, intervalCount } = mapBillingPeriod(data.billingPeriod);
  const status = mapSubscriptionStatus(data.orderStatus);
  const canceledAt = data.canceledAt
    ? new Date(data.canceledAt)
    : status === SubscriptionStatus.CANCELED
      ? new Date(event.timestamp)
      : undefined;

  return {
    subscriptionId: data.orderId,
    planId: data.productMetadata?.planId,
    description: data.productName,
    amount: toMinorUnits(data.amount, data.currency),
    currency: data.currency.toLowerCase(),
    interval,
    intervalCount,
    currentPeriodStart: new Date(data.currentPeriodStart),
    currentPeriodEnd: new Date(data.currentPeriodEnd),
    metadata: getEventMetadata(data),
    status,
    canceledAt,
    canceledEndAt:
      status === SubscriptionStatus.PENDING_CANCEL ||
      status === SubscriptionStatus.CANCELED
        ? new Date(data.currentPeriodEnd)
        : undefined,
  };
}

function buildBasePaymentSession(
  event: WebhookEvent<WebhookEventData>,
  cycleType?: SubscriptionCycleType
): PaymentSession {
  return {
    provider: 'waffo',
    paymentStatus: PaymentStatus.SUCCESS,
    paymentInfo: buildPaymentInfo(event, cycleType),
    paymentResult: event.data,
    metadata: getEventMetadata(event.data),
  };
}

function buildSubscriptionSession(
  event: WebhookEvent<WebhookEventData>,
  cycleType?: SubscriptionCycleType
): PaymentSession {
  return {
    ...buildBasePaymentSession(event, cycleType),
    subscriptionId: event.data.orderId,
    subscriptionInfo: buildSubscriptionInfo(event),
    subscriptionResult: event.data,
  };
}

/**
 * Convert a verified Waffo event into the template's provider-neutral event.
 * Waffo emits payment and subscription lifecycle events independently, so
 * payment_succeeded is acknowledged without granting access a second time.
 */
export function buildWaffoPaymentEvent(
  event: WebhookEvent<WebhookEventData>
): PaymentEvent {
  let eventType: PaymentEventType;
  let paymentSession: PaymentSession;

  switch (event.eventType) {
    case WebhookEventType.OrderCompleted:
      eventType = PaymentEventType.CHECKOUT_SUCCESS;
      paymentSession = buildBasePaymentSession(event);
      break;
    case WebhookEventType.SubscriptionActivated:
      eventType = PaymentEventType.CHECKOUT_SUCCESS;
      paymentSession = buildSubscriptionSession(
        event,
        SubscriptionCycleType.CREATE
      );
      break;
    case WebhookEventType.SubscriptionRenewed:
    case WebhookEventType.SubscriptionRecovered:
      eventType = PaymentEventType.PAYMENT_SUCCESS;
      paymentSession = buildSubscriptionSession(
        event,
        SubscriptionCycleType.RENEWAL
      );
      break;
    case WebhookEventType.SubscriptionPaymentSucceeded:
      eventType = PaymentEventType.EVENT_RECEIVED;
      paymentSession = {
        ...buildBasePaymentSession(event),
        subscriptionId: event.data.orderId,
      };
      break;
    case WebhookEventType.SubscriptionCanceled:
      eventType = PaymentEventType.SUBSCRIBE_CANCELED;
      paymentSession = buildSubscriptionSession(event);
      break;
    case WebhookEventType.SubscriptionCanceling:
    case WebhookEventType.SubscriptionUncanceled:
    case WebhookEventType.SubscriptionPastDue:
      eventType = PaymentEventType.SUBSCRIBE_UPDATED;
      paymentSession = buildSubscriptionSession(event);
      break;
    case WebhookEventType.SubscriptionPlanChanged:
    case WebhookEventType.SubscriptionPlanChangeScheduled:
    case WebhookEventType.SubscriptionPlanChangeFailed:
      // The current product does not initiate Waffo plan changes. Scheduled
      // and failed change events can refer to a new order without a billing
      // period, so acknowledge them without mutating the active subscription.
      eventType = PaymentEventType.EVENT_RECEIVED;
      paymentSession = {
        ...buildBasePaymentSession(event),
        subscriptionId: event.data.orderId,
      };
      break;
    case WebhookEventType.RefundSucceeded:
      eventType = PaymentEventType.PAYMENT_REFUNDED;
      paymentSession = buildBasePaymentSession(event);
      break;
    case WebhookEventType.RefundFailed:
      eventType = PaymentEventType.EVENT_RECEIVED;
      paymentSession = buildBasePaymentSession(event);
      break;
    default:
      throw new Error(`Unsupported Waffo event type: ${event.eventType}`);
  }

  return {
    eventType,
    eventResult: event,
    paymentSession,
  };
}

/**
 * Waffo Pancake payment provider implementation.
 * @website https://waffo.ai/
 */
export class WaffoProvider implements PaymentProvider {
  readonly name = 'waffo';
  configs: WaffoConfigs;

  constructor(configs: WaffoConfigs) {
    this.configs = configs;
  }

  private getClient() {
    if (!this.configs.merchantId || !this.configs.privateKey) {
      throw new Error('Waffo merchant ID or private key is not configured');
    }

    try {
      return new WaffoPancake({
        merchantId: this.configs.merchantId,
        privateKey: normalizeWaffoPrivateKey(this.configs.privateKey),
        environment:
          this.configs.environment === 'prod'
            ? Environment.Prod
            : Environment.Test,
        fetch: this.configs.fetch,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Invalid Waffo API private key. Paste only the Base64 body from the downloaded private key, not a public key. ${message}`
      );
    }
  }

  async createPayment({
    order,
  }: {
    order: PaymentOrder;
  }): Promise<CheckoutSession> {
    if (!order.productId) {
      throw new Error('Waffo productId is required');
    }
    if (!order.price?.currency) {
      throw new Error('Waffo checkout currency is required');
    }

    const metadata = normalizeMetadata(order.metadata);
    const payload: CreateCheckoutSessionParams = {
      productId: order.productId,
      currency: order.price.currency.toUpperCase(),
      buyerEmail: order.customer?.email,
      successUrl: order.successUrl,
      metadata,
      orderMerchantExternalId:
        order.orderNo || metadata?.order_no || order.requestId,
      darkMode: true,
    };

    const result = await this.getClient().checkout.createSession(payload);

    return {
      provider: this.name,
      checkoutParams: payload,
      checkoutInfo: {
        sessionId: result.sessionId,
        checkoutUrl: result.checkoutUrl,
      },
      checkoutResult: result,
      metadata: order.metadata || {},
    };
  }

  async getPaymentSession({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<PaymentSession> {
    // A browser return is not proof of payment. Waffo's signed webhook is the
    // source of truth and will transition the local order to paid.
    return {
      provider: this.name,
      paymentStatus: PaymentStatus.PROCESSING,
      paymentResult: { sessionId },
    };
  }

  async getPaymentEvent({ req }: { req: Request }): Promise<PaymentEvent> {
    const rawBody = await req.text();
    const signature = req.headers.get('x-waffo-signature');
    if (!rawBody || !signature) {
      throw new Error('Invalid Waffo webhook request');
    }

    const event = this.getClient().webhooks.verify<WebhookEventData>(
      rawBody,
      signature,
      {
        environment:
          this.configs.environment === 'prod'
            ? Environment.Prod
            : Environment.Test,
      }
    );

    return buildWaffoPaymentEvent(event);
  }

  async cancelSubscription({
    subscriptionId,
  }: {
    subscriptionId: string;
  }): Promise<PaymentSession> {
    const result = await this.getClient().orders.cancelSubscription({
      orderId: subscriptionId,
    });

    return {
      provider: this.name,
      subscriptionId: result.orderId,
      subscriptionResult: result,
    };
  }
}

export function createWaffoProvider(configs: WaffoConfigs): WaffoProvider {
  return new WaffoProvider(configs);
}
