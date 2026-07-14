import { del, get, list, put } from '@vercel/blob';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { BoardRecord, BoardSummary } from './types';

const LOCAL_DATA_DIR = path.join(process.cwd(), '.data');

function hasBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function safeEmail(email: string) {
  return email.replace(/[^a-z0-9._-]+/gi, '_').toLowerCase();
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeEmailList(emails: string[] = []) {
  return Array.from(new Set(emails.map(normalizeEmail).filter(Boolean)));
}

function userIndexPath(email: string) {
  return `users/${safeEmail(normalizeEmail(email))}/boards.json`;
}

function boardPath(boardId: string) {
  return `boards/${boardId}.json`;
}

async function readJson<T>(pathname: string, fallback: T): Promise<T> {
  if (hasBlob()) {
    const result = await get(pathname, { access: 'private', useCache: false }).catch(() => null);
    if (!result || result.statusCode !== 200) return fallback;
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as T;
  }
  const filePath = path.join(LOCAL_DATA_DIR, pathname);
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(pathname: string, value: unknown) {
  const content = JSON.stringify(value, null, 2);
  if (hasBlob()) {
    await put(pathname, content, {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true
    });
    return;
  }
  const filePath = path.join(LOCAL_DATA_DIR, pathname);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

async function deleteJson(pathname: string) {
  if (hasBlob()) {
    await del(pathname).catch(() => undefined);
    return;
  }
  await unlink(path.join(LOCAL_DATA_DIR, pathname)).catch(() => undefined);
}

export async function listBoards(email: string): Promise<BoardSummary[]> {
  const normalizedEmail = normalizeEmail(email);
  if (hasBlob()) {
    const index = await readJson<BoardSummary[]>(userIndexPath(normalizedEmail), []);
    if (index.length) return filterAccessibleSummaries(normalizedEmail, index);
    const result = await list({ prefix: 'boards/' });
    const boards = await Promise.all(result.blobs.map(async blob => {
      const record = await readJson<BoardRecord>(blob.pathname, null as unknown as BoardRecord);
      return hasBoardAccess(record, normalizedEmail) ? toSummary(record, normalizedEmail) : null;
    }));
    return boards.filter(Boolean) as BoardSummary[];
  }
  const index = await readJson<BoardSummary[]>(userIndexPath(normalizedEmail), []);
  return filterAccessibleSummaries(normalizedEmail, index);
}

export async function getBoard(email: string, boardId: string): Promise<BoardRecord | null> {
  const record = await readJson<BoardRecord | null>(boardPath(boardId), null);
  if (!hasBoardAccess(record, email)) return null;
  return normalizeBoard(record);
}

export async function getOwnedBoard(email: string, boardId: string): Promise<BoardRecord | null> {
  const record = await readJson<BoardRecord | null>(boardPath(boardId), null);
  const normalized = normalizeBoard(record);
  if (!normalized || normalized.ownerEmail !== normalizeEmail(email)) return null;
  return normalized;
}

export async function saveBoard(record: BoardRecord) {
  record.ownerEmail = normalizeEmail(record.ownerEmail);
  record.sharedEmails = normalizeEmailList(record.sharedEmails).filter(email => email !== record.ownerEmail);
  record.updatedAt = new Date().toISOString();
  record.state.updatedAt = record.updatedAt;
  await writeJson(boardPath(record.id), record);
  await Promise.all(accessEmails(record).map(email => upsertUserBoardSummary(email, record)));
}

export async function updateBoardAccess(ownerEmail: string, boardId: string, sharedEmails: string[]) {
  const board = await getOwnedBoard(ownerEmail, boardId);
  if (!board) return null;
  const previousAccess = accessEmails(board);
  board.sharedEmails = normalizeEmailList(sharedEmails).filter(email => email !== board.ownerEmail);
  await saveBoard(board);
  const nextAccess = new Set(accessEmails(board));
  const removed = previousAccess.filter(email => !nextAccess.has(email));
  await Promise.all(removed.map(email => removeUserBoardSummary(email, board.id)));
  return board;
}

export async function deleteOwnedBoard(ownerEmail: string, boardId: string) {
  const board = await getOwnedBoard(ownerEmail, boardId);
  if (!board) return false;
  await Promise.all(accessEmails(board).map(email => removeUserBoardSummary(email, board.id)));
  await deleteJson(boardPath(board.id));
  return true;
}

function normalizeBoard(record: BoardRecord | null): BoardRecord | null {
  if (!record) return null;
  return {
    ...record,
    ownerEmail: normalizeEmail(record.ownerEmail),
    sharedEmails: normalizeEmailList(record.sharedEmails).filter(email => email !== normalizeEmail(record.ownerEmail))
  };
}

function hasBoardAccess(record: BoardRecord | null, email: string) {
  const normalized = normalizeBoard(record);
  if (!normalized) return false;
  const normalizedEmail = normalizeEmail(email);
  return normalized.ownerEmail === normalizedEmail || Boolean(normalized.sharedEmails?.includes(normalizedEmail));
}

function accessEmails(record: BoardRecord) {
  return [record.ownerEmail, ...normalizeEmailList(record.sharedEmails)];
}

async function filterAccessibleSummaries(email: string, summaries: BoardSummary[]) {
  const checked = await Promise.all(summaries.map(async summary => {
    const board = await readJson<BoardRecord | null>(boardPath(summary.id), null);
    return hasBoardAccess(board, email) ? toSummary(board as BoardRecord, email) : null;
  }));
  return checked.filter(Boolean) as BoardSummary[];
}

async function upsertUserBoardSummary(email: string, record: BoardRecord) {
  const boards = await readJson<BoardSummary[]>(userIndexPath(email), []);
  const next = [toSummary(record, email), ...boards.filter(board => board.id !== record.id)]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  await writeJson(userIndexPath(email), next);
}

async function removeUserBoardSummary(email: string, boardId: string) {
  const boards = await readJson<BoardSummary[]>(userIndexPath(email), []);
  await writeJson(userIndexPath(email), boards.filter(board => board.id !== boardId));
}

function toSummary(record: BoardRecord, viewerEmail: string): BoardSummary {
  return {
    id: record.id,
    title: record.title,
    customerName: record.customerName,
    updatedAt: record.updatedAt,
    accessRole: normalizeEmail(record.ownerEmail) === normalizeEmail(viewerEmail) ? 'owner' : 'shared'
  };
}
