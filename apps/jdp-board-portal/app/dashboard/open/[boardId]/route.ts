import { notFound, redirect } from 'next/navigation';
import { getSession, setPortalBoardSelection } from '../../../lib/auth';
import { getBoard, recordBoardAccess } from '../../../lib/storage';

export async function GET(_request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const { boardId } = await params;
  const board = await getBoard(session.email, boardId);
  if (!board) notFound();
  await setPortalBoardSelection(session.email, boardId);
  await recordBoardAccess(session.email, boardId);
  redirect(`/boards/${boardId}/skill`);
}
