'use client';

import { useEffect, useState } from 'react';

type AuditLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user: { id: string; name: string; email: string; role: string } | null;
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/audit');
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? 'Unable to load audit log');
          return;
        }
        setLogs(data.logs ?? []);
      } catch {
        setError('Unable to reach the audit log');
      }
    }

    void load();
  }, []);

  return (
    <div className="page-content inventory-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Security</p>
          <h1>Audit trail<span>.</span></h1>
          <p className="muted">Track operational changes, approvals, and key tenant actions.</p>
        </div>
      </div>

      {error && <div className="form-error inventory-error">{error}</div>}

      <section className="panel inventory-table-panel">
        <div className="panel-heading">
          <div>
            <h2>Recent activity</h2>
            <p>{logs.length} audit entries in this workspace</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Entity</th>
                <th>User</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? <tr><td className="empty-cell" colSpan={4}>No audit events recorded yet.</td></tr> : logs.map((log) => (
                <tr key={log.id}>
                  <td><strong>{log.action}</strong></td>
                  <td>{log.entity_type} {log.entity_id ? `#${log.entity_id.slice(0, 8)}` : ''}</td>
                  <td>{log.user ? log.user.name : 'System'}</td>
                  <td className="muted-cell">{new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
