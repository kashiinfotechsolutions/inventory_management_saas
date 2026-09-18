'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', tenantName: '', tenantSlug: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? 'Unable to create account');
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel">
        <div className="brand"><span className="brand-mark">S</span><span className="brand-name">scoopstock</span><span className="brand-badge">PRO</span></div>
        <div className="auth-message"><p className="eyebrow">A better start</p><h1>Build a store<br /><em>that flows.</em></h1><p>Set up your workspace and take control of every shelf, sale and signal.</p></div>
      </section>
      <section className="auth-form-panel">
        <form className="auth-form" onSubmit={submit}>
          <p className="eyebrow">Create workspace</p><h2>Start your store</h2><p className="muted">Your first account will be the workspace owner.</p>
          <label>Your name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
          <label>Store name<input value={form.tenantName} onChange={(event) => setForm({ ...form, tenantName: event.target.value })} required /></label>
          <label>Workspace slug<input value={form.tenantSlug} onChange={(event) => setForm({ ...form, tenantSlug: event.target.value.toLowerCase().replace(/\s+/g, '-') })} placeholder="my-store" required /></label>
          <label>Email address<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label>Password<input type="password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button auth-submit" disabled={loading}>{loading ? 'Creating workspace...' : 'Create workspace'}<span>→</span></button>
          <p className="form-footnote">Already have an account? <a href="/login">Sign in</a></p>
        </form>
      </section>
    </main>
  );
}
