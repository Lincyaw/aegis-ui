export interface DemoDataset {
  id: string;
  name: string;
  description: string;
  rows: number;
  sizeMb: number;
  format: 'parquet' | 'csv' | 'jsonl';
  tags: string[];
  updatedAt: string;
}

export const seedDatasets: DemoDataset[] = [
  {
    id: 'ds-train-ticket-2026q1',
    name: 'train-ticket-2026Q1',
    description: 'Span traces collected from ts benchmark, Q1 2026.',
    rows: 18_204_516,
    sizeMb: 612,
    format: 'parquet',
    tags: ['traces', 'train-ticket', 'rcabench'],
    updatedAt: '2026-04-30T09:21:00Z',
  },
  {
    id: 'ds-hotel-reservation-200',
    name: 'hotel-reservation-n200',
    description: 'DSB Go-stack injection results, n=200.',
    rows: 3_408_120,
    sizeMb: 184,
    format: 'parquet',
    tags: ['traces', 'dsb', 'hotel-reservation'],
    updatedAt: '2026-04-21T15:02:00Z',
  },
  {
    id: 'ds-llm-eval-failure-tax',
    name: 'llm-eval-failure-tax',
    description: 'Per-failure-pattern decomposition table from rcabench.',
    rows: 12_408,
    sizeMb: 4,
    format: 'csv',
    tags: ['eval', 'analysis'],
    updatedAt: '2026-05-10T11:08:00Z',
  },
  {
    id: 'ds-social-network-mix',
    name: 'social-network-mix',
    description: 'DSB C++ stack — mixed fault campaigns.',
    rows: 9_812_004,
    sizeMb: 408,
    format: 'jsonl',
    tags: ['traces', 'dsb', 'social-network'],
    updatedAt: '2026-04-25T08:11:00Z',
  },
];
