'use client';

import { FormEvent, useEffect, useState } from 'react';

type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category: string | null;
  price: string;
  quantity_in_stock: number;
  low_stock_threshold: number;
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [form, setForm] = useState({ sku: '', barcode: '', name: '', category: '', mrp: '', price: '', quantityInStock: '0', lowStockThreshold: '10' });

  async function loadProducts() {
    const response = await fetch('/api/products');
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? 'Unable to load products');
      return;
    }
    setProducts(data.products);
  }

  useEffect(() => { void loadProducts(); }, []);

  function openCreateForm() {
    setEditProductId(null);
    setForm({ sku: '', barcode: '', name: '', category: '', mrp: '', price: '', quantityInStock: '0', lowStockThreshold: '10' });
    setFormOpen(true);
  }

  function openEditForm(product: Product) {
    setEditProductId(product.id);
    setForm({
      sku: product.sku,
      barcode: product.barcode ?? '',
      name: product.name,
      category: product.category ?? '',
      mrp: String((Number(product.price) * 1.1).toFixed(2)),
      price: String(Number(product.price)),
      quantityInStock: String(product.quantity_in_stock),
      lowStockThreshold: String(product.low_stock_threshold),
    });
    setFormOpen(true);
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...form, mrp: Number(form.mrp), price: Number(form.price), quantityInStock: Number(form.quantityInStock), lowStockThreshold: Number(form.lowStockThreshold) }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? 'Unable to create product');
      return;
    }
    setProducts((current) => [...current, data.product]);
    setForm({ sku: '', barcode: '', name: '', category: '', mrp: '', price: '', quantityInStock: '0', lowStockThreshold: '10' });
    setFormOpen(false);
  }

  async function updateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editProductId) return;
    setError('');
    const response = await fetch('/api/products', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: editProductId,
        ...form,
        mrp: Number(form.mrp),
        price: Number(form.price),
        quantityInStock: Number(form.quantityInStock),
        lowStockThreshold: Number(form.lowStockThreshold),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? 'Unable to update product');
      return;
    }
    setProducts((current) => current.map((product) => product.id === editProductId ? data.product : product));
    setFormOpen(false);
    setEditProductId(null);
  }

  async function deleteProduct(id: string) {
    setError('');
    const response = await fetch('/api/products', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? 'Unable to delete product');
      return;
    }
    setProducts((current) => current.filter((product) => product.id !== id));
  }

  const submitHandler = editProductId ? updateProduct : createProduct;

  return (
    <div className="page-content inventory-page">
      <div className="page-heading"><div><p className="eyebrow">Catalog control</p><h1>Inventory<span>.</span></h1><p className="muted">Keep every shelf, SKU and reorder point in view.</p></div><button className="primary-button" onClick={openCreateForm}><span>＋</span> Add product</button></div>
      {error && <div className="form-error inventory-error">{error} {error === 'Unauthorized' && <a href="/login">Sign in</a>}</div>}
      <section className="panel inventory-table-panel"><div className="panel-heading"><div><h2>Product catalog</h2><p>{products.length} active products in this workspace</p></div><button className="text-button" onClick={() => void loadProducts()}>Refresh <span>↻</span></button></div><div className="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>In stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong></td><td>{product.sku}</td><td className="muted-cell">{product.category ?? 'Uncategorised'}</td><td><strong>₹{product.price}</strong></td><td>{product.quantity_in_stock}</td><td><span className={`status ${product.quantity_in_stock <= product.low_stock_threshold ? 'reorder' : 'healthy'}`}>{product.quantity_in_stock <= product.low_stock_threshold ? 'Reorder' : 'Healthy'}</span></td><td><div style={{ display: 'flex', gap: '8px' }}><button className="text-button" type="button" onClick={() => openEditForm(product)}>Edit</button><button className="text-button" type="button" style={{ color: '#d55b4a' }} onClick={() => void deleteProduct(product.id)}>Delete</button></div></td></tr>)}{products.length === 0 && <tr><td className="empty-cell" colSpan={7}>{error ? 'Connect the database and sign in to load inventory.' : 'No products yet. Add your first product to begin.'}</td></tr>}</tbody></table></div></section>
      {formOpen && <div className="modal-backdrop" role="presentation"><form className="product-form" onSubmit={submitHandler}><div className="panel-heading"><div><h2>{editProductId ? 'Edit product' : 'Add product'}</h2><p>{editProductId ? 'Update the product details.' : 'Create a SKU for this workspace.'}</p></div><button type="button" className="row-more" onClick={() => { setFormOpen(false); setEditProductId(null); }} aria-label="Close">×</button></div><label>Product name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>SKU<input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} required /></label><label>Category<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label><div className="form-row"><label>MRP<input type="number" min="0" step="0.01" value={form.mrp} onChange={(event) => setForm({ ...form, mrp: event.target.value })} required /></label><label>Selling price<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} required /></label></div><div className="form-row"><label>Opening quantity<input type="number" min="0" step="1" value={form.quantityInStock} onChange={(event) => setForm({ ...form, quantityInStock: event.target.value })} /></label><label>Reorder point<input type="number" min="0" step="1" value={form.lowStockThreshold} onChange={(event) => setForm({ ...form, lowStockThreshold: event.target.value })} /></label></div>{error && <p className="form-error">{error}</p>}<button className="primary-button auth-submit">{editProductId ? 'Update product' : 'Save product'} <span>→</span></button></form></div>}
    </div>
  );
}
