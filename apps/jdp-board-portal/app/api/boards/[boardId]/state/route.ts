import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '../../../../lib/auth';
import { getBoard, saveBoard } from '../../../../lib/storage';

const stateSchema = z.object({
  programs: z.array(z.record(z.unknown()))
}).passthrough();

export async function GET(_request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { boardId } = await params;
  const board = await getBoard(session.email, boardId);
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ state: board.state, board });
}

export async function PUT(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  return saveBoardState(request, { params });
}

export async function POST(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  return saveBoardState(request, { params });
}

async function saveBoardState(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { boardId } = await params;
  const board = await getBoard(session.email, boardId);
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const parsed = stateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid board state' }, { status: 400 });
  }

  board.state = {
    ...parsed.data,
    customerName: board.customerName,
    updatedAt: new Date().toISOString()
  };
  await saveBoard(board);
  return NextResponse.json({ ok: true, updatedAt: board.updatedAt });
}
