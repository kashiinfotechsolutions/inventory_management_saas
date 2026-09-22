import { describe, expect, it } from 'vitest';

import { computeBillTotals, money } from './billing-calc';

describe('money', () => {
  it('rounds to 2 decimal places', () => {
    expect(money(10.005)).toBeCloseTo(10.01, 2);
    expect(money(10.004)).toBeCloseTo(10.0, 2);
  });
});

describe('computeBillTotals', () => {
  it('computes subtotal, CGST/SGST split, and total for a single line with no discount', () => {
    const totals = computeBillTotals([{ price: 100, quantity: 2, gstRate: 18 }]);

    expect(totals.subtotal).toBe(200);
    expect(totals.discountAmount).toBe(0);
    // 18% GST split evenly: 9% CGST + 9% SGST on the 200 line value
    expect(totals.cgst).toBeCloseTo(18, 2);
    expect(totals.sgst).toBeCloseTo(18, 2);
    expect(totals.total).toBeCloseTo(200 + 18 + 18, 2);
    expect(totals.lines).toHaveLength(1);
    expect(totals.lines[0].lineTotal).toBe(200);
  });

  it('reduces the taxable subtotal by the discount but keeps GST computed on line value', () => {
    const totals = computeBillTotals([{ price: 100, quantity: 1, gstRate: 10 }], 20);

    expect(totals.subtotal).toBe(100);
    expect(totals.discountAmount).toBe(20);
    expect(totals.cgst).toBeCloseTo(5, 2); // 10% / 2 of the 100 line value, unaffected by discount
    expect(totals.total).toBeCloseTo(80 + 5 + 5, 2);
  });

  it('clamps a discount larger than the subtotal to the subtotal', () => {
    const totals = computeBillTotals([{ price: 50, quantity: 1, gstRate: 0 }], 1000);

    expect(totals.discountAmount).toBe(50);
    expect(totals.total).toBe(0);
  });

  it('computes per-line cost and profit, defaulting cost to price when costPrice is absent', () => {
    const totals = computeBillTotals([
      { price: 100, quantity: 2, gstRate: 0, costPrice: 60 },
      { price: 40, quantity: 1, gstRate: 0 },
    ]);

    expect(totals.lines[0].cost).toBe(120);
    expect(totals.lines[0].profit).toBe(80);
    expect(totals.lines[1].cost).toBe(40);
    expect(totals.lines[1].profit).toBe(0);
  });

  it('sums CGST across multiple lines with different GST rates', () => {
    const totals = computeBillTotals([
      { price: 100, quantity: 1, gstRate: 18 },
      { price: 50, quantity: 1, gstRate: 5 },
    ]);

    // (100*18/200) + (50*5/200) = 9 + 1.25
    expect(totals.cgst).toBeCloseTo(10.25, 2);
  });
});
