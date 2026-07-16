'use client';

import { useState } from 'react';

type SnapshotSummary = {
  createdAt: string;
  createdByEmail: string;
  title: string;
  customerName: string;
  programCount: number;
  selectedCsm: string | null;
  boardUpdatedAt: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function BoardSnapshotRestore({ boardId, boardTitle }: { boardId: string; boardTitle: string }) {
  const [snapshot, setSnapshot] = useState<SnapshotSummary | null>(null);
  const [status, setStatus] = useState('Open to load latest snapshot');
  const [loaded, setLoaded] = useState(false);
  const [restoring, setRestoring] = useState(false);

  async function loadSnapshot(open: boolean) {
    if (!open || loaded) return;
    setStatus('Loading snapshot...');
    const response = await fetch(`/api/boards/${boardId}/snapshot`);
    if (!response.ok) {
      setStatus('Could not load snapshot');
      return;
    }
    const data = await response.json();
    setSnapshot(data.snapshot || null);
    setLoaded(true);
    setStatus(data.snapshot ? 'Snapshot loaded' : 'No snapshot has been created yet. Open the board once to create the daily snapshot.');
  }

  async function restoreSnapshot() {
    if (!snapshot) return;
    const confirmed = window.confirm(`Restore "${boardTitle}" to the snapshot from ${formatDate(snapshot.createdAt)}? Current board content will be replaced.`);
    if (!confirmed) return;
    setRestoring(true);
    setStatus('Restoring snapshot...');
    const response = await fetch(`/api/boards/${boardId}/snapshot`, { method: 'POST' });
    if (!response.ok) {
      setRestoring(false);
      setStatus('Could not restore snapshot');
      return;
    }
    setStatus('Snapshot restored');
    window.location.reload();
  }

  return (
    <details className="access-report" onToggle={event => loadSnapshot(event.currentTarget.open)}>
      <summary>Restore snapshot</summary>
      <div className="status">{status}</div>
      {snapshot ? (
        <div className="snapshot-restore-panel">
          <p className="muted">
            Snapshot from {formatDate(snapshot.createdAt)} by {snapshot.createdByEmail}. It contains {snapshot.programCount} program{snapshot.programCount === 1 ? '' : 's'}
            {snapshot.selectedCsm ? ` and CSM ${snapshot.selectedCsm}` : ''}.
          </p>
          <button className="secondary" type="button" onClick={restoreSnapshot} disabled={restoring}>
            {restoring ? 'Restoring...' : 'Restore this snapshot'}
          </button>
        </div>
      ) : null}
    </details>
  );
}
