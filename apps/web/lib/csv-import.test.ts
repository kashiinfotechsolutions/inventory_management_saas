import { describe, expect, it } from 'vitest';

import { MAX_UPLOAD_ROWS, parseCsv, parseProductImportRow, parseRestockRow } from './csv-import';

describe('parseCsv', () => {
  it('parses a CSV with a header row into lowercase-keyed records', () => {
    const records = parseCsv('SKU,Name\nABC,Widget\n');
    expect(records).toEqual([{ sku: 'ABC', name: 'Widget' }]);
  });

  it('handles quoted fields containing commas', () => {
    const records = parseCsv('sku,name\nABC,"Widget, Deluxe"\n');
    expect(records[0].name).toBe('Widget, Deluxe');
  });

  it('exposes a sane max row cap', () => {
    expect(MAX_UPLOAD_ROWS).toBeGreaterThan(0);
  });
});

describe('parseProductImportRow', () => {
  it('accepts a valid row and applies defaults', () => {
    const result = parseProductImportRow({ sku: 'ABC', name: 'Widget', mrp: '100', price: '90' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.row.quantity_in_stock).toBe(0);
      expect(result.row.low_stock_threshold).toBe(10);
      expect(result.row.gst_rate).toBe(18);
    }
  });

  it('rejects a row missing sku', () => {
    const result = parseProductImportRow({ name: 'Widget', mrp: '100', price: '90' });
    expect(result.ok).toBe(false);
  });

  it('rejects a row missing name', () => {
    const result = parseProductImportRow({ sku: 'ABC', mrp: '100', price: '90' });
    expect(result.ok).toBe(false);
  });

  it('rejects a negative price', () => {
    const result = parseProductImportRow({ sku: 'ABC', name: 'Widget', mrp: '100', price: '-5' });
    expect(result.ok).toBe(false);
  });

  it('rejects a non-numeric mrp', () => {
    const result = parseProductImportRow({ sku: 'ABC', name: 'Widget', mrp: 'abc', price: '90' });
    expect(result.ok).toBe(false);
  });

  it('rejects a gst_rate outside 0-100', () => {
    const result = parseProductImportRow({ sku: 'ABC', name: 'Widget', mrp: '100', price: '90', gst_rate: '150' });
    expect(result.ok).toBe(false);
  });
});

describe('parseRestockRow', () => {
  it('accepts a valid row', () => {
    const result = parseRestockRow({ sku: 'ABC', quantity: '10' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.row.quantity).toBe(10);
      expect(result.row.unit_cost).toBeUndefined();
    }
  });

  it('rejects a missing sku', () => {
    const result = parseRestockRow({ quantity: '10' });
    expect(result.ok).toBe(false);
  });

  it('rejects a fractional quantity', () => {
    const result = parseRestockRow({ sku: 'ABC', quantity: '10.5' });
    expect(result.ok).toBe(false);
  });

  it('rejects a negative quantity', () => {
    const result = parseRestockRow({ sku: 'ABC', quantity: '-1' });
    expect(result.ok).toBe(false);
  });

  it('rejects a non-numeric unit_cost', () => {
    const result = parseRestockRow({ sku: 'ABC', quantity: '10', unit_cost: 'free' });
    expect(result.ok).toBe(false);
  });
});
