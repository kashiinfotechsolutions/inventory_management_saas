'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  price: string;
  quantity_in_stock: number;
  gst_rate: string;
};
type CartItem = Product & { quantity: number };

type BillItem = {
  id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: string;
  gst_rate: string;
  line_total: string;
};
type Bill = {
  id: string;
  bill_number: string;
  subtotal: string;
  discount_amount: string;
  cgst_amount: string;
  sgst_amount: string;
  total: string;
  payment_method: string;
  created_at: string;
  items: BillItem[];
};

const currency = (value: number) => `₹${value.toFixed(2)}`;

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState('');
  const [barcode, setBarcode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastBill, setLastBill] = useState<Bill | null>(null);

  useEffect(() => {
    fetch('/api/products').then(async (response) => {
      const data = await response.json();
      if (response.ok) setProducts(data.products);
      else setMessage(data.error ?? 'Unable to load products');
    });
  }, []);

  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.sku} ${product.barcode ?? ''}`.toLowerCase().includes(query.toLowerCase()),
  );
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [cart]);
  const tax = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity * Number(item.gst_rate) / 100, 0), [cart]);
  const total = subtotal + tax;

  function addProduct(product: Product) {
    setMessage('');
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => item.id === product.id
          ? { ...item, quantity: Math.min(item.quantity + 1, product.quantity_in_stock) }
          : item);
      }
      return [...current, { ...product, quantity: 1 }];
    });
  }

  async function scanBarcode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = barcode.trim();
    if (!value) return;
    setMessage('');
    const response = await fetch(`/api/products?barcode=${encodeURIComponent(value)}`);
    const data = await response.json();
    if (!response.ok || !data) {
      setMessage('No active product matches that barcode');
      return;
    }
    if (!data.quantity_in_stock) {
      setMessage(`${data.name} is out of stock`);
      return;
    }
    addProduct(data);
    setBarcode('');
  }

  function changeQuantity(id: string, delta: number) {
    setCart((current) => current.flatMap((item) => {
      if (item.id !== id) return [item];
      const quantity = item.quantity + delta;
      return quantity > 0 && quantity <= item.quantity_in_stock
        ? [{ ...item, quantity }]
        : quantity <= 0 ? [] : [item];
    }));
  }

  async function checkout() {
    if (!cart.length) return;
    setSubmitting(true);
    setMessage('');
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ paymentMethod, items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })) }),
    });
    const data = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setMessage(data.error ?? 'Checkout failed');
      return;
    }
    setMessage(`${data.bill.bill_number} completed successfully`);
    setProducts((current) => current.map((product) => {
      const item = cart.find((cartItem) => cartItem.id === product.id);
      return item ? { ...product, quantity_in_stock: product.quantity_in_stock - item.quantity } : product;
    }));
    setCart([]);
    setLastBill(data.bill);
  }

  return (
    <div className="pos-page">
      <header className="pos-header">
        <div><p className="eyebrow">Point of sale</p><h1>New sale<span>.</span></h1></div>
        <a className="text-button" href="/">← Back to overview</a>
      </header>
      <div className="pos-layout">
        <section className="pos-products panel">
          <form className="barcode-form" onSubmit={(event) => void scanBarcode(event)}>
            <input aria-label="Scan barcode" autoComplete="off" placeholder="Scan barcode and press Enter" value={barcode} onChange={(event) => setBarcode(event.target.value)} autoFocus />
            <button className="primary-button" type="submit">Scan</button>
          </form>
          <div className="pos-toolbar">
            <input aria-label="Search products" placeholder="Search by name or SKU" value={query} onChange={(event) => setQuery(event.target.value)} />
            <span>{filteredProducts.length} products</span>
          </div>
          <div className="pos-product-grid">
            {filteredProducts.map((product) => (
              <button className="pos-product" key={product.id} disabled={!product.quantity_in_stock} onClick={() => addProduct(product)}>
                <span className="pos-product-mark">{product.name.charAt(0)}</span>
                <strong>{product.name}</strong>
                <small>{product.sku} · {product.quantity_in_stock} left</small>
                <b>₹{product.price}</b>
              </button>
            ))}
            {!filteredProducts.length && <p className="empty-cell">No products match your search.</p>}
          </div>
        </section>
        <aside className="cart-panel panel">
          <div className="panel-heading"><div><h2>Current sale</h2><p>{cart.length} line items</p></div><button className="row-more" onClick={() => setCart([])} aria-label="Clear cart">Clear</button></div>
          <div className="cart-items">
            {cart.map((item) => (
              <div className="cart-item" key={item.id}><div><strong>{item.name}</strong><small>₹{item.price} each</small></div><div className="quantity-controls"><button onClick={() => changeQuantity(item.id, -1)}>-</button><span>{item.quantity}</span><button onClick={() => changeQuantity(item.id, 1)}>+</button></div><b>₹{(Number(item.price) * item.quantity).toFixed(2)}</b></div>
            ))}
            {!cart.length && <p className="empty-cell">Choose products or scan a barcode to start a sale.</p>}
          </div>
          <div className="cart-summary"><div><span>Subtotal</span><b>₹{subtotal.toFixed(2)}</b></div><div><span>GST</span><b>₹{tax.toFixed(2)}</b></div><div className="cart-total"><span>Total</span><strong>₹{total.toFixed(2)}</strong></div><label>Payment method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="CASH">Cash</option><option value="CARD">Card</option><option value="UPI">UPI</option><option value="OTHER">Other</option></select></label>{message && <p className={message.includes('completed') ? 'form-success' : 'form-error'}>{message}</p>}<button className="primary-button checkout-button" disabled={!cart.length || submitting} onClick={() => void checkout()}>{submitting ? 'Processing...' : 'Complete sale'}<span>→</span></button></div>
        </aside>
      </div>

      {lastBill && (
        <div className="modal-backdrop receipt-backdrop" role="presentation">
          <div className="receipt-card">
            <div className="receipt-print">
              <div className="receipt-store">
                <strong>Arun Ice Cream &amp; Dairy Products</strong>
                <small>Tax Invoice</small>
              </div>
              <div className="receipt-meta">
                <div><span>Invoice</span><b>{lastBill.bill_number}</b></div>
                <div><span>Date</span><b>{new Date(lastBill.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</b></div>
                <div><span>Payment</span><b>{lastBill.payment_method}</b></div>
              </div>
              <div className="receipt-items">
                {lastBill.items.map((item) => (
                  <div className="receipt-line" key={item.id}>
                    <span>{item.product_name} × {item.quantity}</span>
                    <b>{currency(Number(item.line_total))}</b>
                  </div>
                ))}
              </div>
              <div className="receipt-totals">
                <div className="receipt-line"><span>Subtotal</span><b>{currency(Number(lastBill.subtotal))}</b></div>
                {Number(lastBill.discount_amount) > 0 && <div className="receipt-line"><span>Discount</span><b>-{currency(Number(lastBill.discount_amount))}</b></div>}
                <div className="receipt-line"><span>CGST</span><b>{currency(Number(lastBill.cgst_amount))}</b></div>
                <div className="receipt-line"><span>SGST</span><b>{currency(Number(lastBill.sgst_amount))}</b></div>
                <div className="receipt-line receipt-grand-total"><span>Total</span><b>{currency(Number(lastBill.total))}</b></div>
              </div>
              <p className="receipt-footer">Thank you for shopping with us!</p>
            </div>
            <div className="receipt-actions no-print">
              <button className="primary-button" type="button" onClick={() => window.print()}>Print receipt</button>
              <button className="text-button" type="button" onClick={() => setLastBill(null)}>Start new sale</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
