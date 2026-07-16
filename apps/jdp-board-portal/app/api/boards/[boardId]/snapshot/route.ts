import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { getBoardSnapshotSummary, restoreBoardSnapshot } from '../../../../lib/storage';

export async function GET(_request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { boardId } = await params;
  const snapshot = await getBoardSnapshotSummary(session.email, boardId);
  if (!snapshot) return NextResponse.json({ snapshot: null });
  return NextResponse.json({ snapshot });
}

export async function POST(_request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { boardId } = await params;
  const restored = await restoreBoardSnapshot(session.email, boardId);
  if (!restored) return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
  return NextResponse.json({ ok: true, snapshot: restored.snapshot, board: restored.board });
}
