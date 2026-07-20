import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '../../../../lib/auth';
import { getAccessManageableBoard, normalizeEmail, normalizeFollozeEditUrl, updateBoardAccess } from '../../../../lib/storage';

const accessSchema = z.object({
  ownerEmail: z.string().email().optional(),
  sharedEmails: z.array(z.string().email()).max(50),
  follozeEditUrl: z.string().trim().max(500).optional()
});

export async function GET(_request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { boardId } = await params;
  const board = await getAccessManageableBoard(session.email, boardId);
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const canManageOwnerControls = board.ownerEmail === normalizeEmail(session.email);
  return NextResponse.json({
    ownerEmail: board.ownerEmail,
    sharedEmails: board.sharedEmails || [],
    follozeEditUrl: board.follozeEditUrl || '',
    canManageOwnerControls
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
  const currentBoard = await getAccessManageableBoard(session.email, boardId);
  if (!currentBoard) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const canManageOwnerControls = currentBoard.ownerEmail === normalizeEmail(session.email);
  const follozeEditUrl = canManageOwnerControls ? normalizeFollozeEditUrl(parsed.data.follozeEditUrl) : undefined;
  if (follozeEditUrl === null) {
    return NextResponse.json({ error: 'Use a valid HTTPS Folloze edit URL' }, { status: 400 });
  }
  const board = await updateBoardAccess(session.email, boardId, parsed.data.sharedEmails, parsed.data.ownerEmail, follozeEditUrl);
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    ok: true,
    ownerEmail: board.ownerEmail,
    sharedEmails: board.sharedEmails || [],
    follozeEditUrl: board.follozeEditUrl || '',
    canManageOwnerControls
  });
}
