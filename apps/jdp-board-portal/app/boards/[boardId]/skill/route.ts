import { notFound, redirect } from 'next/navigation';
import { getSession, hasRecentPortalBoardSelection } from '../../../lib/auth';
import { renderSkillBoardHtml } from '../../../lib/skillBoardHtml';
import { getBoard } from '../../../lib/storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const { boardId } = await params;
  const board = await getBoard(session.email, boardId);
  if (!board) notFound();
  if (!await hasRecentPortalBoardSelection(session.email, boardId)) redirect('/dashboard');

  return new Response(await renderSkillBoardHtml(board, session.email), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store, no-cache, must-revalidate, proxy-revalidate',
      pragma: 'no-cache',
      expires: '0'
    }
  });
}
