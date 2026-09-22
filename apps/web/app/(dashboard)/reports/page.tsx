'use client';

import { useEffect, useState } from 'react';

type DashboardData = {
  today: { sales: number; bills: number };
  inventory: { products: number; units: number; lowStock: number };
  recentSales: Array<{ id: string; bill_number: string; total: number; payment_method: string; created_at: string }>;
};

const currency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export default function ReportsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/dashboard');
        const result = await response.json();
        if (!response.ok) {
          setError(result.error ?? 'Unable to load reports');
          return;
        }
        setData(result);
      } catch {
        setError('Unable to reach the dashboard API');
      }
    }

    void load();
  }, []);

  return (
    <main className="page-content inventory-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Performance</p>
          <h1>Reports<span>.</span></h1>
          <p className="muted">Review the numbers that matter for store health and daily sales.</p>
        </div>
      </div>

      {error && <div className="form-error inventory-error">{error}</div>}

      <section className="metric-grid" aria-label="Reports overview">
        <article className="metric-card accent-green">
          <div className="metric-top"><span>Sales today</span><span className="metric-icon">↗</span></div>
          <strong>{data ? currency(data.today.sales) : '₹0'}</strong>
          <p className="positive">{data ? `${data.today.bills} bills` : '0 bills'} <span>processed</span></p>
        </article>
        <article className="metric-card accent-orange">
          <div className="metric-top"><span>Units in stock</span><span className="metric-icon">◉</span></div>
          <strong>{data ? data.inventory.units : 0}</strong>
          <p className="positive">Across {data ? data.inventory.products : 0} products</p>
        </article>
        <article className="metric-card accent-blue">
          <div className="metric-top"><span>Low stock</span><span className="metric-icon">◆</span></div>
          <strong>{data ? data.inventory.lowStock : 0}</strong>
          <p className="neutral">Products below reorder threshold</p>
        </article>
        <article className="metric-card accent-red">
          <div className="metric-top"><span>Pending action</span><span className="metric-icon">!</span></div>
          <strong>{data ? data.recentSales.length : 0}</strong>
          <p className="negative">Recent transactions <span>logged</span></p>
        </article>
      </section>

      <section className="panel sales-panel" style={{ marginTop: 22 }}>
        <div className="panel-heading">
          <div>
            <h2>Latest sales snapshot</h2>
            <p>Recent transactions from the current workspace</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Payment</th>
                <th>Time</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {!data || data.recentSales.length === 0 ? <tr><td className="empty-cell" colSpan={4}>No recent sales available.</td></tr> : data.recentSales.map((sale) => (
                <tr key={sale.id}>
                  <td><strong>{sale.bill_number}</strong></td>
                  <td><span className="payment-pill">{sale.payment_method}</span></td>
                  <td className="muted-cell">{new Date(sale.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
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
