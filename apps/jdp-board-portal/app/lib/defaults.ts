import type { BoardRecord, BoardState, Program } from './types';

export const programTypes = [
  '1:1 ABM',
  '1:few ABM',
  '1:many ABM',
  'Executive program',
  'Event follow-up',
  'Digital deal room',
  'Renewal / QBR',
  'Customer expansion',
  'Web Engager Program',
  'Resource Center',
  'Enablement Program',
  'Newsletter',
  'Test',
  'New Product Launch',
  'Content Hub',
  'Article Hub',
  'Other'
];

export const channels = [
  'Integrated mix',
  'Email',
  'Web / Website',
  'SEO',
  'Resource center',
  'Digital advertising',
  'LinkedIn',
  'Webinar',
  'Field event',
  'Executive event',
  'Content syndication',
  'Partner / co-marketing',
  'Sales outreach',
  'Newsletter'
];

export function createProgram(index = 1): Program {
  return {
    id: crypto.randomUUID(),
    quarter: 'Q1',
    programYear: '2026',
    type: '1:few ABM',
    name: `Program ${index}`,
    segment: '',
    channels: ['Integrated mix'],
    content: '',
    notes: '',
    accounts: 0,
    dealSize: 0,
    projectedBoards: 0,
    actualPipeline: 0,
    actualBookings: 0
  };
}

export function createDefaultState(): BoardState {
  return {
    selectedCsm: 'Meghan Richardson',
    activeYear: '2026',
    startQuarter: 'Q1',
    programs: [createProgram(1)],
    updatedAt: new Date().toISOString()
  };
}

export function createBoard(ownerEmail: string, customerName: string): BoardRecord {
  const now = new Date().toISOString();
  const cleanCustomer = customerName.trim() || 'Customer';
  return {
    id: crypto.randomUUID(),
    ownerEmail,
    title: `${cleanCustomer} Joint Deployment Program`,
    customerName: cleanCustomer,
    createdAt: now,
    updatedAt: now,
    state: createDefaultState()
  };
}
