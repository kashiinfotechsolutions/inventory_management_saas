import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { readSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 25)));

  try {
    const bills = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;
      return tx.bill.findMany({
        where: { tenant_id: session.tenantId },
        orderBy: { created_at: 'desc' },
        take: limit,
        select: {
          id: true,
          bill_number: true,
          subtotal: true,
          discount_amount: true,
          total: true,
          payment_method: true,
          status: true,
          created_at: true,
          items: { select: { product_name: true, quantity: true, line_total: true } },
        },
      });
    });
    return NextResponse.json({ bills });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to load sales' }, { status: 500 });
  }
}