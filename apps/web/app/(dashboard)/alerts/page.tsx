'use client';

import { useEffect, useState } from 'react';

type Alert = {
  id: string;
  type: string;
  product: {
    id: string;
    name: string;
    sku: string;
    quantity_in_stock: number;
    low_stock_threshold: number;
  };
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAlerts() {
      try {
        const response = await fetch('/api/alerts');
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? 'Unable to load alerts');
          return;
        }
        setAlerts(data.alerts ?? []);
      } catch {
        setError('Unable to reach the product stream');
      }
    }

    void loadAlerts();
  }, []);

  return (
    <div className="page-content inventory-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Operational</p>
          <h1>Alerts<span>.</span></h1>
          <p className="muted">Stay ahead of low-stock and out-of-stock conditions.</p>
        </div>
      </div>

      {error && <div className="form-error inventory-error">{error}</div>}

      <section className="panel inventory-table-panel">
        <div className="panel-heading">
          <div>
            <h2>Stock alerts</h2>
            <p>{alerts.length} items need attention</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Current stock</th>
                <th>Threshold</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? <tr><td className="empty-cell" colSpan={6}>No alerts. Inventory looks healthy right now.</td></tr> : alerts.map((alert) => (
                <tr key={alert.id}>
                  <td><strong>{alert.product.name}</strong></td>
                  <td>{alert.product.sku}</td>
                  <td>{alert.product.quantity_in_stock}</td>
                  <td>{alert.product.low_stock_threshold}</td>
                  <td><span className={`status ${alert.type === 'OUT_OF_STOCK' ? 'critical' : 'reorder'}`}>{alert.type === 'OUT_OF_STOCK' ? 'Out of stock' : 'Low stock'}</span></td>
                  <td><button className="text-button" onClick={async () => { await fetch('/api/alerts', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: alert.id, status: 'RESOLVED' }) }); setAlerts((current) => current.filter((item) => item.id !== alert.id)); }}>Resolve</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
