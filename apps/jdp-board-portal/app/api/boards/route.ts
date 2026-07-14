import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '../../lib/auth';
import { resolveCompanyBrand, resolveCompanyBrandFromWebsite } from '../../lib/companyBrand';
import { BOARD_PLANNER_TITLE } from '../../lib/constants';
import { createBoard } from '../../lib/defaults';
import { listBoards, saveBoard } from '../../lib/storage';

const createSchema = z.object({
  customerWebsite: z.string().min(1).max(240).optional(),
  customerName: z.string().min(1).max(120).optional(),
  sharedEmails: z.array(z.string().email()).max(50).optional()
}).refine(data => Boolean(data.customerWebsite || data.customerName), {
  message: 'Customer website is required'
});

function cleanCustomerName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function sameCustomer(a: string, b: string) {
  return cleanCustomerName(a).toLowerCase() === cleanCustomerName(b).toLowerCase();
}

function numberedBoardTitle(customerName: string, existingCount: number) {
  return `${cleanCustomerName(customerName)} ${BOARD_PLANNER_TITLE} Board ${existingCount + 1}`;
}

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
    return NextResponse.json({ error: 'Invalid customer website' }, { status: 400 });
  }
  const brand = parsed.data.customerWebsite
    ? await resolveCompanyBrandFromWebsite(parsed.data.customerWebsite)
    : await resolveCompanyBrand(parsed.data.customerName || '');
  const customerName = cleanCustomerName(brand?.name || parsed.data.customerName || 'Customer');
  const existingBoards = await listBoards(session.email);
  const existingCustomerCount = existingBoards.filter(board => sameCustomer(board.customerName, customerName)).length;
  const title = numberedBoardTitle(customerName, existingCustomerCount);
  const board = createBoard(session.email, customerName, parsed.data.sharedEmails || [], brand, title);
  await saveBoard(board);
  return NextResponse.json({ id: board.id, board, brandMatched: Boolean(brand), title });
}
