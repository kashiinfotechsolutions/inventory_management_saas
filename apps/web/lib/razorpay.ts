import { createHmac, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';

let client: Razorpay | null = null;

/** Lazily constructed so the app can boot (and tests can run) without Razorpay keys set. */
export function getRazorpayClient(): Razorpay {
  if (!client) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured');
    }
    client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return client;
}

function safeCompare(expected: string, actual: string): boolean {
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(actual);
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

/** Verifies the signature Razorpay Checkout returns after a successful payment. */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string, keySecret = process.env.RAZORPAY_KEY_SECRET ?? ''): boolean {
  if (!keySecret) return false;
  const expected = createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return safeCompare(expected, signature);
}

/** Verifies the `X-Razorpay-Signature` header on incoming webhook requests. */
export function verifyWebhookSignature(rawBody: string, signature: string, webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? ''): boolean {
  if (!webhookSecret || !signature) return false;
  const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return safeCompare(expected, signature);
}
