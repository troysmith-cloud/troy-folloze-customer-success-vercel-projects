import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { getBoardAccessReport } from '../../../../lib/storage';

export async function GET(_request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { boardId } = await params;
  const report = await getBoardAccessReport(session.email, boardId);
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ report });
}
