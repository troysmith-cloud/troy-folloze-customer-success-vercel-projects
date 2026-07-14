'use client';

import { FormEvent, useEffect, useState } from 'react';

function parseEmails(value: string) {
  return value
    .split(/[\s,;]+/)
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}

export function AccessManager({ boardId }: { boardId: string }) {
  const [ownerEmail, setOwnerEmail] = useState('');
  const [initialOwnerEmail, setInitialOwnerEmail] = useState('');
  const [emails, setEmails] = useState('');
  const [follozeEditUrl, setFollozeEditUrl] = useState('');
  const [status, setStatus] = useState('Loading access...');

  useEffect(() => {
    let active = true;
    fetch(`/api/boards/${boardId}/access`)
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Could not load access')))
      .then(data => {
        if (!active) return;
        setOwnerEmail(data.ownerEmail || '');
        setInitialOwnerEmail(data.ownerEmail || '');
        setEmails((data.sharedEmails || []).join('\n'));
        setFollozeEditUrl(data.follozeEditUrl || '');
        setStatus('Owner controls');
      })
      .catch(error => {
        if (!active) return;
        setStatus(error.message || 'Could not load access');
      });
    return () => { active = false; };
  }, [boardId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('Saving access...');
    const response = await fetch(`/api/boards/${boardId}/access`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ownerEmail, sharedEmails: parseEmails(emails), follozeEditUrl })
    });
    if (!response.ok) {
      setStatus('Could not save access. Check each email and Folloze URL.');
      return;
    }
    const data = await response.json();
    setOwnerEmail(data.ownerEmail || '');
    setInitialOwnerEmail(data.ownerEmail || '');
    setEmails((data.sharedEmails || []).join('\n'));
    setFollozeEditUrl(data.follozeEditUrl || '');
    setStatus('Access saved');
    if (data.ownerEmail && data.ownerEmail !== initialOwnerEmail) {
      window.location.reload();
    }
  }

  return (
    <form className="access-panel" onSubmit={submit}>
      <label htmlFor={`owner-${boardId}`}>Board owner</label>
      <input
        id={`owner-${boardId}`}
        value={ownerEmail}
        onChange={event => setOwnerEmail(event.target.value)}
        placeholder="owner@example.com"
        type="email"
      />
      <label htmlFor={`access-${boardId}`}>Authorized customer emails</label>
      <textarea
        id={`access-${boardId}`}
        value={emails}
        onChange={event => setEmails(event.target.value)}
        placeholder="customer@example.com"
      />
      <label htmlFor={`folloze-url-${boardId}`}>Folloze edit URL</label>
      <input
        id={`folloze-url-${boardId}`}
        value={follozeEditUrl}
        onChange={event => setFollozeEditUrl(event.target.value)}
        placeholder="https://app.folloze.com/..."
        type="url"
      />
      <div className="access-actions">
        <span className="status">{status}</span>
        <button className="secondary" type="submit">Save access</button>
      </div>
    </form>
  );
}
