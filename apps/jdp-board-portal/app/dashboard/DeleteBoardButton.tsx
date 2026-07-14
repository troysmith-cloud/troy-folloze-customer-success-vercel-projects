'use client';

import { useState } from 'react';

export function DeleteBoardButton({ boardId, boardTitle }: { boardId: string; boardTitle: string }) {
  const [status, setStatus] = useState('');

  async function deleteBoard() {
    const confirmed = window.confirm(`Delete "${boardTitle}"? This removes the board for every authorized user who has access.`);
    if (!confirmed) return;
    setStatus('Deleting...');
    const response = await fetch(`/api/boards/${boardId}`, { method: 'DELETE' });
    if (!response.ok) {
      setStatus('Could not delete');
      return;
    }
    setStatus('Deleted');
    window.location.reload();
  }

  return (
    <div className="delete-board-control">
      <button className="danger" type="button" onClick={deleteBoard}>Delete board</button>
      {status ? <span className="status">{status}</span> : null}
    </div>
  );
}
