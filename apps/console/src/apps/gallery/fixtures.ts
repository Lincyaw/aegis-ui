import type { ReactNode } from 'react';

import type {
  AegisAction,
  CheckGridColumn,
  CheckGridRow,
  DataTableColumn,
  KeyValueItem,
  TerminalLine,
  ToolCallData,
} from '@lincyaw/aegis-ui';

export const DATA_COLOR_TOKENS: Array<{ name: string; desc: string }> = [
  { name: '--data-seq', desc: 'Magnitude (score and rank bars)' },
  { name: '--data-cat-1', desc: 'Series 1' },
  { name: '--data-cat-2', desc: 'Series 2' },
  { name: '--data-cat-3', desc: 'Series 3' },
  { name: '--data-cat-4', desc: 'Series 4' },
  { name: '--data-cat-5', desc: 'Series 5' },
  { name: '--data-cat-6', desc: 'Series 6' },
];

export const AMBIENT_WASH = [
  'radial-gradient(ellipse at 15% 20%, var(--ambient-1), transparent 60%)',
  'radial-gradient(ellipse at 85% 15%, var(--ambient-2), transparent 55%)',
  'radial-gradient(ellipse at 50% 100%, var(--ambient-3), transparent 60%)',
  'var(--bg-page)',
].join(', ');

export const KV_PARAMS: KeyValueItem[] = [
  { k: 'jitter', v: '40 ms' },
  { k: 'latency_cap', v: '200 ms' },
  { k: 'packet_loss', v: '0.02 %' },
  { k: 'threads', v: '128' },
];

export const TERMINAL_LINES: TerminalLine[] = [
  {
    ts: '14:22:01',
    prefix: 'AEGIS:',
    body: 'Initializing experiment "playing-the-world".',
  },
  {
    ts: '14:22:05',
    prefix: 'WORKER_ALPHA:',
    body: 'Connection established. Heartbeat 12 ms.',
  },
  {
    ts: '14:23:12',
    prefix: 'INJECTOR:',
    body: 'Executing "Clock Drift" on cluster EU-WEST-01.',
  },
  {
    ts: '14:23:13',
    prefix: 'OBSERVABILITY:',
    body: 'Detecting latency variance (+450 ms).',
  },
  {
    ts: '14:23:18',
    prefix: 'SYSTEM:',
    body: 'Warning. Data consistency thresholds breached in node 04.',
  },
];

/* ── Agent trajectory specimen data ───────────────────────────────── */

export const TOOL_QUERY_METRICS: ToolCallData = {
  name: 'query_metrics',
  arguments:
    '{\n  "service": "catalog",\n  "metric": "latency_p99",\n  "window": "5m"\n}',
  result:
    '{\n  "value": 482,\n  "unit": "ms",\n  "baseline": 120,\n  "severity": "critical"\n}',
};

/* ── Notification specimen data ────────────────────────────────────── */

export const GALLERY_NOW = Date.now();

/* ── Gallery demo actions (Pattern B) ──────────────────────────────── */

export const galleryNoop = (label: string) => (): void => {
  console.warn(`[gallery] action invoked: ${label}`);
};

export const GALLERY_ACTIONS = {
  themeCycle: {
    id: 'gallery.theme.cycle',
    label: 'Cycle theme',
    description: 'Demo action — does nothing real.',
    run: galleryNoop('theme.cycle'),
  },
  notifOpen: {
    id: 'gallery.notif.open',
    label: 'Open inbox',
    description: 'Demo action — does nothing real.',
    run: galleryNoop('notif.open'),
  },
  controlRun: {
    id: 'gallery.control.run',
    label: 'Run control item',
    description: 'Demo action — does nothing real.',
    run: galleryNoop('control.run'),
  },
  dropdownView: {
    id: 'gallery.dropdown.view-details',
    label: 'View details',
    description: 'Demo action — does nothing real.',
    run: galleryNoop('dropdown.view-details'),
  },
  tabOverview: {
    id: 'gallery.tabs.overview',
    label: 'Overview tab',
    description: 'Demo action — does nothing real.',
    run: galleryNoop('tabs.overview'),
  },
  projectSelect: {
    id: 'gallery.project.select-catalog',
    label: 'Select catalog-service',
    description: 'Demo action — does nothing real.',
    run: galleryNoop('project.select-catalog'),
  },
  envSelectProd: {
    id: 'gallery.env.select-prod',
    label: 'Switch to Production',
    description: 'Demo action — does nothing real.',
    run: galleryNoop('env.select-prod'),
  },
} satisfies Record<string, AegisAction<void, void>>;

/* ── Helpers ────────────────────────────────────────────────────────── */

export interface SpecimenProps {
  caption: string;
  children: ReactNode;
  span?: 1 | 2 | 3;
}

export interface GalleryRunRow {
  id: string;
  service: string;
  state: 'running' | 'queued' | 'failed' | 'done';
  duration: number;
}

export const GALLERY_RUN_STATES: Array<GalleryRunRow['state']> = [
  'done',
  'running',
  'done',
  'queued',
  'failed',
];

export const GALLERY_RUNS: GalleryRunRow[] = Array.from(
  { length: 47 },
  (_, i) => ({
    id: `RUN-${String(i + 1).padStart(4, '0')}`,
    service: ['order-svc', 'cart-svc', 'inventory', 'payments'][i % 4],
    state: GALLERY_RUN_STATES[i % GALLERY_RUN_STATES.length],
    duration: 30 + ((i * 37) % 270),
  })
);

export interface GalleryModelRow {
  model: string;
  runs: number;
  passed: number;
  failed: number;
  errored: number;
  mean: number | null;
}

export const GALLERY_MODEL_ROWS: GalleryModelRow[] = [
  {
    model: 'model-alpha',
    runs: 12,
    passed: 9,
    failed: 2,
    errored: 1,
    mean: 0.75,
  },
  {
    model: 'model-beta',
    runs: 120,
    passed: 31,
    failed: 80,
    errored: 9,
    mean: 0.2583,
  },
  { model: 'model-gamma', runs: 8, passed: 0, failed: 8, errored: 0, mean: 0 },
  {
    model: 'model-delta',
    runs: 3,
    passed: 0,
    failed: 0,
    errored: 3,
    mean: null,
  },
];

export const GALLERY_MODEL_COLUMNS: Array<DataTableColumn<GalleryModelRow>> = [
  { key: 'model', header: 'Model', render: (row) => row.model },
  { key: 'runs', header: 'Runs', numeric: true, render: (row) => row.runs },
  {
    key: 'passed',
    header: 'Passed',
    numeric: true,
    render: (row) => row.passed,
  },
  {
    key: 'failed',
    header: 'Failed',
    numeric: true,
    render: (row) => row.failed,
  },
  {
    key: 'mean',
    header: 'Mean score',
    numeric: true,
    render: (row) => (row.mean === null ? '—' : row.mean.toFixed(2)),
  },
];

export const GALLERY_CHECK_RUNS: Array<CheckGridColumn<string>> = [
  { key: 'r1', label: '运行 1' },
  { key: 'r2', label: '运行 2' },
  { key: 'r3', label: '运行 3' },
  { key: 'r4', label: '运行 4' },
  { key: 'r5', label: '运行 5' },
];

export const GALLERY_CHECK_ROWS: Array<CheckGridRow<string>> = [
  {
    key: 'binding',
    label: 'binding_controls_all_serving_readers',
    cells: {
      r1: { state: 'missed', value: 'replica' },
      r2: { state: 'missed', value: 'replica' },
      r3: { state: 'missed', value: 'replica' },
      r4: { state: 'unchecked' },
      r5: { state: 'missed', value: 'replica' },
    },
  },
  {
    key: 'export',
    label: 'all_serving_export_results_preserved',
    cells: {
      r1: { state: 'passed' },
      r2: { state: 'passed' },
      r3: { state: 'passed' },
      r4: { state: 'unchecked' },
      r5: { state: 'passed' },
    },
  },
  {
    key: 'ddl',
    label: 'no_destructive_ddl',
    cells: {
      r1: { state: 'passed' },
      r2: { state: 'passed' },
      r3: { state: 'passed' },
      r4: { state: 'missed', value: 'DROP' },
      r5: { state: 'passed' },
    },
  },
];
