import { NextResponse } from 'next/server';

import { readSession } from '@/lib/auth';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { activatePayment } from '@/lib/billing-activation';

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const orderId = String(body.razorpay_order_id ?? '');
    const paymentId = String(body.razorpay_payment_id ?? '');
    const signature = String(body.razorpay_signature ?? '');

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: 'Missing payment verification fields' }, { status: 400 });
    }

    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      return NextResponse.json({ error: 'Payment signature verification failed' }, { status: 400 });
    }

    const outcome = await activatePayment({
      tenantId: session.tenantId,
      orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    });

    if (outcome === 'not_found') {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, alreadyProcessed: outcome === 'already_processed' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to verify payment' }, { status: 500 });
  }
}
