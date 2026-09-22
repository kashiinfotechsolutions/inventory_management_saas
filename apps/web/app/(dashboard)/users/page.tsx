'use client';

import { useEffect, useState } from 'react';

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'CASHIER';
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState({ name: '', email: '', role: 'CASHIER', password: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Unable to load team members');
        return;
      }
      setUsers(data.users ?? []);
    } catch {
      setError('Unable to reach the team endpoint');
    }
  }

  const [actionError, setActionError] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function updateUser(id: string, body: Record<string, unknown>) {
    setActionError('');
    setPendingId(id);
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      });
      const data = await response.json();
      if (!response.ok) {
        setActionError(data.error ?? 'Unable to update team member');
        return;
      }
      await loadUsers();
    } catch {
      setActionError('Unable to update team member');
    } finally {
      setPendingId(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Unable to create team member');
        return;
      }

      setForm({ name: '', email: '', role: 'CASHIER', password: '' });
      await loadUsers();
    } catch {
      setError('Unable to create team member');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-content inventory-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">People</p>
          <h1>Team<span>.</span></h1>
          <p className="muted">Manage staff access, core roles, and daily operational control.</p>
        </div>
      </div>

      {error && <div className="form-error inventory-error">{error}</div>}
      {actionError && <div className="form-error inventory-error">{actionError}</div>}

      <section className="panel inventory-table-panel" style={{ marginBottom: 20 }}>
        <div className="panel-heading">
          <div>
            <h2>Add team member</h2>
            <p>Invite staff with a role and secure access</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-grid" style={{ padding: '0 18px 14px' }}>
          <label>
            <span>Full name</span>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>

          <label>
            <span>Email</span>
            <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          </label>

          <label>
            <span>Role</span>
            <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserRow['role'] }))}>
              <option value="OWNER">Owner</option>
              <option value="MANAGER">Manager</option>
              <option value="CASHIER">Cashier</option>
            </select>
          </label>

          <label>
            <span>Password</span>
            <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
          </label>

          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Add member'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel inventory-table-panel">
        <div className="panel-heading">
          <div>
            <h2>Current workspace team</h2>
            <p>{users.length} active members in this tenant</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? <tr><td className="empty-cell" colSpan={6}>No team members have been added yet.</td></tr> : users.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.name}</strong></td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      value={user.role}
                      disabled={pendingId === user.id}
                      onChange={(event) => updateUser(user.id, { role: event.target.value })}
                    >
                      <option value="OWNER">Owner</option>
                      <option value="MANAGER">Manager</option>
                      <option value="CASHIER">Cashier</option>
                    </select>
                  </td>
                  <td><span className={`status ${user.is_active ? 'reorder' : 'critical'}`}>{user.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="muted-cell">{user.last_login_at ? new Date(user.last_login_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                  <td>
                    <button
                      className="text-button"
                      type="button"
                      disabled={pendingId === user.id}
                      onClick={() => updateUser(user.id, { is_active: !user.is_active })}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
