'use client';

import { useState } from 'react';

export function DeleteBoardButton({ boardId, boardTitle, accessRole }: { boardId: string; boardTitle: string; accessRole: 'owner' | 'shared' }) {
  const [status, setStatus] = useState('');
  const isOwner = accessRole === 'owner';

  async function deleteBoard() {
    const confirmed = window.confirm(
      isOwner
        ? `Permanently delete "${boardTitle}"? This removes the board for every authorized user who has access.`
        : `Hide "${boardTitle}" from your board list? The board will remain available to the owner and other authorized users.`
    );
    if (!confirmed) return;
    setStatus(isOwner ? 'Deleting...' : 'Hiding...');
    const response = await fetch(`/api/boards/${boardId}`, { method: 'DELETE' });
    if (!response.ok) {
      setStatus(isOwner ? 'Could not delete' : 'Could not hide');
      return;
    }
    setStatus(isOwner ? 'Deleted' : 'Hidden');
    window.location.reload();
  }

  return (
    <div className="delete-board-control">
      <button className="danger" type="button" onClick={deleteBoard}>{isOwner ? 'Delete board' : 'Hide from my view'}</button>
      {status ? <span className="status">{status}</span> : null}
    </div>
  );
}
