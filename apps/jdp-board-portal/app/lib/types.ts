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

export type BoardState = {
  selectedCsm: string;
  activeYear: '2026' | '2027' | '2028' | '2029';
  startQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  programs: Program[];
  updatedAt: string;
};

export type BoardRecord = {
  id: string;
  ownerEmail: string;
  title: string;
  customerName: string;
  createdAt: string;
  updatedAt: string;
  state: BoardState;
};

export type BoardSummary = Pick<BoardRecord, 'id' | 'title' | 'customerName' | 'updatedAt'>;
