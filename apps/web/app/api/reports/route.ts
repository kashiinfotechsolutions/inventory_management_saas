import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { readSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type ReportProduct = { cost_price: unknown; price: unknown; quantity_in_stock: number };
type ReportBill = { total: unknown };

export async function GET(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const from = new Date(url.searchParams.get('from') ?? new Date(Date.now() - 30 * 86400000).toISOString());
  const to = new Date(url.searchParams.get('to') ?? new Date().toISOString());
  to.setHours(23, 59, 59, 999);

  try {
    const report = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;
      const bills = await tx.bill.findMany({
        where: { tenant_id: session.tenantId, created_at: { gte: from, lte: to }, status: 'COMPLETED' },
        select: { id: true, total: true, created_at: true, items: { select: { product_id: true, product_name: true, quantity: true, line_total: true } } },
        orderBy: { created_at: 'asc' },
      });
      const products = await tx.product.findMany({
        where: { tenant_id: session.tenantId, is_active: true },
        select: { id: true, name: true, sku: true, price: true, cost_price: true, quantity_in_stock: true },
        orderBy: { name: 'asc' },
      });
      return { bills, products };
    });

    const byDay = new Map<string, { date: string; sales: number; bills: number }>();
    const productTotals = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const bill of report.bills) {
      const date = bill.created_at.toISOString().slice(0, 10);
      const day = byDay.get(date) ?? { date, sales: 0, bills: 0 };
      day.sales += Number(bill.total);
      day.bills += 1;
      byDay.set(date, day);
      for (const item of bill.items) {
        const current = productTotals.get(item.product_id ?? item.product_name) ?? { name: item.product_name, quantity: 0, revenue: 0 };
        current.quantity += item.quantity;
        current.revenue += Number(item.line_total);
        productTotals.set(item.product_id ?? item.product_name, current);
      }
    }

    const stockValue = (report.products as ReportProduct[]).reduce((sum: number, product: ReportProduct) => sum + Number(product.cost_price ?? product.price) * product.quantity_in_stock, 0);
    return NextResponse.json({
      range: { from, to },
      summary: { sales: (report.bills as ReportBill[]).reduce((sum: number, bill: ReportBill) => sum + Number(bill.total), 0), bills: report.bills.length, stockValue },
      daily: Array.from(byDay.values()),
      topProducts: Array.from(productTotals.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to load report' }, { status: 500 });
  }
}
