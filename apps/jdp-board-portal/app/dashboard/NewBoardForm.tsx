'use client';

import { FormEvent, useState } from 'react';

export function NewBoardForm() {
  const [customerName, setCustomerName] = useState('');
  const [status, setStatus] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('Creating board...');
    const response = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ customerName })
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
      <button className="primary" type="submit">Create board</button>
      <p className="status">{status}</p>
    </form>
  );
}
