'use client';

import { useState } from 'react';

export function OpenBoardButton({ boardId }: { boardId: string }) {
  const [opening, setOpening] = useState(false);

  function openBoard() {
    setOpening(true);
    window.location.assign(`/dashboard/open/${boardId}`);
  }

  return (
    <button className="primary" type="button" onClick={openBoard} disabled={opening}>
      {opening ? 'Opening...' : 'Open'}
    </button>
  );
}
