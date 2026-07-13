import { get, list, put } from '@vercel/blob';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { BoardRecord, BoardSummary } from './types';

const LOCAL_DATA_DIR = path.join(process.cwd(), '.data');

function hasBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function safeEmail(email: string) {
  return email.replace(/[^a-z0-9._-]+/gi, '_').toLowerCase();
}

function userIndexPath(email: string) {
  return `users/${safeEmail(email)}/boards.json`;
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

export async function listBoards(email: string): Promise<BoardSummary[]> {
  if (hasBlob()) {
    const index = await readJson<BoardSummary[]>(userIndexPath(email), []);
    if (index.length) return index;
    const result = await list({ prefix: 'boards/' });
    const boards = await Promise.all(result.blobs.map(async blob => {
      const record = await readJson<BoardRecord>(blob.pathname, null as unknown as BoardRecord);
      return record?.ownerEmail === email ? toSummary(record) : null;
    }));
    return boards.filter(Boolean) as BoardSummary[];
  }
  return readJson<BoardSummary[]>(userIndexPath(email), []);
}

export async function getBoard(email: string, boardId: string): Promise<BoardRecord | null> {
  const record = await readJson<BoardRecord | null>(boardPath(boardId), null);
  if (!record || record.ownerEmail !== email) return null;
  return record;
}

export async function saveBoard(record: BoardRecord) {
  record.updatedAt = new Date().toISOString();
  record.state.updatedAt = record.updatedAt;
  await writeJson(boardPath(record.id), record);
  const boards = await listBoards(record.ownerEmail);
  const next = [toSummary(record), ...boards.filter(board => board.id !== record.id)]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  await writeJson(userIndexPath(record.ownerEmail), next);
}

function toSummary(record: BoardRecord): BoardSummary {
  return {
    id: record.id,
    title: record.title,
    customerName: record.customerName,
    updatedAt: record.updatedAt
  };
}
