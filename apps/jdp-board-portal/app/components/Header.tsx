import Link from 'next/link';
import { getSession } from '../lib/auth';
import { LogoutButton } from './LogoutButton';

export async function Header() {
  const session = await getSession();

  return (
    <header className="topbar">
      <div className="shell nav">
        <Link href="/dashboard" className="brand" style={{ textDecoration: 'none' }}>
          <span className="brand-mark" />
          <span>Folloze JDP Board Portal</span>
        </Link>
        <div className="nav-actions">
          {session ? (
            <>
              <span className="muted">{session.email}</span>
              <LogoutButton />
            </>
          ) : (
            <Link className="button primary" href="/login">Log in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
