import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { readSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRazorpayClient } from '@/lib/razorpay';

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'CASHIER') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  try {
    const body = await request.json();
    const planId = String(body.planId ?? '').trim();
    const billingCycle = body.billingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
    if (!planId) return NextResponse.json({ error: 'Plan is required' }, { status: 400 });

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    const amountRupees = Number(billingCycle === 'YEARLY' ? plan.price_yearly : plan.price_monthly);
    const amountPaise = Math.round(amountRupees * 100);
    if (amountPaise <= 0) {
      return NextResponse.json({ error: 'This plan has no payable amount' }, { status: 400 });
    }

    let order;
    try {
      order = await getRazorpayClient().orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: `tenant_${session.tenantId}_${Date.now()}`,
        notes: { tenantId: session.tenantId, planId: plan.id, billingCycle },
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('RAZORPAY_KEY')) {
        return NextResponse.json({ error: 'Payments are not configured yet. Ask an administrator to add Razorpay API keys.' }, { status: 503 });
      }
      throw err;
    }

    const payment = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;
      return tx.payment.create({
        data: {
          tenant_id: session.tenantId,
          plan_id: plan.id,
          razorpay_order_id: order.id,
          amount: amountRupees,
          currency: 'INR',
          billing_cycle: billingCycle,
          status: 'CREATED',
        },
      });
    });

    return NextResponse.json({
      orderId: order.id,
      amount: amountPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      paymentId: payment.id,
      planName: plan.name,
      billingCycle,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to start checkout' }, { status: 500 });
  }
}
