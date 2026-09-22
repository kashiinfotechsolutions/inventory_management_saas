import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { readSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const defaultPlans = [
  {
    name: 'Starter',
    price_monthly: 999,
    price_yearly: 9990,
    limits: {
      products: 250,
      users: 3,
      invoices: 5000,
      support: 'Email',
    },
  },
  {
    name: 'Growth',
    price_monthly: 2499,
    price_yearly: 24990,
    limits: {
      products: 2000,
      users: 12,
      invoices: 20000,
      support: 'Priority',
    },
  },
  {
    name: 'Scale',
    price_monthly: 4999,
    price_yearly: 49990,
    limits: {
      products: 10000,
      users: 50,
      invoices: 100000,
      support: 'Dedicated',
    },
  },
] as const;

function normalizePlan(plan: any) {
  return {
    id: plan.id,
    name: plan.name,
    price_monthly: Number(plan.price_monthly ?? 0),
    price_yearly: Number(plan.price_yearly ?? 0),
    limits: plan.limits ?? {},
  };
}

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;

      let plans = await tx.plan.findMany({ orderBy: { price_monthly: 'asc' } });
      if (plans.length === 0) {
        for (const plan of defaultPlans) {
          const existing = await tx.plan.findFirst({ where: { name: plan.name } });
          if (existing) {
            await tx.plan.update({
              where: { id: existing.id },
              data: { price_monthly: plan.price_monthly, price_yearly: plan.price_yearly, limits: plan.limits },
            });
          } else {
            await tx.plan.create({
              data: { name: plan.name, price_monthly: plan.price_monthly, price_yearly: plan.price_yearly, limits: plan.limits },
            });
          }
        }
        plans = await tx.plan.findMany({ orderBy: { price_monthly: 'asc' } });
      }

      const tenant = await tx.tenant.findUnique({
        where: { id: session.tenantId },
        select: { plan_id: true, subscription_status: true },
      });

      const currentPlan = tenant?.plan_id
        ? await tx.plan.findUnique({ where: { id: tenant.plan_id }, select: { id: true, name: true, price_monthly: true, price_yearly: true, limits: true } })
        : null;

      const subscription = await tx.subscription.findFirst({
        where: { tenant_id: session.tenantId },
        orderBy: { created_at: 'desc' },
      });

      return {
        plans: plans.map(normalizePlan),
        currentPlan: currentPlan ? normalizePlan(currentPlan) : null,
        subscription: subscription ? {
          id: subscription.id,
          status: subscription.status,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          plan_id: subscription.plan_id,
        } : null,
        tenantStatus: tenant?.subscription_status ?? 'TRIALING',
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to load billing information' }, { status: 500 });
  }
}

// Plan changes now go through POST /api/billing/checkout (create a Razorpay
// order) followed by POST /api/billing/verify (activate after payment) —
// see those routes. This endpoint stays read-only.
