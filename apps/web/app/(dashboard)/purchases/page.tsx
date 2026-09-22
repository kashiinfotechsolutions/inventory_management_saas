'use client';

import { FormEvent, useEffect, useState } from 'react';

type Product = {
  id: string;
  name: string;
  sku: string;
  quantity_in_stock: number;
  low_stock_threshold: number;
  price: string;
};

type UploadBatch = {
  id: string;
  status: string;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
};

type RestockMode = 'ADD_QUANTITY' | 'CLOSING_SYNC';

const currency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

const RESTOCK_TEMPLATE = 'sku,quantity,unit_cost\nMILK-500ML,50,24\n';

function downloadTemplate(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function PurchasesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [restockMode, setRestockMode] = useState<RestockMode>('ADD_QUANTITY');
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvError, setCsvError] = useState('');
  const [csvResult, setCsvResult] = useState<{ batch: UploadBatch; errors: Array<{ row: number; error: string }> } | null>(null);

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

  useEffect(() => {
    void loadProducts();
  }, []);

  async function handleCsvRestock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csvFile) return;
    setCsvUploading(true);
    setCsvError('');
    setCsvResult(null);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('type', 'RESTOCK');
      formData.append('mode', restockMode);
      const response = await fetch('/api/uploads', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) {
        setCsvError(data.error ?? 'Unable to process restock file');
        return;
      }
      setCsvResult(data);
      setCsvFile(null);
      await loadProducts();
    } catch {
      setCsvError('Unable to process restock file');
    } finally {
      setCsvUploading(false);
    }
  }

  return (
    <div className="page-content inventory-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Supply</p>
          <h1>Purchases<span>.</span></h1>
          <p className="muted">Park incoming stock, monitor restocks, and keep the floor ready.</p>
        </div>
        <button className="primary-button" onClick={() => window.location.href = '/inventory'}><span>＋</span> Add stock</button>
      </div>

      {error && <div className="form-error inventory-error">{error}</div>}

      <section className="panel inventory-table-panel" style={{ marginBottom: 20 }}>
        <div className="panel-heading">
          <div>
            <h2>Bulk restock (CSV)</h2>
            <p>Update stock quantities for many SKUs at once. Up to 5,000 rows per file.</p>
          </div>
          <button className="text-button" type="button" onClick={() => downloadTemplate('restock-template.csv', RESTOCK_TEMPLATE)}>Download template <span>↓</span></button>
        </div>

        <form onSubmit={handleCsvRestock} className="form-grid" style={{ padding: '0 18px 14px', alignItems: 'end' }}>
          <label>
            <span>Mode</span>
            <select value={restockMode} onChange={(event) => setRestockMode(event.target.value as RestockMode)}>
              <option value="ADD_QUANTITY">Add to existing stock</option>
              <option value="CLOSING_SYNC">Set as closing stock (overwrite)</option>
            </select>
          </label>
          <label>
            <span>CSV file</span>
            <input type="file" accept=".csv,text/csv" onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)} />
          </label>
          <div>
            <button className="primary-button" type="submit" disabled={!csvFile || csvUploading}>
              {csvUploading ? 'Processing…' : 'Upload restock file'}
            </button>
          </div>
        </form>

        {csvError && <p className="form-error" style={{ margin: '0 18px 14px' }}>{csvError}</p>}

        {csvResult && (
          <div style={{ margin: '0 18px 18px' }}>
            <p className="muted">
              {csvResult.batch.success_rows} of {csvResult.batch.total_rows} rows applied successfully
              {csvResult.batch.failed_rows > 0 ? `, ${csvResult.batch.failed_rows} failed.` : '.'}
            </p>
            {csvResult.errors.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Row</th><th>Error</th></tr></thead>
                  <tbody>
                    {csvResult.errors.slice(0, 20).map((rowError) => (
                      <tr key={rowError.row}><td>{rowError.row}</td><td>{rowError.error}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

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
    </div>
  );
}
