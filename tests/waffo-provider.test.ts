import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';
import {
  WebhookEventType,
  type WebhookEvent,
  type WebhookEventData,
} from '@waffo/pancake-ts';

import {
  PaymentEventType,
  PaymentInterval,
  PaymentStatus,
  SubscriptionCycleType,
  SubscriptionStatus,
} from '../src/extensions/payment/types';
import {
  buildWaffoPaymentEvent,
  normalizeWaffoPrivateKey,
  WaffoProvider,
} from '../src/extensions/payment/waffo';

function makeEvent(
  eventType: WebhookEventType,
  data: Partial<WebhookEventData> = {}
): WebhookEvent<WebhookEventData> {
  return {
    id: 'delivery-id',
    timestamp: '2026-09-20T12:00:00.000Z',
    eventType,
    eventId: 'business-event-id',
    storeId: 'STO_1234567890123456789012',
    storeName: 'SpritePixel',
    mode: 'test',
    data: {
      orderId: 'ORD_1234567890123456789012',
      orderStatus: 'active',
      buyerEmail: 'buyer@example.com',
      currency: 'USD',
      orderMetadata: { order_no: 'local-order-1' },
      amount: '29.00',
      taxAmount: '0.00',
      total: '29.00',
      productName: 'Pro Plan',
      billingPeriod: 'monthly',
      currentPeriodStart: '2026-09-20',
      currentPeriodEnd: '2026-10-20',
      ...data,
    },
  };
}

test('Waffo one-time completion maps metadata and minor-unit amount', () => {
  const result = buildWaffoPaymentEvent(
    makeEvent(WebhookEventType.OrderCompleted, {
      orderStatus: 'completed',
      orderMetadata: undefined,
      orderMerchantExternalId: 'local-order-external',
      paymentId: 'PAY_123',
    })
  );

  assert.equal(result.eventType, PaymentEventType.CHECKOUT_SUCCESS);
  assert.equal(result.paymentSession?.paymentStatus, PaymentStatus.SUCCESS);
  assert.equal(result.paymentSession?.paymentInfo?.paymentAmount, 2900);
  assert.equal(result.paymentSession?.paymentInfo?.transactionId, 'PAY_123');
  assert.equal(
    result.paymentSession?.metadata.order_no,
    'local-order-external'
  );
});

test('Waffo activation provisions the first subscription period once', () => {
  const result = buildWaffoPaymentEvent(
    makeEvent(WebhookEventType.SubscriptionActivated)
  );

  assert.equal(result.eventType, PaymentEventType.CHECKOUT_SUCCESS);
  assert.equal(
    result.paymentSession?.paymentInfo?.subscriptionCycleType,
    SubscriptionCycleType.CREATE
  );
  assert.equal(
    result.paymentSession?.subscriptionInfo?.status,
    SubscriptionStatus.ACTIVE
  );
  assert.equal(
    result.paymentSession?.subscriptionInfo?.interval,
    PaymentInterval.MONTH
  );
});

test('Waffo charge receipt is acknowledged without granting access again', () => {
  const result = buildWaffoPaymentEvent(
    makeEvent(WebhookEventType.SubscriptionPaymentSucceeded, {
      orderStatus: undefined,
      billingPeriod: undefined,
      currentPeriodStart: undefined,
      currentPeriodEnd: undefined,
      paymentId: 'PAY_renewal',
      periodNumber: 2,
    })
  );

  assert.equal(result.eventType, PaymentEventType.EVENT_RECEIVED);
  assert.equal(
    result.paymentSession?.subscriptionId,
    result.eventResult.data.orderId
  );
  assert.equal(result.paymentSession?.subscriptionInfo, undefined);
});

test('Waffo renewal carries a unique renewal key and new period', () => {
  const result = buildWaffoPaymentEvent(
    makeEvent(WebhookEventType.SubscriptionRenewed, {
      currency: 'JPY',
      amount: '3000',
      total: '3000',
      billingPeriod: 'quarterly',
    })
  );

  assert.equal(result.eventType, PaymentEventType.PAYMENT_SUCCESS);
  assert.equal(
    result.paymentSession?.paymentInfo?.subscriptionCycleType,
    SubscriptionCycleType.RENEWAL
  );
  assert.equal(result.paymentSession?.paymentInfo?.paymentAmount, 3000);
  assert.equal(result.paymentSession?.subscriptionInfo?.intervalCount, 3);
});

test('Waffo canceling keeps subscription access pending period end', () => {
  const result = buildWaffoPaymentEvent(
    makeEvent(WebhookEventType.SubscriptionCanceling, {
      orderStatus: 'canceling',
      canceledAt: '2026-09-20T12:00:00.000Z',
    })
  );

  assert.equal(result.eventType, PaymentEventType.SUBSCRIBE_UPDATED);
  assert.equal(
    result.paymentSession?.subscriptionInfo?.status,
    SubscriptionStatus.PENDING_CANCEL
  );
  assert.equal(
    result.paymentSession?.subscriptionInfo?.canceledEndAt?.toISOString(),
    '2026-10-20T00:00:00.000Z'
  );
});

test('Waffo pending plan changes without a period are safely acknowledged', () => {
  const result = buildWaffoPaymentEvent(
    makeEvent(WebhookEventType.SubscriptionPlanChangeScheduled, {
      orderStatus: 'pending',
      currentPeriodStart: undefined,
      currentPeriodEnd: undefined,
    })
  );

  assert.equal(result.eventType, PaymentEventType.EVENT_RECEIVED);
  assert.equal(result.paymentSession?.subscriptionInfo, undefined);
});

test('Waffo private key accepts only the Base64 body and adds private PEM markers', () => {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const privateKeyPem = privateKey
    .export({ type: 'pkcs8', format: 'pem' })
    .toString();
  const base64Body = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');

  const normalized = normalizeWaffoPrivateKey(base64Body);
  assert.match(normalized, /^-----BEGIN PRIVATE KEY-----\n/);
  assert.match(normalized, /\n-----END PRIVATE KEY-----$/);
  assert.equal(
    normalized.replace(/-----(?:BEGIN|END) PRIVATE KEY-----|\s/g, ''),
    base64Body
  );
});

test('Waffo private key rejects a public-key PEM with a clear error', () => {
  assert.throws(
    () =>
      normalizeWaffoPrivateKey(
        '-----BEGIN PUBLIC KEY-----\nZmFrZQ==\n-----END PUBLIC KEY-----'
      ),
    /not a public key/
  );
});

test('Waffo private key detects a headerless PKCS1 private key', () => {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const base64Body = privateKey
    .export({ type: 'pkcs1', format: 'pem' })
    .toString()
    .replace(/-----BEGIN RSA PRIVATE KEY-----/, '')
    .replace(/-----END RSA PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');

  assert.match(
    normalizeWaffoPrivateKey(base64Body),
    /^-----BEGIN RSA PRIVATE KEY-----\n/
  );
});

test('Waffo checkout uses the official SDK payload and keeps return pending', async () => {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  let requestBody: Record<string, unknown> | undefined;

  const privateKeyBody = privateKey
    .export({ type: 'pkcs8', format: 'pem' })
    .toString()
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');

  const provider = new WaffoProvider({
    merchantId: 'MER_1234567890123456789012',
    privateKey: privateKeyBody,
    environment: 'test',
    fetch: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body));
      return Response.json({
        data: {
          sessionId: 'checkout-session',
          checkoutUrl: 'https://checkout.waffo.ai/session',
          expiresAt: '2026-09-20T13:00:00.000Z',
        },
      });
    },
  });

  const checkout = await provider.createPayment({
    order: {
      productId: 'PROD_1234567890123456789012',
      price: { amount: 2900, currency: 'usd' },
      customer: { email: 'buyer@example.com' },
      successUrl: 'https://spritepixel.com/api/payment/callback?order_no=123',
      metadata: { order_no: '123', attempt: 1 },
    },
  });

  assert.equal(checkout.checkoutInfo.sessionId, 'checkout-session');
  assert.equal(requestBody?.currency, 'USD');
  assert.equal(requestBody?.orderMerchantExternalId, '123');
  assert.deepEqual(requestBody?.metadata, { order_no: '123', attempt: '1' });

  const returnedSession = await provider.getPaymentSession({
    sessionId: 'checkout-session',
  });
  assert.equal(returnedSession.paymentStatus, PaymentStatus.PROCESSING);
});
