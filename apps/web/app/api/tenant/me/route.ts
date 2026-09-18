import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { readSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const tenant = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;
      return tx.tenant.findUnique({
        where: { id: session.tenantId },
        select: { id: true, name: true, slug: true, currency: true, timezone: true, subscription_status: true },
      });
    });

    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    return NextResponse.json({ tenant, user: session });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to load tenant' }, { status: 500 });
  }
}
