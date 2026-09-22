'use client';

import { FormEvent, useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? 'Unable to process request');
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Unable to process request');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel">
        <div className="brand"><span className="brand-mark">A</span><span className="brand-name">Arun Dairy</span><span className="brand-badge">PRO</span></div>
        <div className="auth-message"><p className="eyebrow">Account recovery</p><h1>Forgot your<br /><em>password?</em></h1><p>We&apos;ll send you a link to get back into your workspace.</p></div>
      </section>
      <section className="auth-form-panel">
        {submitted ? (
          <div className="auth-form">
            <p className="eyebrow">Check your email</p>
            <h2>Reset link sent</h2>
            <p className="muted">If an account exists for {email}, a password reset link has been sent. It expires in 60 minutes.</p>
            <p className="form-footnote"><a href="/login">Back to sign in</a></p>
          </div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <p className="eyebrow">Reset password</p><h2>Enter your email</h2><p className="muted">We&apos;ll send a reset link if an account exists.</p>
            <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@yourstore.com" required /></label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button auth-submit" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}<span>→</span></button>
            <p className="form-footnote"><a href="/login">Back to sign in</a></p>
          </form>
        )}
      </section>
    </main>
  );
}
