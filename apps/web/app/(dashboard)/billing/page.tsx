'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

type Plan = {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  limits: Record<string, string | number>;
};

type BillingData = {
  plans: Plan[];
  currentPlan: Plan | null;
  tenantStatus: string;
  subscription: {
    id: string;
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
    plan_id: string;
  } | null;
};

type BillingCycle = 'MONTHLY' | 'YEARLY';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const currency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [razorpayReady, setRazorpayReady] = useState(false);

  useEffect(() => {
    void loadBilling();
  }, []);

  async function loadBilling() {
    try {
      const response = await fetch('/api/billing');
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Unable to load billing');
        return;
      }
      setBilling(data);
    } catch {
      setError('Unable to load plan information');
    }
  }

  async function handleChoosePlan(planId: string) {
    setSaving(planId);
    setError('');

    try {
      const checkoutResponse = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle }),
      });
      const checkout = await checkoutResponse.json();
      if (!checkoutResponse.ok) {
        setError(checkout.error ?? 'Unable to start checkout');
        return;
      }

      if (!razorpayReady || !window.Razorpay) {
        setError('Payment widget is still loading. Please try again in a moment.');
        return;
      }

      const razorpay = new window.Razorpay({
        key: checkout.keyId,
        amount: checkout.amount,
        currency: checkout.currency,
        order_id: checkout.orderId,
        name: 'Arun Ice Cream & Dairy Products',
        description: `${checkout.planName} plan (${billingCycle === 'YEARLY' ? 'yearly' : 'monthly'})`,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const verifyResponse = await fetch('/api/billing/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });
            const verifyData = await verifyResponse.json();
            if (!verifyResponse.ok) {
              setError(verifyData.error ?? 'Payment succeeded but activation failed. Contact support.');
              return;
            }
            await loadBilling();
          } catch {
            setError('Payment succeeded but activation failed. Contact support.');
          }
        },
        modal: {
          ondismiss: () => setSaving(null),
        },
        theme: { color: '#16724c' },
      });

      razorpay.open();
    } catch {
      setError('Unable to start checkout');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="page-content inventory-page">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={() => setRazorpayReady(true)} />

      <div className="page-heading">
        <div>
          <p className="eyebrow">Commercial</p>
          <h1>Billing<span>.</span></h1>
          <p className="muted">Choose a plan that fits your workspace and operational scale. Payments are processed securely via Razorpay.</p>
        </div>
      </div>

      {error && <div className="form-error inventory-error">{error}</div>}

      <section className="panel inventory-table-panel" style={{ marginBottom: 20 }}>
        <div className="panel-heading">
          <div>
            <h2>Current subscription</h2>
            <p>{billing?.tenantStatus ?? 'TRIALING'} / {billing?.currentPlan ? billing.currentPlan.name : 'No active plan'}</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <tbody>
              <tr><th style={{ textAlign: 'left', padding: '12px 22px' }}>Status</th><td style={{ padding: '12px 22px' }}>{billing?.tenantStatus ?? 'TRIALING'}</td></tr>
              <tr><th style={{ textAlign: 'left', padding: '12px 22px' }}>Active plan</th><td style={{ padding: '12px 22px' }}>{billing?.currentPlan ? billing.currentPlan.name : 'No plan selected'}</td></tr>
              <tr><th style={{ textAlign: 'left', padding: '12px 22px' }}>Renewal</th><td style={{ padding: '12px 22px' }}>{billing?.subscription?.current_period_end ? new Date(billing.subscription.current_period_end).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel inventory-table-panel">
        <div className="panel-heading">
          <div>
            <h2>Plans</h2>
            <p>Choose a monthly or yearly billing option</p>
          </div>
          <div className="table-wrap" style={{ padding: 0 }}>
            <button type="button" className={`text-button ${billingCycle === 'MONTHLY' ? 'active' : ''}`} onClick={() => setBillingCycle('MONTHLY')} style={{ fontWeight: billingCycle === 'MONTHLY' ? 700 : 400 }}>Monthly</button>
            {' '}·{' '}
            <button type="button" className={`text-button ${billingCycle === 'YEARLY' ? 'active' : ''}`} onClick={() => setBillingCycle('YEARLY')} style={{ fontWeight: billingCycle === 'YEARLY' ? 700 : 400 }}>Yearly (2 months free)</button>
          </div>
        </div>

        <div className="card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, padding: 20 }}>
          {(billing?.plans ?? []).map((plan) => {
            const price = billingCycle === 'YEARLY' ? plan.price_yearly : plan.price_monthly;
            const isCurrent = billing?.currentPlan?.id === plan.id;
            return (
              <div key={plan.id} className={`panel ${isCurrent ? 'selected-plan' : ''}`} style={{ padding: 20, border: isCurrent ? '1px solid #b0dfa8' : '1px solid #e7edf4', borderRadius: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <strong style={{ fontSize: 25 }}>{plan.name}</strong>
                  {isCurrent && <span className="status reorder">Current</span>}
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 10 }}>{currency(price)}</div>
                <small style={{ color: '#6d7a86' }}>/ {billingCycle === 'YEARLY' ? 'year' : 'month'}</small>

                <ul style={{ listStyle: 'none', padding: 0, margin: '18px 0', display: 'grid', gap: 8 }}>
                  {Object.entries(plan.limits).map(([key, value]) => (
                    <li key={key} style={{ color: '#374151', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span>{key}</span>
                      <strong>{String(value)}</strong>
                    </li>
                  ))}
                </ul>

                <button
                  className="primary-button"
                  type="button"
                  disabled={saving === plan.id || isCurrent}
                  onClick={() => handleChoosePlan(plan.id)}
                  style={{ width: '100%' }}
                >
                  {isCurrent ? 'Selected' : saving === plan.id ? 'Opening checkout…' : 'Choose plan'}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
