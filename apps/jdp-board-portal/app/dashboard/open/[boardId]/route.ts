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
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/boards/${encodeURIComponent(boardId)}/skill"><title>Opening board</title></head><body><p>Opening board...</p><script>window.location.replace('/boards/${encodeURIComponent(boardId)}/skill');</script></body></html>`, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store'
    }
  });
}
