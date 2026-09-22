'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const email = searchParams.get('email') ?? '';
    const token = searchParams.get('token') ?? '';
    if (!email || !token) {
      setError('This reset link is invalid. Please request a new one.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword: password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Unable to reset password');
        return;
      }
      router.push('/login');
    } catch {
      setError('Unable to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <p className="eyebrow">Reset password</p><h2>Set a new password</h2><p className="muted">Use at least 8 characters.</p>
      <label>New password<input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      <label>Confirm password<input type="password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button auth-submit" disabled={loading}>{loading ? 'Saving...' : 'Reset password'}<span>→</span></button>
      <p className="form-footnote"><a href="/login">Back to sign in</a></p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="auth-shell">
      <section className="auth-brand-panel">
        <div className="brand"><span className="brand-mark">A</span><span className="brand-name">Arun Dairy</span><span className="brand-badge">PRO</span></div>
        <div className="auth-message"><p className="eyebrow">Account recovery</p><h1>Choose a new<br /><em>password.</em></h1></div>
      </section>
      <section className="auth-form-panel">
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </section>
    </main>
  );
}
