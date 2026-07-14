import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '../../../../lib/auth';
import { getBoard, normalizeEmail, saveBoard } from '../../../../lib/storage';

const stateSchema = z.object({
  programs: z.array(z.record(z.unknown()))
}).passthrough();

export async function GET(_request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { boardId } = await params;
  const board = await getBoard(session.email, boardId);
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ state: board.state, board });
}

export async function PUT(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  return saveBoardState(request, { params });
}

export async function POST(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  return saveBoardState(request, { params });
}

async function saveBoardState(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { boardId } = await params;
  const board = await getBoard(session.email, boardId);
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const parsed = stateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid board state' }, { status: 400 });
  }

  board.state = {
    ...parsed.data,
    customerName: board.customerName,
    programs: sanitizeProgramsForSave(board.state.programs || [], parsed.data.programs, session.email, board.ownerEmail),
    updatedAt: new Date().toISOString()
  };
  await saveBoard(board);
  return NextResponse.json({ ok: true, updatedAt: board.updatedAt });
}

function sanitizeProgramsForSave(existingPrograms: Array<Record<string, unknown>>, incomingPrograms: Array<Record<string, unknown>>, viewerEmail: string, ownerEmail: string) {
  const viewer = normalizeEmail(viewerEmail);
  const owner = normalizeEmail(ownerEmail);
  const existingById = new Map(existingPrograms.map(program => [String(program.id || ''), program]));
  const incomingIds = new Set(incomingPrograms.map(program => String(program.id || '')).filter(Boolean));

  const nextPrograms = incomingPrograms.map(incomingProgram => {
    const id = String(incomingProgram.id || '');
    const existingProgram = existingById.get(id);
    if (!existingProgram) {
      return {
        ...incomingProgram,
        createdByEmail: viewer,
        allowAnyoneEdit: false
      };
    }

    const creator = normalizeEmail(String(existingProgram.createdByEmail || owner));
    const isOwner = viewer === owner;
    const isCreator = viewer === creator;
    const canEdit = !Boolean(existingProgram.locked) && (Boolean(existingProgram.allowAnyoneEdit) || isOwner || isCreator);
    const canManageLock = isOwner || isCreator;

    const nextProgram = canEdit ? { ...incomingProgram } : { ...existingProgram };
    nextProgram.createdByEmail = creator;
    nextProgram.allowAnyoneEdit = isOwner ? Boolean(incomingProgram.allowAnyoneEdit) : Boolean(existingProgram.allowAnyoneEdit);
    nextProgram.locked = canManageLock ? Boolean(incomingProgram.locked) : Boolean(existingProgram.locked);
    return nextProgram;
  });

  for (const existingProgram of existingPrograms) {
    const id = String(existingProgram.id || '');
    if (!id || incomingIds.has(id)) continue;
    const creator = normalizeEmail(String(existingProgram.createdByEmail || owner));
    const canDelete = !Boolean(existingProgram.locked) && (Boolean(existingProgram.allowAnyoneEdit) || viewer === owner || viewer === creator);
    if (!canDelete) nextPrograms.push(existingProgram);
  }

  return nextPrograms;
}
