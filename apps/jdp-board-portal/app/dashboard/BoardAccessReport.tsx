'use client';

import { useState } from 'react';

type ReportRow = {
  email: string;
  accessRole: 'owner' | 'shared';
  firstAccessedAt: string | null;
  lastAccessedAt: string | null;
  accessCount: number;
};

function formatDate(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
}

export function BoardAccessReport({ boardId }: { boardId: string }) {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [status, setStatus] = useState('Open to load report');
  const [loaded, setLoaded] = useState(false);

  async function loadReport(open: boolean) {
    if (!open || loaded) return;
    setStatus('Loading report...');
    const response = await fetch(`/api/boards/${boardId}/access-report`);
    if (!response.ok) {
      setStatus('Could not load access report');
      return;
    }
    const data = await response.json();
    setRows(data.report || []);
    setLoaded(true);
    setStatus('Access report loaded');
  }

  return (
    <details className="access-report" onToggle={event => loadReport(event.currentTarget.open)}>
      <summary>Access report</summary>
      <div className="status">{status}</div>
      {rows.length ? (
        <div className="access-report-table" role="table" aria-label="Board access report">
          <div className="access-report-head" role="row">
            <span role="columnheader">User</span>
            <span role="columnheader">Role</span>
            <span role="columnheader">Last access</span>
            <span role="columnheader">Opens</span>
          </div>
          {rows.map(row => (
            <div className="access-report-row" role="row" key={row.email}>
              <span role="cell">{row.email}</span>
              <span role="cell">{row.accessRole === 'owner' ? 'Owner' : 'Shared'}</span>
              <span role="cell">{formatDate(row.lastAccessedAt)}</span>
              <span role="cell">{row.accessCount}</span>
            </div>
          ))}
        </div>
      ) : null}
    </details>
  );
}
