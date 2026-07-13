import { notFound, redirect } from 'next/navigation';
import { getSession } from '../../lib/auth';
import { getBoard } from '../../lib/storage';

export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const { boardId } = await params;
  const board = await getBoard(session.email, boardId);
  if (!board) notFound();

  redirect(`/boards/${boardId}/skill`);
}
