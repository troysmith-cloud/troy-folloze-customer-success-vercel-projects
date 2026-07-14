import { del, get, list, put } from '@vercel/blob';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { BOARD_PLANNER_TITLE } from './constants';
import type { BoardAccessLogEntry, BoardRecord, BoardSummary } from './types';

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

export function normalizeFollozeEditUrl(url?: string) {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' || !isFollozeHost(parsed.hostname)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function isFollozeHost(hostname: string) {
  return hostname === 'folloze.com' || hostname.endsWith('.folloze.com');
}

function userIndexPath(email: string) {
  return `users/${safeEmail(normalizeEmail(email))}/boards.json`;
}

function userHiddenPath(email: string) {
  return `users/${safeEmail(normalizeEmail(email))}/hidden.json`;
}

function boardPath(boardId: string) {
  return `boards/${boardId}.json`;
}

function boardAccessLogPath(boardId: string) {
  return `boards/${boardId}.access.json`;
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
  const hiddenBoards = new Set(await readJson<string[]>(userHiddenPath(normalizedEmail), []));
  if (hasBlob()) {
    const index = await readJson<BoardSummary[]>(userIndexPath(normalizedEmail), []);
    const indexed = await filterAccessibleSummaries(normalizedEmail, index, hiddenBoards);
    const discovered = await discoverAccessibleBoardSummaries(normalizedEmail, hiddenBoards);
    const merged = mergeBoardSummaries(indexed, discovered);
    if (merged.length !== indexed.length || merged.some((board, index) => board.id !== indexed[index]?.id)) {
      await writeJson(userIndexPath(normalizedEmail), merged);
    }
    return merged;
  }
  const index = await readJson<BoardSummary[]>(userIndexPath(normalizedEmail), []);
  return filterAccessibleSummaries(normalizedEmail, index, hiddenBoards);
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

export async function recordBoardAccess(email: string, boardId: string) {
  const record = await readJson<BoardRecord | null>(boardPath(boardId), null);
  const board = normalizeBoard(record);
  if (!board || !hasBoardAccess(board, email)) return null;
  const normalizedEmail = normalizeEmail(email);
  const now = new Date().toISOString();
  const accessLog = await readJson<BoardAccessLogEntry[]>(boardAccessLogPath(board.id), board.accessLog || []);
  const previous = accessLog.find(entry => entry.email === normalizedEmail);
  const nextEntry: BoardAccessLogEntry = {
    email: normalizedEmail,
    firstAccessedAt: previous?.firstAccessedAt || now,
    lastAccessedAt: now,
    accessCount: (previous?.accessCount || 0) + 1,
    accessRole: board.ownerEmail === normalizedEmail ? 'owner' : 'shared'
  };
  const nextLog = normalizeAccessLog([
    nextEntry,
    ...accessLog.filter(entry => entry.email !== normalizedEmail)
  ]).sort((a, b) => Date.parse(b.lastAccessedAt) - Date.parse(a.lastAccessedAt));
  await writeJson(boardAccessLogPath(board.id), nextLog);
  return board;
}

export async function getBoardAccessReport(ownerEmail: string, boardId: string) {
  const board = await getOwnedBoard(ownerEmail, boardId);
  if (!board) return null;
  const accessLog = await readJson<BoardAccessLogEntry[]>(boardAccessLogPath(board.id), board.accessLog || []);
  const logByEmail = new Map(normalizeAccessLog(accessLog).map(entry => [entry.email, entry]));
  return accessEmails(board).map(email => {
    const log = logByEmail.get(email);
    return {
      email,
      accessRole: board.ownerEmail === email ? 'owner' as const : 'shared' as const,
      firstAccessedAt: log?.firstAccessedAt || null,
      lastAccessedAt: log?.lastAccessedAt || null,
      accessCount: log?.accessCount || 0
    };
  }).sort((a, b) => {
    if (!a.lastAccessedAt && !b.lastAccessedAt) return a.email.localeCompare(b.email);
    if (!a.lastAccessedAt) return 1;
    if (!b.lastAccessedAt) return -1;
    return Date.parse(b.lastAccessedAt) - Date.parse(a.lastAccessedAt);
  });
}

export async function saveBoard(record: BoardRecord) {
  record.ownerEmail = normalizeEmail(record.ownerEmail);
  record.sharedEmails = normalizeEmailList(record.sharedEmails).filter(email => email !== record.ownerEmail);
  record.updatedAt = new Date().toISOString();
  record.state.updatedAt = record.updatedAt;
  await writeJson(boardPath(record.id), record);
  await Promise.all(accessEmails(record).map(email => upsertUserBoardSummary(email, record)));
}

export async function updateBoardAccess(ownerEmail: string, boardId: string, sharedEmails: string[], nextOwnerEmail?: string, follozeEditUrl?: string) {
  const board = await getOwnedBoard(ownerEmail, boardId);
  if (!board) return null;
  const normalizedFollozeEditUrl = follozeEditUrl === undefined ? undefined : normalizeFollozeEditUrl(follozeEditUrl);
  if (normalizedFollozeEditUrl === null) return null;
  const previousAccess = accessEmails(board);
  const currentOwner = board.ownerEmail;
  const nextOwner = nextOwnerEmail ? normalizeEmail(nextOwnerEmail) : currentOwner;
  board.ownerEmail = nextOwner;
  board.sharedEmails = normalizeEmailList([
    ...sharedEmails,
    currentOwner === nextOwner ? '' : currentOwner
  ]).filter(email => email && email !== board.ownerEmail);
  if (normalizedFollozeEditUrl !== undefined) {
    board.follozeEditUrl = normalizedFollozeEditUrl || undefined;
  }
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
  await Promise.all([deleteJson(boardPath(board.id)), deleteJson(boardAccessLogPath(board.id))]);
  return true;
}

export async function deleteAccessibleBoard(email: string, boardId: string) {
  const board = await getBoard(email, boardId);
  if (!board) return false;
  if (board.ownerEmail !== normalizeEmail(email)) {
    await hideBoardForUser(email, board.id);
    return true;
  }
  await Promise.all(accessEmails(board).map(accessEmail => Promise.all([
    removeUserBoardSummary(accessEmail, board.id),
    removeHiddenBoard(accessEmail, board.id)
  ])));
  await Promise.all([deleteJson(boardPath(board.id)), deleteJson(boardAccessLogPath(board.id))]);
  return true;
}

export async function renameOwnedBoard(ownerEmail: string, boardId: string, title: string) {
  const board = await getOwnedBoard(ownerEmail, boardId);
  if (!board) return null;
  const cleanTitle = title.trim();
  if (!cleanTitle) return null;
  board.title = cleanTitle.slice(0, 160);
  await saveBoard(board);
  return board;
}

function normalizeBoard(record: BoardRecord | null): BoardRecord | null {
  if (!record) return null;
  return {
    ...record,
    ownerEmail: normalizeEmail(record.ownerEmail),
    sharedEmails: normalizeEmailList(record.sharedEmails).filter(email => email !== normalizeEmail(record.ownerEmail)),
    follozeEditUrl: normalizeFollozeEditUrl(record.follozeEditUrl) || undefined,
    accessLog: normalizeAccessLog(record.accessLog),
    title: normalizeBoardTitle(record.title, record.customerName)
  };
}

function normalizeBoardTitle(title: string, customerName: string) {
  const cleanTitle = (title || '').trim();
  const cleanCustomer = (customerName || '').trim();
  if (
    cleanTitle === 'Folloze Joint Deployment Program Template Board' ||
    cleanTitle === `${cleanCustomer} Joint Deployment Program`
  ) {
    return BOARD_PLANNER_TITLE;
  }
  return cleanTitle || BOARD_PLANNER_TITLE;
}

function normalizeAccessLog(entries: BoardAccessLogEntry[] = []) {
  return entries
    .map(entry => ({
      email: normalizeEmail(entry.email || ''),
      firstAccessedAt: entry.firstAccessedAt,
      lastAccessedAt: entry.lastAccessedAt,
      accessCount: Math.max(0, Number(entry.accessCount) || 0),
      accessRole: entry.accessRole === 'owner' ? 'owner' as const : 'shared' as const
    }))
    .filter(entry => entry.email && entry.firstAccessedAt && entry.lastAccessedAt);
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

async function hideBoardForUser(email: string, boardId: string) {
  const normalizedEmail = normalizeEmail(email);
  const hidden = new Set(await readJson<string[]>(userHiddenPath(normalizedEmail), []));
  hidden.add(boardId);
  await Promise.all([
    writeJson(userHiddenPath(normalizedEmail), Array.from(hidden)),
    removeUserBoardSummary(normalizedEmail, boardId)
  ]);
}

async function removeHiddenBoard(email: string, boardId: string) {
  const normalizedEmail = normalizeEmail(email);
  const hidden = await readJson<string[]>(userHiddenPath(normalizedEmail), []);
  await writeJson(userHiddenPath(normalizedEmail), hidden.filter(id => id !== boardId));
}

async function filterAccessibleSummaries(email: string, summaries: BoardSummary[], hiddenBoards: Set<string>) {
  const checked = await Promise.all(summaries.map(async summary => {
    if (hiddenBoards.has(summary.id)) return null;
    const board = await readJson<BoardRecord | null>(boardPath(summary.id), null);
    return hasBoardAccess(board, email) ? toSummary(board as BoardRecord, email) : null;
  }));
  return checked.filter(Boolean) as BoardSummary[];
}

async function discoverAccessibleBoardSummaries(email: string, hiddenBoards: Set<string>) {
  const result = await list({ prefix: 'boards/' });
  const checked = await Promise.all(result.blobs.map(async blob => {
    if (!blob.pathname.endsWith('.json') || blob.pathname.endsWith('.access.json')) return null;
    const record = await readJson<BoardRecord | null>(blob.pathname, null);
    return record && !hiddenBoards.has(record.id) && hasBoardAccess(record, email) ? toSummary(record, email) : null;
  }));
  return checked.filter(Boolean) as BoardSummary[];
}

function mergeBoardSummaries(...groups: BoardSummary[][]) {
  const byId = new Map<string, BoardSummary>();
  for (const group of groups) {
    for (const board of group) {
      const current = byId.get(board.id);
      if (!current || Date.parse(board.updatedAt) >= Date.parse(current.updatedAt)) {
        byId.set(board.id, board);
      }
    }
  }
  return Array.from(byId.values()).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
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
    accessRole: normalizeEmail(record.ownerEmail) === normalizeEmail(viewerEmail) ? 'owner' : 'shared',
    follozeEditUrl: record.follozeEditUrl
  };
}
