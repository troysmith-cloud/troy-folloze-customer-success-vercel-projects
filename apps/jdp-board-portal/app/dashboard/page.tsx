import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Header } from '../components/Header';
import { getSession } from '../lib/auth';
import { listBoards } from '../lib/storage';
import { AccessManager } from './AccessManager';
import { NewBoardForm } from './NewBoardForm';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const boards = await listBoards(session.email);

  return (
    <>
      <Header />
      <main className="shell">
        <section className="hero">
          <h1>Your customer boards.</h1>
          <p>
            Create a Folloze Joint Deployment Program board, share the hosted Vercel URL with the customer,
            and keep their planning data tied to their email login.
          </p>
        </section>

        <div className="grid">
          <section className="card">
            <h2>Create a board</h2>
            <NewBoardForm />
          </section>
          <section className="card" style={{ gridColumn: 'span 2' }}>
            <h2>Saved boards</h2>
            <div className="board-list">
              {boards.length ? boards.map(board => (
                <div className="board-row" key={board.id}>
                  <div>
                    <strong>{board.title}</strong>
                    <div className="muted">
                      {board.customerName} · {board.accessRole === 'owner' ? 'Owner' : 'Shared access'} · Updated {new Date(board.updatedAt).toLocaleString()}
                    </div>
                    {board.accessRole === 'owner' ? <AccessManager boardId={board.id} /> : null}
                  </div>
                  <Link className="button primary" href={`/boards/${board.id}`}>Open</Link>
                </div>
              )) : (
                <p className="muted">No boards yet. Create the first one for a customer.</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
