import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '../../../../lib/auth';
import { getBoard, saveBoard } from '../../../../lib/storage';

const programSchema = z.object({
  id: z.string(),
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']),
  programYear: z.enum(['2026', '2027', '2028', '2029']),
  type: z.string(),
  name: z.string(),
  segment: z.string(),
  channels: z.array(z.string()),
  content: z.string(),
  notes: z.string(),
  accounts: z.number(),
  dealSize: z.number(),
  projectedBoards: z.number(),
  actualPipeline: z.number(),
  actualBookings: z.number()
});

const stateSchema = z.object({
  selectedCsm: z.string(),
  activeYear: z.enum(['2026', '2027', '2028', '2029']),
  startQuarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']),
  programs: z.array(programSchema).min(1),
  updatedAt: z.string()
});

export async function GET(_request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await requireSession();
  const { boardId } = await params;
  const board = await getBoard(session.email, boardId);
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ state: board.state, board });
}

export async function PUT(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await requireSession();
  const { boardId } = await params;
  const board = await getBoard(session.email, boardId);
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const parsed = stateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid board state' }, { status: 400 });
  }

  board.state = parsed.data;
  await saveBoard(board);
  return NextResponse.json({ ok: true, updatedAt: board.updatedAt });
}
