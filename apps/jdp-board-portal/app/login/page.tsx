import { redirect } from 'next/navigation';
import { getSession } from '../lib/auth';
import { LoginForm } from './LoginForm';

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect('/dashboard');

  return (
    <main className="shell hero">
      <div className="card" style={{ maxWidth: 560 }}>
        <div className="brand" style={{ marginBottom: 24 }}>
          <span className="brand-mark" />
          <span>Folloze JDP Board Portal</span>
        </div>
        <h1>Log in with your email.</h1>
        <p className="muted">
          Your email links you to the boards and saved program data assigned to your customer account.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
