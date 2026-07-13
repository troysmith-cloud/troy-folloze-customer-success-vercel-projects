import { notFound, redirect } from 'next/navigation';
import { Header } from '../../components/Header';
import { getSession } from '../../lib/auth';
import { getBoard } from '../../lib/storage';
import { BoardEditor } from './BoardEditor';

export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const { boardId } = await params;
  const board = await getBoard(session.email, boardId);
  if (!board) notFound();

  return (
    <>
      <Header />
      <BoardEditor board={board} />
    </>
  );
}
