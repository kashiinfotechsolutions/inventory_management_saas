import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

const CYCLE_DAYS: Record<'MONTHLY' | 'YEARLY', number> = { MONTHLY: 30, YEARLY: 365 };

export type ActivatePaymentInput = {
  tenantId: string;
  orderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  markFailed?: boolean;
};

export type ActivatePaymentOutcome = 'activated' | 'already_processed' | 'marked_failed' | 'not_found';

/**
 * Activates the subscription tied to a Razorpay order once payment is
 * confirmed. Shared by POST /api/billing/verify (the primary, client-driven
 * path right after checkout) and the /api/billing/webhook handler (a durable
 * server-to-server fallback for when the client never completes the verify
 * call). `tenantId` must be set BEFORE the first query — every table here is
 * under Postgres RLS keyed on `app.tenant_id`, so querying `payments` by
 * order id alone (before that's set) would silently return nothing.
 */
export async function activatePayment(input: ActivatePaymentInput): Promise<ActivatePaymentOutcome> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${input.tenantId}, true)`;

    const payment = await tx.payment.findUnique({ where: { razorpay_order_id: input.orderId } });
    if (!payment) return 'not_found';

    if (input.markFailed) {
      if (payment.status !== 'CAPTURED') {
        await tx.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      }
      return 'marked_failed';
    }

    if (payment.status === 'CAPTURED') return 'already_processed';

    const plan = await tx.plan.findUnique({ where: { id: payment.plan_id } });
    if (!plan) return 'not_found';

    const existingSubscription = await tx.subscription.findFirst({
      where: { tenant_id: input.tenantId },
      orderBy: { created_at: 'desc' },
    });

    const periodStart = new Date();
    const periodEnd = new Date(Date.now() + CYCLE_DAYS[payment.billing_cycle] * 24 * 60 * 60 * 1000);

    const subscription = existingSubscription
      ? await tx.subscription.update({
          where: { id: existingSubscription.id },
          data: { plan_id: plan.id, status: 'ACTIVE', current_period_start: periodStart, current_period_end: periodEnd },
        })
      : await tx.subscription.create({
          data: { tenant_id: input.tenantId, plan_id: plan.id, status: 'ACTIVE', current_period_start: periodStart, current_period_end: periodEnd },
        });

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        razorpay_payment_id: input.razorpayPaymentId ?? payment.razorpay_payment_id,
        razorpay_signature: input.razorpaySignature ?? payment.razorpay_signature,
        status: 'CAPTURED',
        subscription_id: subscription.id,
      },
    });

    await tx.tenant.update({
      where: { id: input.tenantId },
      data: { plan_id: plan.id, subscription_status: 'ACTIVE' },
    });

    return 'activated';
  });
}
