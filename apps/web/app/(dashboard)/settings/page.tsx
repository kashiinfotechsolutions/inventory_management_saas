'use client';

import { useEffect, useState } from 'react';

type TenantData = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  subscription_status: string;
};

export default function SettingsPage() {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [form, setForm] = useState({ name: '', currency: 'INR', timezone: 'Asia/Kolkata' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? 'Unable to load tenant settings');
          return;
        }
        setTenant(data.tenant);
        setForm({
          name: data.tenant.name ?? '',
          currency: data.tenant.currency ?? 'INR',
          timezone: data.tenant.timezone ?? 'Asia/Kolkata',
        });
      } catch {
        setError('Unable to load tenant data');
      }
    }

    void load();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenant) return;

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          currency: form.currency,
          timezone: form.timezone,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Unable to update settings');
        return;
      }

      setTenant(data.tenant);
      setForm({
        name: data.tenant.name ?? '',
        currency: data.tenant.currency ?? 'INR',
        timezone: data.tenant.timezone ?? 'Asia/Kolkata',
      });
    } catch {
      setError('Unable to save workspace settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-content inventory-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Settings<span>.</span></h1>
          <p className="muted">Manage the tenant details and operational preferences for this workspace.</p>
        </div>
      </div>

      {error && <div className="form-error inventory-error">{error}</div>}

      <section className="panel inventory-table-panel" style={{ marginBottom: 20 }}>
        <div className="panel-heading">
          <div>
            <h2>Tenant profile</h2>
            <p>Update the active workspace identity</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-grid" style={{ padding: '0 18px 14px' }}>
          <label>
            <span>Store name</span>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>

          <label>
            <span>Currency</span>
            <select value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="AED">AED</option>
            </select>
          </label>

          <label>
            <span>Timezone</span>
            <select value={form.timezone} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}>
              <option value="Asia/Kolkata">Asia/Kolkata</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
            </select>
          </label>

          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button className="primary-button" type="submit" disabled={saving || !tenant}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel inventory-table-panel">
        <div className="panel-heading">
          <div>
            <h2>Workspace summary</h2>
            <p>Current tenant values</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <tbody>
              <tr><th style={{ textAlign: 'left', padding: '12px 22px' }}>Name</th><td style={{ padding: '12px 22px' }}>{tenant?.name ?? '—'}</td></tr>
              <tr><th style={{ textAlign: 'left', padding: '12px 22px' }}>Slug</th><td style={{ padding: '12px 22px' }}>{tenant?.slug ?? '—'}</td></tr>
              <tr><th style={{ textAlign: 'left', padding: '12px 22px' }}>Currency</th><td style={{ padding: '12px 22px' }}>{tenant?.currency ?? 'INR'}</td></tr>
              <tr><th style={{ textAlign: 'left', padding: '12px 22px' }}>Timezone</th><td style={{ padding: '12px 22px' }}>{tenant?.timezone ?? 'Asia/Kolkata'}</td></tr>
              <tr><th style={{ textAlign: 'left', padding: '12px 22px' }}>Subscription status</th><td style={{ padding: '12px 22px' }}>{tenant?.subscription_status ?? 'TRIALING'}</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
