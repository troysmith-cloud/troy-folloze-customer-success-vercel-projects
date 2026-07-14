import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '../../lib/auth';
import { resolveCompanyBrand } from '../../lib/companyBrand';
import { createBoard } from '../../lib/defaults';
import { listBoards, saveBoard } from '../../lib/storage';

const createSchema = z.object({
  customerName: z.string().min(1).max(120),
  sharedEmails: z.array(z.string().email()).max(50).optional()
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  return NextResponse.json({ boards: await listBoards(session.email) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid customer name' }, { status: 400 });
  }
  const brand = await resolveCompanyBrand(parsed.data.customerName);
  const board = createBoard(session.email, parsed.data.customerName, parsed.data.sharedEmails || [], brand);
  await saveBoard(board);
  return NextResponse.json({ id: board.id, board, brandMatched: Boolean(brand) });
}
