export type BillLineInput = {
  price: number;
  quantity: number;
  gstRate: number;
  costPrice?: number;
};

export type BillLineTotals = {
  lineTotal: number;
  cgst: number;
  sgst: number;
  cost: number;
  profit: number;
};

export type BillTotals = {
  subtotal: number;
  discountAmount: number;
  cgst: number;
  sgst: number;
  total: number;
  lines: BillLineTotals[];
};

export const money = (value: number) => Math.round(value * 100) / 100;

/**
 * GST is split evenly into CGST/SGST (intra-state assumption already made by
 * the existing schema, which has no IGST-only code path). Tax is computed on
 * each line's pre-discount value, matching the original checkout behavior —
 * the order-level discount reduces the taxable subtotal but not the GST base.
 */
export function computeBillTotals(items: BillLineInput[], requestedDiscount = 0): BillTotals {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = Math.min(Math.max(0, requestedDiscount), subtotal);
  const taxable = subtotal - discountAmount;

  const lines = items.map((item) => {
    const lineTotal = item.price * item.quantity;
    const cgst = (lineTotal * item.gstRate) / 200;
    const cost = (item.costPrice ?? item.price) * item.quantity;
    return {
      lineTotal: money(lineTotal),
      cgst: money(cgst),
      sgst: money(cgst),
      cost: money(cost),
      profit: money(lineTotal - cost),
    };
  });

  const cgst = lines.reduce((sum, line) => sum + line.cgst, 0);
  const total = taxable + cgst + cgst;

  return {
    subtotal: money(subtotal),
    discountAmount: money(discountAmount),
    cgst: money(cgst),
    sgst: money(cgst),
    total: money(total),
    lines,
  };
}
