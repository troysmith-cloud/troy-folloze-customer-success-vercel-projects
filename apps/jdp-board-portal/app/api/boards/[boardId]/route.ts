import { NextResponse } from 'next/server';
import { requireSession } from '../../../lib/auth';
import { deleteOwnedBoard } from '../../../lib/storage';

export async function DELETE(_request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await requireSession();
  const { boardId } = await params;
  const deleted = await deleteOwnedBoard(session.email, boardId);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
