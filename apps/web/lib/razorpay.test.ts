import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { verifyPaymentSignature, verifyWebhookSignature } from './razorpay';

describe('verifyPaymentSignature', () => {
  const keySecret = 'test-key-secret';
  const orderId = 'order_ABC123';
  const paymentId = 'pay_XYZ789';

  it('accepts a signature computed the way Razorpay documents (HMAC-SHA256 of orderId|paymentId)', () => {
    const signature = createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
    expect(verifyPaymentSignature(orderId, paymentId, signature, keySecret)).toBe(true);
  });

  it('rejects a signature computed with the wrong secret', () => {
    const signature = createHmac('sha256', 'wrong-secret').update(`${orderId}|${paymentId}`).digest('hex');
    expect(verifyPaymentSignature(orderId, paymentId, signature, keySecret)).toBe(false);
  });

  it('rejects a signature for a different order/payment pair', () => {
    const signature = createHmac('sha256', keySecret).update(`${orderId}|pay_someoneElse`).digest('hex');
    expect(verifyPaymentSignature(orderId, paymentId, signature, keySecret)).toBe(false);
  });

  it('returns false rather than throwing when no key secret is configured', () => {
    expect(verifyPaymentSignature(orderId, paymentId, 'anything', '')).toBe(false);
  });
});

describe('verifyWebhookSignature', () => {
  const webhookSecret = 'test-webhook-secret';
  const body = JSON.stringify({ event: 'payment.captured' });

  it('accepts a signature computed as HMAC-SHA256 of the raw body', () => {
    const signature = createHmac('sha256', webhookSecret).update(body).digest('hex');
    expect(verifyWebhookSignature(body, signature, webhookSecret)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const signature = createHmac('sha256', webhookSecret).update(body).digest('hex');
    expect(verifyWebhookSignature(body + 'x', signature, webhookSecret)).toBe(false);
  });

  it('returns false when no webhook secret is configured', () => {
    expect(verifyWebhookSignature(body, 'anything', '')).toBe(false);
  });
});
