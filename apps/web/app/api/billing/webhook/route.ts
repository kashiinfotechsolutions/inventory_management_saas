import { NextResponse } from 'next/server';

import { getRazorpayClient, verifyWebhookSignature } from '@/lib/razorpay';
import { activatePayment } from '@/lib/billing-activation';

type RazorpayWebhookEvent = {
  event?: string;
  payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const paymentEntity = event.payload?.payment?.entity;
  const orderId = paymentEntity?.order_id;
  const isCaptured = event.event === 'payment.captured';
  const isFailed = event.event === 'payment.failed';

  if (!orderId || !(isCaptured || isFailed)) {
    // Not an event we act on (subscriptions.*, refund.*, etc.) — acknowledge and ignore.
    return NextResponse.json({ received: true });
  }

  try {
    // The order's notes are the source of truth for which tenant this payment
    // belongs to (we set them ourselves at order-creation time) — a webhook
    // has no session to derive tenant from, so this authenticated lookup
    // against Razorpay's API stands in for that.
    const order = await getRazorpayClient().orders.fetch(orderId);
    const tenantId = typeof order.notes?.tenantId === 'string' ? order.notes.tenantId : undefined;
    if (!tenantId) {
      console.error(`Razorpay webhook: order ${orderId} has no tenantId note, cannot process`);
      return NextResponse.json({ received: true });
    }

    await activatePayment({
      tenantId,
      orderId,
      razorpayPaymentId: paymentEntity?.id,
      markFailed: isFailed,
    });
  } catch (error) {
    console.error('Razorpay webhook processing failed', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
