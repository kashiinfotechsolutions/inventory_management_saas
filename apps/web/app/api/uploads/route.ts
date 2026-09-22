import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { readSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MAX_UPLOAD_ROWS, parseCsv, parseProductImportRow, parseRestockRow } from '@/lib/csv-import';

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const batches = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;
      return tx.uploadBatch.findMany({
        where: { tenant_id: session.tenantId },
        orderBy: { created_at: 'desc' },
        take: 50,
        select: {
          id: true,
          type: true,
          mode: true,
          filename: true,
          status: true,
          total_rows: true,
          success_rows: true,
          failed_rows: true,
          created_at: true,
        },
      });
    });

    return NextResponse.json({ batches });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to load upload history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'CASHIER') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  try {
    const form = await request.formData();
    const file = form.get('file');
    const type = String(form.get('type') ?? '');
    const mode = form.get('mode') ? String(form.get('mode')) : undefined;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A CSV file is required' }, { status: 400 });
    }
    if (!['PRODUCT_IMPORT', 'RESTOCK'].includes(type)) {
      return NextResponse.json({ error: 'type must be PRODUCT_IMPORT or RESTOCK' }, { status: 400 });
    }
    if (type === 'RESTOCK' && !['ADD_QUANTITY', 'CLOSING_SYNC'].includes(mode ?? '')) {
      return NextResponse.json({ error: 'mode must be ADD_QUANTITY or CLOSING_SYNC for restock uploads' }, { status: 400 });
    }

    const text = await file.text();
    let records: Record<string, string>[];
    try {
      records = parseCsv(text);
    } catch (err) {
      return NextResponse.json({ error: `Unable to parse CSV: ${err instanceof Error ? err.message : 'invalid file'}` }, { status: 400 });
    }

    if (records.length === 0) {
      return NextResponse.json({ error: 'CSV file has no data rows' }, { status: 400 });
    }
    if (records.length > MAX_UPLOAD_ROWS) {
      return NextResponse.json({ error: `CSV exceeds the ${MAX_UPLOAD_ROWS}-row limit per upload` }, { status: 400 });
    }

    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;

        const batch = await tx.uploadBatch.create({
          data: {
            tenant_id: session.tenantId,
            type: type as 'PRODUCT_IMPORT' | 'RESTOCK',
            mode: type === 'RESTOCK' ? (mode as 'ADD_QUANTITY' | 'CLOSING_SYNC') : undefined,
            filename: file.name,
            status: 'PROCESSING',
            total_rows: records.length,
            created_by: session.sub,
          },
        });

        const errors: Array<{ row: number; error: string }> = [];
        let successCount = 0;

        for (let i = 0; i < records.length; i += 1) {
          const rowNumber = i + 2; // +1 for header row, +1 for 1-indexing
          const record = records[i];

          try {
            if (type === 'PRODUCT_IMPORT') {
              const parsed = parseProductImportRow(record);
              if (!parsed.ok) {
                errors.push({ row: rowNumber, error: parsed.error });
                continue;
              }
              const row = parsed.row;
              await tx.product.upsert({
                where: { tenant_id_sku: { tenant_id: session.tenantId, sku: row.sku } },
                create: { ...row, tenant_id: session.tenantId },
                update: row,
              });
              successCount += 1;
            } else {
              const parsed = parseRestockRow(record);
              if (!parsed.ok) {
                errors.push({ row: rowNumber, error: parsed.error });
                continue;
              }
              const row = parsed.row;
              const product = await tx.product.findFirst({ where: { tenant_id: session.tenantId, sku: row.sku } });
              if (!product) {
                errors.push({ row: rowNumber, error: `Unknown SKU: ${row.sku}` });
                continue;
              }

              if (mode === 'ADD_QUANTITY') {
                const quantityAfter = product.quantity_in_stock + row.quantity;
                await tx.product.update({
                  where: { id: product.id },
                  data: {
                    quantity_in_stock: quantityAfter,
                    ...(row.unit_cost !== undefined ? { cost_price: row.unit_cost } : {}),
                  },
                });
                await tx.stockMovement.create({
                  data: {
                    tenant_id: session.tenantId,
                    product_id: product.id,
                    movement_type: 'PURCHASE',
                    quantity_change: row.quantity,
                    quantity_after: quantityAfter,
                    reference_type: 'UPLOAD_BATCH',
                    reference_id: batch.id,
                    created_by: session.sub,
                  },
                });
              } else {
                const quantityChange = row.quantity - product.quantity_in_stock;
                await tx.product.update({ where: { id: product.id }, data: { quantity_in_stock: row.quantity } });
                await tx.stockMovement.create({
                  data: {
                    tenant_id: session.tenantId,
                    product_id: product.id,
                    movement_type: 'STOCK_SYNC',
                    quantity_change: quantityChange,
                    quantity_after: row.quantity,
                    reference_type: 'UPLOAD_BATCH',
                    reference_id: batch.id,
                    created_by: session.sub,
                  },
                });
              }
              successCount += 1;
            }
          } catch (rowError) {
            errors.push({ row: rowNumber, error: rowError instanceof Error ? rowError.message : 'Unexpected error' });
          }
        }

        const status = errors.length === 0 ? 'COMPLETED' : successCount > 0 ? 'COMPLETED_WITH_ERRORS' : 'FAILED';
        const updated = await tx.uploadBatch.update({
          where: { id: batch.id },
          data: {
            status,
            success_rows: successCount,
            failed_rows: errors.length,
            error_report: errors.length ? errors : Prisma.JsonNull,
          },
        });

        return { batch: updated, errors };
      },
      { timeout: 120000 },
    );

    return NextResponse.json({ batch: result.batch, errors: result.errors }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to process upload' }, { status: 500 });
  }
}
