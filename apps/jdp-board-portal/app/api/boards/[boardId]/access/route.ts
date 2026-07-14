import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '../../../../lib/auth';
import { getOwnedBoard, normalizeFollozeEditUrl, updateBoardAccess } from '../../../../lib/storage';

const accessSchema = z.object({
  ownerEmail: z.string().email().optional(),
  sharedEmails: z.array(z.string().email()).max(50),
  follozeEditUrl: z.string().trim().max(500).optional()
});

export async function GET(_request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { boardId } = await params;
  const board = await getOwnedBoard(session.email, boardId);
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    ownerEmail: board.ownerEmail,
    sharedEmails: board.sharedEmails || [],
    follozeEditUrl: board.follozeEditUrl || ''
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { boardId } = await params;
  const parsed = accessSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid access list' }, { status: 400 });
  }
  const follozeEditUrl = normalizeFollozeEditUrl(parsed.data.follozeEditUrl);
  if (follozeEditUrl === null) {
    return NextResponse.json({ error: 'Use a valid HTTPS Folloze edit URL' }, { status: 400 });
  }
  const board = await updateBoardAccess(session.email, boardId, parsed.data.sharedEmails, parsed.data.ownerEmail, follozeEditUrl);
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    ok: true,
    ownerEmail: board.ownerEmail,
    sharedEmails: board.sharedEmails || [],
    follozeEditUrl: board.follozeEditUrl || ''
  });
}
