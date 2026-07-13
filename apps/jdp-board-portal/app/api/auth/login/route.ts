import { NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeEmail, setSession } from '../../../lib/auth';

const schema = z.object({
  email: z.string().email()
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }
  await setSession(normalizeEmail(parsed.data.email));
  return NextResponse.json({ ok: true });
}
