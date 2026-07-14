import type { BoardRecord, BoardState, Program } from './types';
import { normalizeEmail, normalizeEmailList } from './storage';
import { BOARD_PLANNER_TITLE } from './constants';
import type { CompanyBrand } from './companyBrand';

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
  const program = createProgram(1);
  return {
    version: 1,
    customerName: 'Customer',
    selectedCsm: 'Meghan Richardson',
    activeId: program.id,
    planSettings: {
      activeYear: '2026',
      startQuarter: 'Q1'
    },
    programs: [{
      ...program,
      subSegment: '',
      secondaryContent: '',
      locked: false,
      mode: 'Standard',
      actual: {
        liveBoards: 0,
        engaged: 0,
        meetings: 0,
        pipelineOpps: 0,
        closedDeals: 0,
        pipelineGoal: 0,
        bookings: 0
      },
      custom: {
        inMarket: 1,
        engaged: 0.3,
        meeting: 0.1,
        pipeline: 0.5,
        close: 0.3
      }
    }],
    updatedAt: new Date().toISOString()
  };
}

export function createBoard(ownerEmail: string, customerName: string, sharedEmails: string[] = [], brand?: CompanyBrand | null, title?: string): BoardRecord {
  const now = new Date().toISOString();
  const cleanCustomer = customerName.trim() || 'Customer';
  const owner = normalizeEmail(ownerEmail);
  return {
    id: crypto.randomUUID(),
    ownerEmail: owner,
    sharedEmails: normalizeEmailList(sharedEmails).filter(email => email !== owner),
    title: title?.trim() || BOARD_PLANNER_TITLE,
    customerName: cleanCustomer,
    customerDomain: brand?.domain,
    customerLogoUrl: brand?.logoUrl,
    customerLogoAlt: brand?.name ? `${brand.name} logo` : `${cleanCustomer} logo`,
    customerLogoIncludesName: Boolean(brand?.logoIncludesName),
    createdAt: now,
    updatedAt: now,
    state: {
      ...createDefaultState(),
      customerName: cleanCustomer
    }
  };
}
