'use client';

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

const currency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      if (data.currentPlan) {
        setSelectedPlan(data.currentPlan.id);
      } else if (data.plans?.length) {
        setSelectedPlan(data.plans[0].id);
      }
    } catch {
      setError('Unable to load plan information');
    }
  }

  async function handlePlanChange(planId: string) {
    if (!planId) return;
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Unable to switch plan');
        return;
      }

      await loadBilling();
    } catch {
      setError('Unable to update billing plan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-content inventory-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Commercial</p>
          <h1>Billing<span>.</span></h1>
          <p className="muted">Choose a plan that fits your workspace and operational scale.</p>
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
        </div>

        <div className="card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, padding: 20 }}>
          {(billing?.plans ?? []).map((plan) => (
            <div key={plan.id} className={`panel ${selectedPlan === plan.id ? 'selected-plan' : ''}`} style={{ padding: 20, border: selectedPlan === plan.id ? '1px solid #b0dfa8' : '1px solid #e7edf4', borderRadius: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <strong style={{ fontSize: 25 }}>{plan.name}</strong>
                {billing?.currentPlan?.id === plan.id && <span className="status reorder">Current</span>}
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 10 }}>{currency(plan.price_monthly)}</div>
              <small style={{ color: '#6d7a86' }}>/ month</small>

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
                disabled={saving || selectedPlan === plan.id}
                onClick={() => handlePlanChange(plan.id)}
                style={{ width: '100%' }}
              >
                {billing?.currentPlan?.id === plan.id ? 'Selected' : 'Choose plan'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
