'use client';

import { FormEvent, useState } from 'react';

export function RenameBoardForm({ boardId, initialTitle }: { boardId: string; initialTitle: string }) {
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setStatus('Name required');
      return;
    }
    setStatus('Saving name...');
    const response = await fetch(`/api/boards/${boardId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: cleanTitle })
    });
    if (!response.ok) {
      setStatus('Could not save name');
      return;
    }
    setStatus('Name saved');
    window.location.reload();
  }

  return (
    <form className="rename-board-form" onSubmit={submit}>
      <label htmlFor={`rename-${boardId}`}>Board name</label>
      <div className="rename-row">
        <input
          id={`rename-${boardId}`}
          value={title}
          onChange={event => setTitle(event.target.value)}
          maxLength={160}
        />
        <button className="secondary" type="submit">Save name</button>
      </div>
      {status ? <span className="status">{status}</span> : null}
    </form>
  );
}
