'use client';

import { FormEvent, useState } from 'react';

export function NewBoardForm() {
  const [customerWebsite, setCustomerWebsite] = useState('');
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
    setStatus('Looking up the company and creating board...');
    const response = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ customerWebsite, sharedEmails: parseEmails(sharedEmails) })
    });
    if (!response.ok) {
      setStatus('Could not create board.');
      return;
    }
    const data = await response.json();
    setStatus(`Created "${data.title}". Select it from Saved boards to open.`);
    window.location.href = `/dashboard?created=${encodeURIComponent(data.id)}`;
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="customerWebsite">Customer website</label>
        <input
          id="customerWebsite"
          value={customerWebsite}
          onChange={event => setCustomerWebsite(event.target.value)}
          placeholder="https://www.customer.com"
          required
        />
        <span className="help-text">Use the customer website. The board will pull in the company name, place its logo in the board header, and create a numbered board name.</span>
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
