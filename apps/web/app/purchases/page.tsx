'use client';

import { useEffect, useState } from 'react';

type Product = {
  id: string;
  name: string;
  sku: string;
  quantity_in_stock: number;
  low_stock_threshold: number;
  price: string;
};

const currency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export default function PurchasesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch('/api/products');
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? 'Unable to load purchases');
          return;
        }
        setProducts(data.products ?? []);
      } catch {
        setError('Unable to load product supply data');
      }
    }

    void loadProducts();
  }, []);

  return (
    <main className="page-content inventory-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Supply</p>
          <h1>Purchases<span>.</span></h1>
          <p className="muted">Park incoming stock, monitor restocks, and keep the floor ready.</p>
        </div>
        <button className="primary-button" onClick={() => window.location.href = '/inventory'}><span>＋</span> Add stock</button>
      </div>

      {error && <div className="form-error inventory-error">{error}</div>}

      <section className="panel inventory-table-panel">
        <div className="panel-heading">
          <div>
            <h2>Stock intake</h2>
            <p>Products being tracked for restocking health</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>In stock</th>
                <th>Reorder point</th>
                <th>Unit price</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? <tr><td className="empty-cell" colSpan={5}>No purchase data available yet.</td></tr> : products.map((product) => (
                <tr key={product.id}>
                  <td><strong>{product.name}</strong></td>
                  <td>{product.sku}</td>
                  <td>{product.quantity_in_stock}</td>
                  <td>{product.low_stock_threshold}</td>
                  <td><strong>{currency(Number(product.price))}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
