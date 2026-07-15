'use client';

import { useState } from 'react';

export function OpenBoardButton({ boardId }: { boardId: string }) {
  const [opening, setOpening] = useState(false);
  const [status, setStatus] = useState('');

  async function openBoard() {
    setOpening(true);
    setStatus('');
    const response = await fetch(`/api/boards/${boardId}/open`, { method: 'POST' });
    if (!response.ok) {
      setOpening(false);
      setStatus('Could not open');
      return;
    }
    const data = await response.json();
    window.location.assign(data.url);
  }

  return (
    <>
      <button className="primary" type="button" onClick={openBoard} disabled={opening}>
        {opening ? 'Opening...' : 'Open'}
      </button>
      {status ? <span className="status">{status}</span> : null}
    </>
  );
}
