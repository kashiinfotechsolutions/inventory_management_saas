'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type DashboardResponse = {
  today: { sales: number; bills: number };
  inventory: { products: number; units: number; lowStock: number };
  recentSales: Array<{ id: string; bill_number: string; total: number; payment_method: string; created_at: string }>;
};

type ProductWatch = {
  id: string;
  name: string;
  sku: string;
  quantity_in_stock: number;
  low_stock_threshold: number;
  price: string;
};

const currency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const formatLongDate = (date: Date) => `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`;

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [products, setProducts] = useState<ProductWatch[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const [dashboardRes, productsRes] = await Promise.all([
          fetch('/api/dashboard'),
          fetch('/api/products'),
        ]);

        if (!active) return;

        const dashboardData = dashboardRes.ok ? await dashboardRes.json() : null;
        const productData = productsRes.ok ? await productsRes.json() : null;

        if (!dashboardRes.ok || !dashboardData) {
          setError(dashboardData?.error ?? 'Unable to load dashboard');
        }

        setData(dashboardData);
        setProducts(productData?.products ?? []);
      } catch {
        if (active) setError('Unable to reach the dashboard data source');
      }
    }

    void loadDashboard();
    return () => { active = false; };
  }, []);

  const watchList = products.filter((product) => product.quantity_in_stock <= product.low_stock_threshold).slice(0, 4);

  return (
    <>
      <header className="topbar">
        <div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>Overview</strong></div>
        <div className="top-actions"><button className="icon-button" aria-label="Search">⌕</button><button className="icon-button notification" aria-label="Notifications">♧<i /></button><div className="top-avatar">AK</div></div>
      </header>

      <div className="page-content">
        <div className="page-heading"><div><p className="eyebrow">{formatLongDate(new Date())}</p><h1>Good morning, Arjun<span>.</span></h1><p className="muted">Here is what is happening across your store today.</p></div><button className="primary-button" onClick={() => router.push('/pos')}><span>＋</span> New sale</button></div>

        {error && <div className="form-error inventory-error">{error}</div>}

        <section className="metric-grid" aria-label="Business summary">
          <article className="metric-card accent-green"><div className="metric-top"><span>Today&apos;s sales</span><span className="metric-icon">↗</span></div><strong>{data ? currency(data.today.sales) : '₹0'}</strong><p className="positive">{data ? `${data.today.bills} invoices` : 'Awaiting data'} <span>today</span></p><div className="sparkline green"><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="metric-card accent-orange"><div className="metric-top"><span>Items sold</span><span className="metric-icon">◉</span></div><strong>{data ? data.today.bills : 0}</strong><p className="positive">{data ? `${data.inventory.units} units` : '0 units'} <span>in stock</span></p><div className="sparkline orange"><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="metric-card accent-blue"><div className="metric-top"><span>Stock value</span><span className="metric-icon">◆</span></div><strong>{data ? currency(data.inventory.units * 129) : '₹0'}</strong><p className="neutral">Across {data ? data.inventory.products : 0} products</p><div className="sparkline blue"><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="metric-card accent-red"><div className="metric-top"><span>Low stock alerts</span><span className="metric-icon">!</span></div><strong>{data ? data.inventory.lowStock : 0}</strong><p className="negative">{watchList.length ? `${watchList.length} active` : 'No alerts'} <span>this week</span></p><div className="alert-bars"><i/><i/><i/><i/><i/><i/><i/></div></article>
        </section>

        <div className="dashboard-grid">
          <section className="panel inventory-panel"><div className="panel-heading"><div><h2>Stock watch</h2><p>Products that need your attention</p></div><button className="text-button" onClick={() => router.push('/inventory')}>View inventory <span>→</span></button></div><div className="product-list">{watchList.length ? watchList.map((product) => {
            const percentage = Math.min(100, (product.quantity_in_stock / Math.max(product.low_stock_threshold, 1)) * 100);
            const status = product.quantity_in_stock === 0 ? 'Critical' : 'Reorder';
            return (
              <div className="product-row" key={product.id}>
                <div className={`product-thumb ${status === 'Critical' ? 'critical' : 'reorder'}`}><span>{product.name.charAt(0)}</span></div>
                <div className="product-info"><strong>{product.name}</strong><small>{product.sku}</small></div>
                <div className="stock-level"><div className="stock-bar"><i style={{ width: `${percentage}%` }} /></div><small>{product.quantity_in_stock} units</small></div>
                <div className="product-value"><strong>{currency(Number(product.price))}</strong><span className={`status ${status === 'Critical' ? 'critical' : 'reorder'}`}>{status}</span></div>
              </div>
            );
          }) : <div className="empty-cell" style={{ padding: '30px 22px' }}>No low-stock products right now.</div>}</div></section>
          <section className="panel quick-panel"><div className="panel-heading"><div><h2>Quick actions</h2><p>Common tasks, one click away</p></div></div><div className="quick-actions"><button onClick={() => router.push('/pos')}><span className="action-icon sale">↗</span><span><strong>Record a sale</strong><small>Create a new invoice</small></span><b>→</b></button><button onClick={() => router.push('/purchases')}><span className="action-icon purchase">↓</span><span><strong>Add inventory</strong><small>Record a purchase</small></span><b>→</b></button><button onClick={() => router.push('/reports')}><span className="action-icon report">◫</span><span><strong>View reports</strong><small>Understand your numbers</small></span><b>→</b></button></div></section>
        </div>

        <section className="panel sales-panel"><div className="panel-heading"><div><h2>Recent sales</h2><p>Your latest transactions from today</p></div><button className="text-button" onClick={() => router.push('/sales')}>View all sales <span>→</span></button></div><div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Payment</th><th>Time</th><th>Total</th></tr></thead><tbody>{data && data.recentSales.length ? data.recentSales.map((sale) => (
          <tr key={sale.id}><td><strong>{sale.bill_number}</strong></td><td><span className="payment-pill">{sale.payment_method}</span></td><td className="muted-cell">{new Date(sale.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td><td><strong>{currency(sale.total)}</strong></td></tr>
        )) : <tr><td className="empty-cell" colSpan={4}>No sales yet. Create the first bill from the POS screen.</td></tr>}</tbody></table></div></section>
        <footer className="page-footer"><span>All systems operational</span><span>Last synced just now</span></footer>
      </div>
    </>
  );
}
