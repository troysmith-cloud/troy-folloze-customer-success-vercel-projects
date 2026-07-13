'use client';

import { FormEvent, useState } from 'react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!response.ok) {
      setError('Enter a valid email address.');
      return;
    }
    window.location.href = '/dashboard';
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="you@company.com"
          required
        />
      </div>
      {error ? <p className="status">{error}</p> : null}
      <button className="primary" type="submit">Continue</button>
    </form>
  );
}
