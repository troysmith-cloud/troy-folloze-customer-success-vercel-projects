import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '../../lib/auth';
import { createBoard } from '../../lib/defaults';
import { listBoards, saveBoard } from '../../lib/storage';

const createSchema = z.object({
  customerName: z.string().min(1).max(120)
});

export async function GET() {
  const session = await requireSession();
  return NextResponse.json({ boards: await listBoards(session.email) });
}

export async function POST(request: Request) {
  const session = await requireSession();
  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid customer name' }, { status: 400 });
  }
  const board = createBoard(session.email, parsed.data.customerName);
  await saveBoard(board);
  return NextResponse.json({ id: board.id, board });
}
