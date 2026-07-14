import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '../../../lib/auth';
import { deleteAccessibleBoard, renameAccessibleBoard } from '../../../lib/storage';

const renameSchema = z.object({
  title: z.string().trim().min(1).max(160)
});

export async function DELETE(_request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await requireSession();
  const { boardId } = await params;
  const deleted = await deleteAccessibleBoard(session.email, boardId);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await requireSession();
  const { boardId } = await params;
  const parsed = renameSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid board title' }, { status: 400 });
  }
  const board = await renameAccessibleBoard(session.email, boardId, parsed.data.title);
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, board });
}
