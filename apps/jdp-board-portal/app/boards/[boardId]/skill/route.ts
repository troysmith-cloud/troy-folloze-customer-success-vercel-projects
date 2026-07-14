import { notFound, redirect } from 'next/navigation';
import { getSession } from '../../../lib/auth';
import { renderSkillBoardHtml } from '../../../lib/skillBoardHtml';
import { getBoard, recordBoardAccess } from '../../../lib/storage';

export async function GET(_request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const { boardId } = await params;
  const board = await getBoard(session.email, boardId);
  if (!board) notFound();
  await recordBoardAccess(session.email, boardId);

  return new Response(await renderSkillBoardHtml(board, session.email), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store'
    }
  });
}
