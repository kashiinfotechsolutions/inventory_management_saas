import { parse } from 'csv-parse/sync';

export const MAX_UPLOAD_ROWS = 5000;

export type ProductImportRow = {
  sku: string;
  name: string;
  category?: string;
  hsn_code?: string;
  unit?: string;
  pack_size?: string;
  mrp: number;
  price: number;
  cost_price?: number;
  quantity_in_stock: number;
  low_stock_threshold: number;
  gst_rate: number;
  barcode?: string;
};

export type RestockRow = {
  sku: string;
  quantity: number;
  unit_cost?: number;
};

export type RowParseResult<T> = { ok: true; row: T } | { ok: false; error: string };

/** Parses raw CSV text into an array of header-keyed records. Throws on malformed CSV. */
export function parseCsv(text: string): Record<string, string>[] {
  return parse(text, {
    columns: (header: string[]) => header.map((column) => column.trim().toLowerCase()),
    skip_empty_lines: true,
    trim: true,
  });
}

function toOptionalString(value: unknown): string | undefined {
  const str = String(value ?? '').trim();
  return str.length ? str : undefined;
}

function toNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function parseProductImportRow(record: Record<string, string>): RowParseResult<ProductImportRow> {
  const sku = toOptionalString(record.sku);
  const name = toOptionalString(record.name);
  if (!sku) return { ok: false, error: 'sku is required' };
  if (!name) return { ok: false, error: 'name is required' };

  const mrp = toNumber(record.mrp);
  const price = toNumber(record.price);
  if (mrp === null || mrp < 0) return { ok: false, error: 'mrp must be a non-negative number' };
  if (price === null || price < 0) return { ok: false, error: 'price must be a non-negative number' };

  const costPrice = toNumber(record.cost_price);
  const quantityInStock = toNumber(record.quantity_in_stock) ?? 0;
  const lowStockThreshold = toNumber(record.low_stock_threshold) ?? 10;
  const gstRate = toNumber(record.gst_rate) ?? 18;

  if (quantityInStock < 0) return { ok: false, error: 'quantity_in_stock cannot be negative' };
  if (lowStockThreshold < 0) return { ok: false, error: 'low_stock_threshold cannot be negative' };
  if (gstRate < 0 || gstRate > 100) return { ok: false, error: 'gst_rate must be between 0 and 100' };

  return {
    ok: true,
    row: {
      sku,
      name,
      category: toOptionalString(record.category),
      hsn_code: toOptionalString(record.hsn_code),
      unit: toOptionalString(record.unit),
      pack_size: toOptionalString(record.pack_size),
      mrp,
      price,
      cost_price: costPrice ?? undefined,
      quantity_in_stock: Math.trunc(quantityInStock),
      low_stock_threshold: Math.trunc(lowStockThreshold),
      gst_rate: gstRate,
      barcode: toOptionalString(record.barcode),
    },
  };
}

export function parseRestockRow(record: Record<string, string>): RowParseResult<RestockRow> {
  const sku = toOptionalString(record.sku);
  if (!sku) return { ok: false, error: 'sku is required' };

  const quantity = toNumber(record.quantity);
  if (quantity === null || !Number.isInteger(quantity)) return { ok: false, error: 'quantity must be a whole, numeric value' };
  if (quantity < 0) return { ok: false, error: 'quantity cannot be negative' };

  const unitCost = toNumber(record.unit_cost);
  if (record.unit_cost !== undefined && record.unit_cost !== '' && unitCost === null) {
    return { ok: false, error: 'unit_cost must be a number' };
  }

  return { ok: true, row: { sku, quantity, unit_cost: unitCost ?? undefined } };
}
