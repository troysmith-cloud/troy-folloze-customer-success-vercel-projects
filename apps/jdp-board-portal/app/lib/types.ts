export type Session = {
  email: string;
  issuedAt: number;
};

export type Program = {
  id: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  programYear: '2026' | '2027' | '2028' | '2029';
  type: string;
  name: string;
  segment: string;
  channels: string[];
  content: string;
  notes: string;
  accounts: number;
  dealSize: number;
  projectedBoards: number;
  actualPipeline: number;
  actualBookings: number;
};

export type SkillBoardState = Record<string, unknown> & {
  selectedCsm?: string;
  activeId?: string;
  planSettings?: {
    activeYear?: string;
    startQuarter?: string;
    [key: string]: unknown;
  };
  programs?: Array<Record<string, unknown>>;
  updatedAt?: string;
};

export type BoardState = SkillBoardState;

export type BoardAccessLogEntry = {
  email: string;
  firstAccessedAt: string;
  lastAccessedAt: string;
  accessCount: number;
  accessRole: 'owner' | 'shared';
};

export type BoardRecord = {
  id: string;
  ownerEmail: string;
  sharedEmails?: string[];
  follozeEditUrl?: string;
  customerDomain?: string;
  customerLogoUrl?: string;
  customerLogoAlt?: string;
  customerLogoIncludesName?: boolean;
  accessLog?: BoardAccessLogEntry[];
  title: string;
  customerName: string;
  createdAt: string;
  updatedAt: string;
  state: BoardState;
};

export type BoardSummary = Pick<BoardRecord, 'id' | 'title' | 'customerName' | 'updatedAt'> & {
  accessRole: 'owner' | 'shared';
  follozeEditUrl?: string;
};
