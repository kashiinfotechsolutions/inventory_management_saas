'use client';

import { useEffect, useState } from 'react';

type SaleRow = {
  id: string;
  bill_number: string;
  subtotal: number;
  discount_amount: number;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
  items: Array<{ product_name: string; quantity: number; line_total: number }>;
};

const currency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSales() {
      try {
        const response = await fetch('/api/sales?limit=20');
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? 'Unable to load sales');
          return;
        }
        setSales(data.bills ?? []);
      } catch {
        setError('Unable to reach the sales endpoint');
      } finally {
        setLoading(false);
      }
    }

    void loadSales();
  }, []);

  return (
    <main className="page-content inventory-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Transactions</p>
          <h1>Sales overview<span>.</span></h1>
          <p className="muted">Track every purchase and payment status across the workspace.</p>
        </div>
        <a href="/pos" className="primary-button" style={{ textDecoration: 'none' }}><span>＋</span> New sale</a>
      </div>

      {error && <div className="form-error inventory-error">{error}</div>}

      <section className="panel inventory-table-panel">
        <div className="panel-heading">
          <div>
            <h2>Recent bills</h2>
            <p>{sales.length} transactions in this tenant</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Payment</th>
                <th>Items</th>
                <th>Time</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td className="empty-cell" colSpan={5}>Loading sales…</td></tr>}
              {!loading && sales.length === 0 && <tr><td className="empty-cell" colSpan={5}>No sales yet. Start with a new POS checkout.</td></tr>}
              {!loading && sales.map((sale) => (
                <tr key={sale.id}>
                  <td><strong>{sale.bill_number}</strong></td>
                  <td><span className="payment-pill">{sale.payment_method}</span></td>
                  <td>{sale.items.reduce((sum, item) => sum + item.quantity, 0)} items</td>
                  <td className="muted-cell">{new Date(sale.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td><strong>{currency(sale.total)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
