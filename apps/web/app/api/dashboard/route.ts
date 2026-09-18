import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { readSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const [sales, products, lowStock, recentSales] = await Promise.all([
        tx.bill.aggregate({ where: { tenant_id: session.tenantId, created_at: { gte: start }, status: 'COMPLETED' }, _sum: { total: true }, _count: { id: true } }),
        tx.product.aggregate({ where: { tenant_id: session.tenantId, is_active: true }, _sum: { quantity_in_stock: true }, _count: { id: true } }),
        tx.product.count({ where: { tenant_id: session.tenantId, is_active: true, quantity_in_stock: { lte: 10 } } }),
        tx.bill.findMany({ where: { tenant_id: session.tenantId }, orderBy: { created_at: 'desc' }, take: 5, select: { id: true, bill_number: true, total: true, payment_method: true, created_at: true } }),
      ]);
      return { sales, products, lowStock, recentSales };
    });
    return NextResponse.json({
      today: { sales: result.sales._sum.total ?? 0, bills: result.sales._count.id },
      inventory: { products: result.products._count.id, units: result.products._sum.quantity_in_stock ?? 0, lowStock: result.lowStock },
      recentSales: result.recentSales,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to load dashboard data' }, { status: 500 });
  }
}