import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { readSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const alerts = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;
      return tx.alert.findMany({ where: { tenant_id: session.tenantId, status: 'ACTIVE' }, orderBy: { triggered_at: 'desc' }, include: { product: { select: { id: true, name: true, sku: true, quantity_in_stock: true, low_stock_threshold: true } } } });
    });
    return NextResponse.json({ alerts });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to load alerts' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const id = String(body.id ?? '').trim();
    const status = body.status === 'DISMISSED' ? 'DISMISSED' : 'RESOLVED';
    if (!id) return NextResponse.json({ error: 'Alert id is required' }, { status: 400 });
    const alert = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;
      return tx.alert.update({ where: { id, tenant_id: session.tenantId }, data: { status, resolved_at: new Date() } });
    });
    return NextResponse.json({ alert });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    console.error(error);
    return NextResponse.json({ error: 'Unable to update alert' }, { status: 500 });
  }
}
