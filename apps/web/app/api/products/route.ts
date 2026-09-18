import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { readSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const products = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;
      const barcode = new URL(request.url).searchParams.get('barcode')?.trim();
      if (barcode) {
        return tx.product.findFirst({
          where: { tenant_id: session.tenantId, barcode, is_active: true },
          select: {
            id: true,
            sku: true,
            barcode: true,
            name: true,
            category: true,
            mrp: true,
            price: true,
            quantity_in_stock: true,
            low_stock_threshold: true,
            gst_rate: true,
          },
        });
      }
      return tx.product.findMany({
        where: { tenant_id: session.tenantId, is_active: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          sku: true,
          barcode: true,
          name: true,
          category: true,
          mrp: true,
          price: true,
          quantity_in_stock: true,
          low_stock_threshold: true,
          gst_rate: true,
        },
      });
    });
    return NextResponse.json({ products });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to load products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'CASHIER') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  try {
    const body = await request.json();
    const sku = String(body.sku ?? '').trim();
    const name = String(body.name ?? '').trim();
    const mrp = Number(body.mrp);
    const price = Number(body.price);
    const quantityInStock = Number(body.quantityInStock ?? 0);
    const lowStockThreshold = Number(body.lowStockThreshold ?? 10);

    if (!sku || !name || !Number.isFinite(mrp) || !Number.isFinite(price) || mrp < 0 || price < 0) {
      return NextResponse.json({ error: 'SKU, name, MRP and price are required' }, { status: 400 });
    }

    const product = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;
      return tx.product.create({
        data: {
          tenant_id: session.tenantId,
          sku,
          name,
          mrp,
          price,
          quantity_in_stock: Number.isInteger(quantityInStock) ? quantityInStock : 0,
          low_stock_threshold: Number.isInteger(lowStockThreshold) ? lowStockThreshold : 10,
          barcode: body.barcode ? String(body.barcode).trim() : undefined,
          category: body.category ? String(body.category).trim() : undefined,
        },
      });
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'SKU or barcode already exists' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Unable to create product' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'CASHIER') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  try {
    const body = await request.json();
    const id = String(body.id ?? '').trim();
    if (!id) return NextResponse.json({ error: 'Product id is required' }, { status: 400 });

    const updateData: Record<string, unknown> = {};
    if (body.sku !== undefined) updateData.sku = String(body.sku).trim();
    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.category !== undefined) updateData.category = String(body.category).trim() || null;
    if (body.barcode !== undefined) updateData.barcode = String(body.barcode).trim() || null;
    if (body.mrp !== undefined) updateData.mrp = Number(body.mrp);
    if (body.price !== undefined) updateData.price = Number(body.price);
    if (body.quantityInStock !== undefined) updateData.quantity_in_stock = Number(body.quantityInStock);
    if (body.lowStockThreshold !== undefined) updateData.low_stock_threshold = Number(body.lowStockThreshold);
    if (body.gstRate !== undefined) updateData.gst_rate = Number(body.gstRate);
    if (body.isActive !== undefined) updateData.is_active = Boolean(body.isActive);

    if (!Object.keys(updateData).length) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const product = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;
      return tx.product.update({
        where: { id, tenant_id: session.tenantId },
        data: updateData,
      });
    });

    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'SKU or barcode already exists' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Unable to update product' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'CASHIER') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  try {
    const url = new URL(request.url);
    const body = await request.clone().json().catch(() => ({}));
    const id = String(body.id ?? url.searchParams.get('id') ?? '').trim();
    if (!id) return NextResponse.json({ error: 'Product id is required' }, { status: 400 });

    const product = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;
      return tx.product.update({
        where: { id, tenant_id: session.tenantId },
        data: { is_active: false },
      });
    });

    return NextResponse.json({ deleted: true, productId: product.id });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Unable to delete product' }, { status: 500 });
  }
}