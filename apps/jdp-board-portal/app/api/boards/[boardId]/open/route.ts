import { NextResponse } from 'next/server';
import { getSession, setPortalBoardSelection } from '../../../../lib/auth';
import { ensureDailyBoardSnapshot, getBoard, recordBoardAccess } from '../../../../lib/storage';

export async function POST(_request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { boardId } = await params;
  const board = await getBoard(session.email, boardId);
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await ensureDailyBoardSnapshot(session.email, boardId);
  await setPortalBoardSelection(session.email, boardId);
  await recordBoardAccess(session.email, boardId);
  return NextResponse.json({ ok: true, url: `/boards/${boardId}/skill` });
}
