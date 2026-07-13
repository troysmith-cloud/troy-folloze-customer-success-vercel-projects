'use client';

import { FormEvent, useState } from 'react';

export function NewBoardForm() {
  const [customerName, setCustomerName] = useState('');
  const [sharedEmails, setSharedEmails] = useState('');
  const [status, setStatus] = useState('');

  function parseEmails(value: string) {
    return value
      .split(/[\s,;]+/)
      .map(email => email.trim().toLowerCase())
      .filter(Boolean);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('Creating board...');
    const response = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ customerName, sharedEmails: parseEmails(sharedEmails) })
    });
    if (!response.ok) {
      setStatus('Could not create board.');
      return;
    }
    const data = await response.json();
    window.location.href = `/boards/${data.id}`;
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="customerName">Customer name</label>
        <input
          id="customerName"
          value={customerName}
          onChange={event => setCustomerName(event.target.value)}
          placeholder="Customer"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="sharedEmails">Authorized customer emails</label>
        <textarea
          id="sharedEmails"
          value={sharedEmails}
          onChange={event => setSharedEmails(event.target.value)}
          placeholder="customer@example.com, teammate@example.com"
        />
        <span className="help-text">Only these emails and your owner login can open this board.</span>
      </div>
      <button className="primary" type="submit">Create board</button>
      <p className="status">{status}</p>
    </form>
  );
}
