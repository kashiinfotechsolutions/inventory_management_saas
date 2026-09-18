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
    return NextResponse.json({ tenant });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to load settings' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'CASHIER') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  try {
    const body = await request.json();
    const updates: Record<string, string> = {};
    if (body.name) updates.name = String(body.name).trim();
    if (body.currency) updates.currency = String(body.currency).trim();
    if (body.timezone) updates.timezone = String(body.timezone).trim();

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'No settings provided' }, { status: 400 });
    }

    const tenant = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;
      return tx.tenant.update({
        where: { id: session.tenantId },
        data: updates,
      });
    });

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to update tenant settings' }, { status: 500 });
  }
}
