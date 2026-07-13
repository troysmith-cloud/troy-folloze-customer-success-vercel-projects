import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '../../../../lib/auth';
import { getOwnedBoard, updateBoardAccess } from '../../../../lib/storage';

const accessSchema = z.object({
  sharedEmails: z.array(z.string().email()).max(50)
});

export async function GET(_request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await requireSession();
  const { boardId } = await params;
  const board = await getOwnedBoard(session.email, boardId);
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    ownerEmail: board.ownerEmail,
    sharedEmails: board.sharedEmails || []
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await requireSession();
  const { boardId } = await params;
  const parsed = accessSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid access list' }, { status: 400 });
  }
  const board = await updateBoardAccess(session.email, boardId, parsed.data.sharedEmails);
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    ok: true,
    ownerEmail: board.ownerEmail,
    sharedEmails: board.sharedEmails || []
  });
}
