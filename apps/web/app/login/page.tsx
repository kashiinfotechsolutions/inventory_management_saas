'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? 'Unable to sign in');
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel">
        <div className="brand"><span className="brand-mark">S</span><span className="brand-name">scoopstock</span><span className="brand-badge">PRO</span></div>
        <div className="auth-message"><p className="eyebrow">Retail, in rhythm</p><h1>Know your stock.<br /><em>Grow your store.</em></h1><p>One calm command center for every product, purchase and sale.</p></div>
        <div className="auth-stat"><strong>₹18,460</strong><span>today&apos;s sales <b>↑ 12.8%</b></span></div>
      </section>
      <section className="auth-form-panel">
        <form className="auth-form" onSubmit={submit}>
          <p className="eyebrow">Welcome back</p><h2>Sign in to your workspace</h2><p className="muted">Use your Scoopstock account to continue.</p>
          <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@yourstore.com" required /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button auth-submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}<span>→</span></button>
          <p className="form-footnote">New to Scoopstock? <a href="/signup">Create an account</a></p>
        </form>
      </section>
    </main>
  );
}
