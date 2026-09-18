import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { randomUUID } from 'node:crypto';

import { readSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type CheckoutItem = { productId: string; quantity: number };

const money = (value: number) => Math.round(value * 100) / 100;

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const items = Array.isArray(body.items) ? (body.items as CheckoutItem[]) : [];
    const paymentMethod = String(body.paymentMethod ?? 'CASH');
    const idempotencyKey = String(body.idempotencyKey ?? randomUUID());
    const discountAmount = Math.max(0, Number(body.discountAmount ?? 0));

    if (!items.length || !items.every((item) => item.productId && Number.isInteger(item.quantity) && item.quantity > 0)) {
      return NextResponse.json({ error: 'At least one valid cart item is required' }, { status: 400 });
    }
    if (!['CASH', 'CARD', 'UPI', 'OTHER'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Unsupported payment method' }, { status: 400 });
    }

    const sortedItems = [...items].sort((a, b) => a.productId.localeCompare(b.productId));
    const bill = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;

      const existing = await tx.bill.findUnique({
        where: { idempotency_key: idempotencyKey },
        include: { items: true },
      });
      if (existing) return existing;

      const products = [];
      for (const item of sortedItems) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenant_id: session.tenantId, is_active: true },
        });
        if (!product) throw new Error('PRODUCT_NOT_FOUND');
        if (product.quantity_in_stock < item.quantity) throw new Error(`INSUFFICIENT_STOCK:${product.name}`);
        products.push({ product, quantity: item.quantity });
      }

      const subtotal = products.reduce((sum, { product, quantity }) => sum + Number(product.price) * quantity, 0);
      const safeDiscount = Math.min(discountAmount, subtotal);
      const taxable = subtotal - safeDiscount;
      const cgst = products.reduce((sum, { product, quantity }) => sum + Number(product.price) * quantity * Number(product.gst_rate) / 200, 0);
      const sgst = cgst;
      const total = taxable + cgst + sgst;

      const counter = await tx.billCounter.upsert({
        where: { tenant_id: session.tenantId },
        create: { tenant_id: session.tenantId, last_number: 1 },
        update: { last_number: { increment: 1 } },
      });
      const billNumber = `INV-${String(counter.last_number).padStart(6, '0')}`;

      const created = await tx.bill.create({
        data: {
          tenant_id: session.tenantId,
          bill_number: billNumber,
          subtotal: money(subtotal),
          discount_amount: money(safeDiscount),
          cgst_amount: money(cgst),
          sgst_amount: money(sgst),
          total: money(total),
          payment_method: paymentMethod as 'CASH' | 'CARD' | 'UPI' | 'OTHER',
          idempotency_key: idempotencyKey,
          created_by: session.sub,
          items: {
            create: products.map(({ product, quantity }) => ({
              product_id: product.id,
              product_name: product.name,
              sku: product.sku,
              hsn_code: product.hsn_code,
              mrp: product.mrp,
              quantity,
              unit_price: product.price,
              gst_rate: product.gst_rate,
              line_total: money(Number(product.price) * quantity),
            })),
          },
        },
        include: { items: true },
      });

      for (const { product, quantity } of products) {
        const updated = await tx.product.updateMany({
          where: { id: product.id, tenant_id: session.tenantId, quantity_in_stock: { gte: quantity } },
          data: { quantity_in_stock: { decrement: quantity } },
        });
        if (updated.count !== 1) throw new Error(`INSUFFICIENT_STOCK:${product.name}`);
        const remaining = product.quantity_in_stock - quantity;
        await tx.stockMovement.create({
          data: {
            tenant_id: session.tenantId,
            product_id: product.id,
            movement_type: 'SALE',
            quantity_change: -quantity,
            quantity_after: remaining,
            reference_type: 'BILL',
            reference_id: created.id,
            created_by: session.sub,
          },
        });
        if (remaining <= product.low_stock_threshold) {
          const alertType = remaining === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK';
          const activeAlert = await tx.alert.findFirst({
            where: { tenant_id: session.tenantId, product_id: product.id, type: alertType, status: 'ACTIVE' },
          });
          if (!activeAlert) {
            await tx.alert.create({
              data: { tenant_id: session.tenantId, product_id: product.id, type: alertType },
            });
          }
        }
      }

      return created;
    }, { isolationLevel: 'Serializable' });

    return NextResponse.json({ bill }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'PRODUCT_NOT_FOUND') return NextResponse.json({ error: 'One or more products no longer exist' }, { status: 404 });
    if (error instanceof Error && error.message.startsWith('INSUFFICIENT_STOCK:')) return NextResponse.json({ error: error.message.slice('INSUFFICIENT_STOCK:'.length) + ' has insufficient stock' }, { status: 409 });
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ error: 'This checkout was already processed' }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: 'Unable to complete checkout' }, { status: 500 });
  }
}
