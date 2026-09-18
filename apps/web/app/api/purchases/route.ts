import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { readSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const purchases = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;
      return tx.stockMovement.findMany({
        where: { tenant_id: session.tenantId, movement_type: 'PURCHASE' },
        orderBy: { created_at: 'desc' },
        take: 25,
        include: {
          product: { select: { id: true, name: true, sku: true } },
        },
      });
    });

    return NextResponse.json({ purchases });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to load purchase records' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'CASHIER') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  try {
    const body = await request.json();
    const productId = String(body.productId ?? '').trim();
    const quantity = Number(body.quantity ?? 0);
    const unitCost = Number(body.unitCost ?? 0);
    const note = String(body.note ?? '').trim();

    if (!productId || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
      return NextResponse.json({ error: 'Valid product, quantity and unit cost are required' }, { status: 400 });
    }

    const purchase = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;

      const product = await tx.product.findFirst({
        where: { id: productId, tenant_id: session.tenantId, is_active: true },
      });

      if (!product) throw new Error('PRODUCT_NOT_FOUND');

      const quantityAfter = product.quantity_in_stock + quantity;
      const stockMovement = await tx.stockMovement.create({
        data: {
          tenant_id: session.tenantId,
          product_id: product.id,
          movement_type: 'PURCHASE',
          quantity_change: quantity,
          quantity_after: quantityAfter,
          reference_type: 'PURCHASE',
          reference_id: randomUUID(),
          note: note || 'Restock',
          created_by: session.sub,
        },
      });

      await tx.product.update({
        where: { id: product.id, tenant_id: session.tenantId },
        data: {
          quantity_in_stock: quantityAfter,
          cost_price: Number(product.cost_price ?? unitCost),
        },
      });

      return {
        id: stockMovement.id,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity,
        unitCost,
        note: stockMovement.note,
        created_at: stockMovement.created_at,
      };
    });

    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'PRODUCT_NOT_FOUND') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Unable to record purchase' }, { status: 500 });
  }
}
