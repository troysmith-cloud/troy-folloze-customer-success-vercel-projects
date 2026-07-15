import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Session } from './types';

const COOKIE_NAME = 'folloze_jdp_session';
const BOARD_SELECTION_COOKIE_NAME = 'folloze_jdp_selected_board';
const SESSION_DAYS = 30;
const BOARD_SELECTION_SECONDS = 5 * 60;

function secret() {
  return process.env.AUTH_SECRET || 'local-development-secret-change-before-production';
}

function sign(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

function encode(payload: Session) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

function decode(value: string): Session | null {
  const [body, signature] = value.split('.');
  if (!body || !signature) return null;
  const expected = sign(body);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  const session = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Session;
  if (!session.email || !session.issuedAt) return null;
  return session;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getSession() {
  const jar = await cookies();
  const value = jar.get(COOKIE_NAME)?.value;
  if (!value) return null;
  try {
    return decode(value);
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error('Not authenticated');
  return session;
}

export async function setSession(email: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, encode({ email: normalizeEmail(email), issuedAt: Date.now() }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  jar.delete(BOARD_SELECTION_COOKIE_NAME);
}

export async function setPortalBoardSelection(email: string, boardId: string) {
  const jar = await cookies();
  const body = Buffer.from(JSON.stringify({
    email: normalizeEmail(email),
    boardId,
    issuedAt: Date.now()
  })).toString('base64url');
  jar.set(BOARD_SELECTION_COOKIE_NAME, `${body}.${sign(body)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: BOARD_SELECTION_SECONDS
  });
}

export async function hasRecentPortalBoardSelection(email: string, boardId: string) {
  const jar = await cookies();
  const value = jar.get(BOARD_SELECTION_COOKIE_NAME)?.value;
  if (!value) return false;
  try {
    const [body, signature] = value.split('.');
    if (!body || !signature) return false;
    const expected = sign(body);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return false;
    const selection = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { email?: string; boardId?: string; issuedAt?: number };
    if (normalizeEmail(selection.email || '') !== normalizeEmail(email)) return false;
    if (selection.boardId !== boardId) return false;
    return Date.now() - Number(selection.issuedAt || 0) <= BOARD_SELECTION_SECONDS * 1000;
  } catch {
    return false;
  }
}
