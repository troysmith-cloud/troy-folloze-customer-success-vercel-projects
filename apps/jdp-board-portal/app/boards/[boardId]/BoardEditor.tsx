'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { BoardRecord, BoardState, Program } from '../../lib/types';
import { channels, createProgram, programTypes } from '../../lib/defaults';

const quarters = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
const years = ['2026', '2027', '2028', '2029'] as const;
const csmNames = ['Meghan Richardson', 'Matthew Brown', 'Steven Nguyen', 'Flor Estrada'];

type SaveStatus = 'Saved' | 'Saving...' | 'Offline saved locally' | 'Could not save';

export function BoardEditor({ board }: { board: BoardRecord }) {
  const storageKey = `folloze-jdp-vercel-board:${board.id}`;
  const [state, setState] = useState<BoardState>(board.state);
  const [activeProgramId, setActiveProgramId] = useState(board.state.programs[0]?.id || '');
  const [status, setStatus] = useState<SaveStatus>('Saved');
  const hydrated = useRef(false);

  useEffect(() => {
    const local = localStorage.getItem(storageKey);
    if (local) {
      const parsed = JSON.parse(local) as BoardState;
      if (Date.parse(parsed.updatedAt) > Date.parse(board.state.updatedAt)) {
        setState(parsed);
        setActiveProgramId(parsed.programs[0]?.id || '');
      }
    }
    hydrated.current = true;
  }, [board.state.updatedAt, storageKey]);

  useEffect(() => {
    if (!hydrated.current) return;
    const next = { ...state, updatedAt: new Date().toISOString() };
    localStorage.setItem(storageKey, JSON.stringify(next));
    setStatus('Saving...');
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/boards/${board.id}/state`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(next)
        });
        setStatus(response.ok ? 'Saved' : 'Could not save');
      } catch {
        setStatus('Offline saved locally');
      }
    }, 650);
    return () => clearTimeout(timeout);
  }, [board.id, state, storageKey]);

  const activeProgram = state.programs.find(program => program.id === activeProgramId) || state.programs[0];
  const totals = useMemo(() => state.programs.reduce((acc, program) => {
    const pipeline = projectedPipeline(program);
    acc.programs += 1;
    acc.accounts += Number(program.accounts) || 0;
    acc.pipeline += pipeline;
    acc.bookings += pipeline * 0.3;
    acc.actualPipeline += Number(program.actualPipeline) || 0;
    acc.actualBookings += Number(program.actualBookings) || 0;
    return acc;
  }, { programs: 0, accounts: 0, pipeline: 0, bookings: 0, actualPipeline: 0, actualBookings: 0 }), [state.programs]);

  function updateState(patch: Partial<BoardState>) {
    setState(current => ({ ...current, ...patch }));
  }

  function updateProgram(programId: string, patch: Partial<Program>) {
    setState(current => ({
      ...current,
      programs: current.programs.map(program => program.id === programId ? { ...program, ...patch } : program)
    }));
  }

  function addProgram() {
    const next = createProgram(state.programs.length + 1);
    setState(current => ({ ...current, programs: [...current.programs, next] }));
    setActiveProgramId(next.id);
  }

  function duplicateProgram() {
    if (!activeProgram) return;
    const next = { ...activeProgram, id: crypto.randomUUID(), name: `${activeProgram.name} copy` };
    setState(current => ({ ...current, programs: [...current.programs, next] }));
    setActiveProgramId(next.id);
  }

  function deleteProgram(programId: string) {
    setState(current => {
      const nextPrograms = current.programs.filter(program => program.id !== programId);
      return { ...current, programs: nextPrograms.length ? nextPrograms : [createProgram(1)] };
    });
    setActiveProgramId(state.programs.find(program => program.id !== programId)?.id || '');
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="muted">Customer board</div>
        <h1>{board.customerName} Joint Deployment Program</h1>
        <p>Plan the next 12 months, update actuals once programs go live, and keep every change tied to this customer login.</p>
        <div className="nav-actions">
          <span className="status">{status}</span>
          <button className="secondary" type="button" onClick={addProgram}>Add program</button>
          <button className="secondary" type="button" onClick={duplicateProgram}>Duplicate</button>
        </div>
      </section>

      <section className="metrics">
        <Metric label="Programs" value={String(totals.programs)} />
        <Metric label="Accounts" value={formatNumber(totals.accounts)} />
        <Metric label="Projected pipeline" value={formatMoney(totals.pipeline)} />
        <Metric label="Actual pipeline" value={formatMoney(totals.actualPipeline)} />
      </section>

      <section className="planner-layout">
        <aside className="card sidebar">
          <div className="field">
            <label htmlFor="selectedCsm">Customer Success Manager</label>
            <select id="selectedCsm" value={state.selectedCsm} onChange={event => updateState({ selectedCsm: event.target.value })}>
              {csmNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="activeYear">Program year</label>
            <select id="activeYear" value={state.activeYear} onChange={event => updateState({ activeYear: event.target.value as BoardState['activeYear'] })}>
              {years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="startQuarter">Company year starts</label>
            <select id="startQuarter" value={state.startQuarter} onChange={event => updateState({ startQuarter: event.target.value as BoardState['startQuarter'] })}>
              {quarters.map(quarter => <option key={quarter} value={quarter}>{quarter}</option>)}
            </select>
          </div>
          {state.programs.map((program, index) => (
            <button
              className={`program-chip ${program.id === activeProgram?.id ? 'active' : ''}`}
              key={program.id}
              type="button"
              onClick={() => setActiveProgramId(program.id)}
            >
              <strong>{index + 1}. {program.name || program.type}</strong>
              <div className="muted">{program.programYear} {program.quarter} · {program.type}</div>
            </button>
          ))}
        </aside>

        {activeProgram ? (
          <section className="card">
            <div className="grid">
              <Field label="Program name" value={activeProgram.name} onChange={name => updateProgram(activeProgram.id, { name })} />
              <Select label="Program type" value={activeProgram.type} options={programTypes} onChange={type => updateProgram(activeProgram.id, { type })} />
              <Select label="Quarter" value={activeProgram.quarter} options={quarters} onChange={quarter => updateProgram(activeProgram.id, { quarter: quarter as Program['quarter'] })} />
              <Select label="Program year" value={activeProgram.programYear} options={years} onChange={programYear => updateProgram(activeProgram.id, { programYear: programYear as Program['programYear'] })} />
              <Field label="Segment / Audience" value={activeProgram.segment} onChange={segment => updateProgram(activeProgram.id, { segment })} />
              <Select label="Primary channel" value={activeProgram.channels[0] || channels[0]} options={channels} onChange={channel => updateProgram(activeProgram.id, { channels: [channel] })} />
              <Field label="Content / Messaging" value={activeProgram.content} onChange={content => updateProgram(activeProgram.id, { content })} />
              <NumberField label="Accounts targeted" value={activeProgram.accounts} onChange={accounts => updateProgram(activeProgram.id, { accounts })} />
              <NumberField label="Average deal size" value={activeProgram.dealSize} onChange={dealSize => updateProgram(activeProgram.id, { dealSize })} />
              <NumberField label="Projected boards" value={activeProgram.projectedBoards} onChange={projectedBoards => updateProgram(activeProgram.id, { projectedBoards })} />
              <NumberField label="Actual pipeline" value={activeProgram.actualPipeline} onChange={actualPipeline => updateProgram(activeProgram.id, { actualPipeline })} />
              <NumberField label="Actual bookings" value={activeProgram.actualBookings} onChange={actualBookings => updateProgram(activeProgram.id, { actualBookings })} />
            </div>
            <div className="field">
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" value={activeProgram.notes} onChange={event => updateProgram(activeProgram.id, { notes: event.target.value })} />
            </div>
            <div className="metrics">
              <Metric label="Projected pipeline" value={formatMoney(projectedPipeline(activeProgram))} />
              <Metric label="Projected bookings" value={formatMoney(projectedPipeline(activeProgram) * 0.3)} />
              <Metric label="Actual pipeline" value={formatMoney(activeProgram.actualPipeline)} />
              <Metric label="Actual bookings" value={formatMoney(activeProgram.actualBookings)} />
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="secondary" type="button" onClick={() => deleteProgram(activeProgram.id)}>Delete program</button>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input value={value} onChange={event => onChange(event.target.value)} />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type="number" min="0" value={value} onChange={event => onChange(Number(event.target.value) || 0)} />
    </div>
  );
}

function Select<T extends string>({ label, value, options, onChange }: { label: string; value: string; options: readonly T[] | string[]; onChange: (value: string) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={event => onChange(event.target.value)}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function projectedPipeline(program: Program) {
  const accounts = Number(program.accounts) || 0;
  const dealSize = Number(program.dealSize) || 0;
  return accounts * 0.3 * 0.1 * 0.5 * dealSize;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, notation: Math.abs(value) > 999999999 ? 'compact' : 'standard' }).format(value || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value || 0);
}
