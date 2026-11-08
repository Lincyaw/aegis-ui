import { type ReactNode, useMemo, useState } from 'react';

import {
  type CircuitChip,
  CircuitGraph,
  CircuitLegend,
  type CircuitLegendItem,
  type CircuitWire,
  DecisionBar,
  type DecisionOption,
  KeyValueList,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
  SectionDivider,
  TimeSeriesChart,
  type TimeSeriesPoint,
  type TimeSeriesRow,
} from '@lincyaw/aegis-ui';

import { Specimen } from '../shared';

/* ── A fault case: a delay injected into ts-order-service ──────────── */

const NORMAL_START = 1777666108;
const INJECTED_AT = NORMAL_START + 300;
const ABNORMAL_END = INJECTED_AT + 300;
const BUCKET = 15;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function utc(t: number, precision: 'minute' | 'second'): string {
  const d = new Date(t * 1000);
  const hm = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
  return precision === 'minute' ? hm : `${hm}:${pad2(d.getUTCSeconds())}`;
}

/** A repeatable wobble, so the specimens look the same on every load. */
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function buckets(): number[] {
  const out: number[] = [];
  for (let t = NORMAL_START; t < ABNORMAL_END; t += BUCKET) {
    out.push(t);
  }
  return out;
}

const LEGEND: CircuitLegendItem[] = [
  { key: 'claimed', label: 'link under review', highlighted: true },
  { key: 'errors', label: 'errors up', tone: 'alarm' },
  { key: 'slower', label: 'slower', tone: 'caution' },
  { key: 'steady', label: 'no change', tone: 'neutral' },
  {
    key: 'vanished',
    label: 'only before',
    tone: 'neutral',
    pattern: 'dashed',
  },
  { key: 'new', label: 'only after', tone: 'neutral', pattern: 'dotted' },
  {
    key: 'inferred',
    label: "from one end's spans",
    tone: 'neutral',
    inferred: true,
  },
  { key: 'ghost', label: 'no calls seen', ghost: true },
];

const LEGEND_NOTE =
  'Abnormal vs normal window: errors up ≥ 5 pp · slower: p50 or p95 ≥ 1.5× · width: calls';

function chip(
  id: string,
  meta: string,
  extra: Partial<CircuitChip> = {}
): CircuitChip {
  return { id, label: id, kind: 'service', meta, ...extra };
}

const FOCUS_CHIPS: CircuitChip[] = [
  chip('loadgenerator', '2.9k → 2.8k calls', { kind: 'loadgen' }),
  chip('ts-ui-dashboard', 'p95 41 → 96 ms', { kind: 'gateway' }),
  chip('ts-travel-service', 'p95 12 → 31 ms', {
    tone: 'caution',
    emphasis: true,
    tags: [{ label: 'caller', tone: 'ink' }],
    pins: [
      {
        id: 'srv-left',
        side: 'in',
        label: 'POST /api/v1/travelservice/trips/left',
        value: '×2.6',
        tone: 'caution',
      },
      {
        id: 'srv-route',
        side: 'in',
        label: 'GET /api/v1/travelservice/routes/{tripId}',
      },
      {
        id: 'cli-seat',
        side: 'out',
        label: 'POST /api/v1/seatservice/seats/left_tickets',
        value: '×3.4',
        tone: 'caution',
      },
      {
        id: 'cli-route',
        side: 'out',
        label: 'GET /api/v1/routeservice/routes/{routeId}',
        value: '×1.0',
      },
      {
        id: 'cli-train',
        side: 'out',
        label: 'GET /api/v1/trainservice/trains/byName/{name}',
        value: '×1.1',
      },
      {
        id: 'cli-basic',
        side: 'out',
        label: 'POST /api/v1/basicservice/basic/travels',
        value: '×1.2',
      },
    ],
  }),
  chip('ts-seat-service', 'p95 9.1 → 31 ms', {
    tone: 'caution',
    emphasis: true,
    tags: [{ label: 'callee', tone: 'ink' }],
    pins: [
      {
        id: 'srv-left-tickets',
        side: 'in',
        label: 'POST /api/v1/seatservice/seats/left_tickets',
        value: '×3.4',
        tone: 'caution',
      },
      {
        id: 'srv-seats',
        side: 'in',
        label: 'POST /api/v1/seatservice/seats',
      },
      {
        id: 'cli-tickets',
        side: 'out',
        label: 'POST /api/v1/orderservice/order/tickets',
        value: '×4.0',
        tone: 'caution',
      },
      {
        id: 'cli-config',
        side: 'out',
        label: 'GET /api/v1/configservice/configs/{configName}',
        value: '×1.0',
      },
    ],
  }),
  chip('ts-route-service', 'p95 4.2 → 4.4 ms'),
  chip('ts-train-service', 'p95 3.0 → 3.1 ms'),
  chip('ts-basic-service', 'p95 22 → 26 ms'),
  chip('ts-order-service', 'p95 6.8 → 27 ms', {
    tone: 'caution',
    tags: [{ label: 'fault target', tone: 'caution' }],
  }),
  chip('ts-config-service', 'p95 2.1 → 2.2 ms'),
  chip('ts-order-mongo', 'p95 1.2 → 1.3 ms', { kind: 'database' }),
  chip('more-travel', '', {
    label: '9 more callees',
    kind: 'more',
    variant: 'stub',
  }),
];

const FOCUS_WIRES: CircuitWire[] = [
  {
    id: 'w1',
    source: 'loadgenerator',
    target: 'ts-ui-dashboard',
    weight: 1,
  },
  {
    id: 'w2',
    source: 'ts-ui-dashboard',
    target: 'ts-travel-service',
    weight: 0.6,
    tone: 'caution',
  },
  {
    id: 'claimed',
    source: 'ts-travel-service',
    target: 'ts-seat-service',
    weight: 0.45,
    tone: 'caution',
    highlighted: true,
    label: 'p95 9.1 → 31 ms',
    title: 'ts-travel-service → ts-seat-service · 94 → 88 calls',
    strands: [
      {
        sourcePin: 'cli-seat',
        targetPin: 'srv-left-tickets',
        tone: 'caution',
        weight: 0.45,
      },
    ],
  },
  {
    id: 'w4',
    source: 'ts-travel-service',
    target: 'ts-route-service',
    weight: 0.45,
    strands: [{ sourcePin: 'cli-route', weight: 0.45 }],
  },
  {
    id: 'w5',
    source: 'ts-travel-service',
    target: 'ts-train-service',
    weight: 0.42,
    strands: [{ sourcePin: 'cli-train', weight: 0.42 }],
  },
  {
    id: 'w6',
    source: 'ts-travel-service',
    target: 'ts-basic-service',
    weight: 0.55,
    strands: [{ sourcePin: 'cli-basic', weight: 0.55 }],
  },
  {
    id: 'w7',
    source: 'ts-seat-service',
    target: 'ts-order-service',
    weight: 0.5,
    tone: 'caution',
    strands: [
      {
        sourcePin: 'cli-tickets',
        tone: 'caution',
        weight: 0.5,
      },
    ],
  },
  {
    id: 'w8',
    source: 'ts-seat-service',
    target: 'ts-config-service',
    weight: 0.5,
    strands: [{ sourcePin: 'cli-config', weight: 0.5 }],
  },
  {
    id: 'w9',
    source: 'ts-order-service',
    target: 'ts-order-mongo',
    weight: 0.7,
  },
  {
    id: 'w10',
    source: 'ts-ui-dashboard',
    target: 'ts-order-service',
    weight: 0.55,
    tone: 'caution',
  },
  {
    id: 'w11',
    source: 'ts-travel-service',
    target: 'more-travel',
    weight: 0.2,
    tone: 'faint',
  },
];

function CircuitGraphFocusSpecimen(): ReactNode {
  const [expanded, setExpanded] = useState<string[]>(['ts-seat-service']);
  const [selectedWire, setSelectedWire] = useState<string | undefined>(
    'claimed'
  );
  const [selectedChip, setSelectedChip] = useState<string | undefined>();
  const toggle = (c: CircuitChip): void => {
    setExpanded((ids) =>
      ids.includes(c.id) ? ids.filter((id) => id !== c.id) : [...ids, c.id]
    );
  };
  return (
    <div className='gallery__stack gallery__stack--fill'>
      <CircuitGraph
        chips={FOCUS_CHIPS}
        wires={FOCUS_WIRES}
        height={520}
        expandedIds={expanded}
        onToggleExpand={toggle}
        selectedChipId={selectedChip}
        selectedWireId={selectedWire}
        onSelectChip={(c) => {
          setSelectedChip(c.id);
          setSelectedWire(undefined);
        }}
        onSelectWire={(w) => {
          setSelectedWire(w.id);
          setSelectedChip(undefined);
        }}
        focus={{
          ids: FOCUS_CHIPS.map((c) => c.id),
          core: ['ts-travel-service', 'ts-seat-service'],
        }}
        legend={<CircuitLegend items={LEGEND} note={LEGEND_NOTE} />}
        ariaLabel='Evidence board for ts-travel-service calling ts-seat-service'
      />
      <KeyValueList
        items={[
          { k: 'expandedIds', v: <MonoValue>{expanded.join(', ')}</MonoValue> },
          {
            k: 'selected',
            v: (
              <MonoValue>
                {selectedChip ?? selectedWire ?? 'nothing selected'}
              </MonoValue>
            ),
          },
        ]}
      />
    </div>
  );
}

const GHOST_CHIPS: CircuitChip[] = [
  chip('frontend', 'p95 38 → 2.9k ms', {
    tone: 'caution',
    emphasis: true,
    tags: [{ label: 'caller', tone: 'ink' }],
  }),
  chip('profile', '1.4k → 0 spans', {
    emphasis: true,
    tags: [
      { label: 'callee', tone: 'ink' },
      { label: 'fault target', tone: 'caution' },
    ],
  }),
  chip('search', 'p95 1.8 → 2.0 ms'),
  chip('reservation', 'errors 0 → 41 %', { tone: 'alarm' }),
  chip('memcached-profile', 'metrics and logs only', {
    kind: 'cache',
    tags: [{ label: 'no traces' }],
  }),
  chip('productreview', 'no telemetry in either window', {
    variant: 'ghost',
  }),
  chip('mongodb-rate', 'metrics and logs only', {
    kind: 'database',
    tags: [{ label: 'no traces' }],
    faint: true,
  }),
];

const GHOST_WIRES: CircuitWire[] = [
  {
    id: 'g-claimed',
    source: 'frontend',
    target: 'profile',
    ghost: true,
    highlighted: true,
    label: 'no calls in either window',
  },
  { id: 'g2', source: 'frontend', target: 'search', weight: 0.8 },
  {
    id: 'g3',
    source: 'frontend',
    target: 'reservation',
    weight: 0.5,
    tone: 'alarm',
  },
  {
    id: 'g4',
    source: 'profile',
    target: 'memcached-profile',
    weight: 0.5,
    pattern: 'dashed',
    inferred: true,
  },
  { id: 'g5', source: 'frontend', target: 'productreview', ghost: true },
];

function CircuitGraphGhostSpecimen(): ReactNode {
  return (
    <CircuitGraph
      chips={GHOST_CHIPS}
      wires={GHOST_WIRES}
      height={340}
      selectedWireId='g-claimed'
      onSelectWire={() => undefined}
      onSelectChip={() => undefined}
      focus={{ ids: GHOST_CHIPS.map((c) => c.id) }}
      legend={<CircuitLegend items={LEGEND.slice(2)} />}
      ariaLabel='Evidence board for frontend calling profile'
    />
  );
}

const BOARD_SERVICES = [
  'ts-ui-dashboard',
  'ts-auth-service',
  'ts-user-service',
  'ts-verification-code-service',
  'ts-travel-service',
  'ts-travel2-service',
  'ts-travel-plan-service',
  'ts-route-plan-service',
  'ts-basic-service',
  'ts-station-service',
  'ts-train-service',
  'ts-route-service',
  'ts-price-service',
  'ts-seat-service',
  'ts-order-service',
  'ts-order-other-service',
  'ts-config-service',
  'ts-preserve-service',
  'ts-security-service',
  'ts-contacts-service',
  'ts-food-service',
  'ts-train-food-service',
  'ts-station-food-service',
  'ts-assurance-service',
  'ts-consign-service',
  'ts-consign-price-service',
  'ts-notification-service',
  'ts-cancel-service',
  'ts-inside-payment-service',
  'ts-payment-service',
];

const BOARD_CALLS: Array<[string, string]> = [
  ['loadgenerator', 'ts-ui-dashboard'],
  ['ts-ui-dashboard', 'ts-auth-service'],
  ['ts-ui-dashboard', 'ts-user-service'],
  ['ts-ui-dashboard', 'ts-verification-code-service'],
  ['ts-auth-service', 'ts-verification-code-service'],
  ['ts-ui-dashboard', 'ts-travel-plan-service'],
  ['ts-ui-dashboard', 'ts-travel-service'],
  ['ts-ui-dashboard', 'ts-order-service'],
  ['ts-ui-dashboard', 'ts-order-other-service'],
  ['ts-ui-dashboard', 'ts-preserve-service'],
  ['ts-ui-dashboard', 'ts-food-service'],
  ['ts-ui-dashboard', 'ts-cancel-service'],
  ['ts-ui-dashboard', 'ts-route-service'],
  ['ts-ui-dashboard', 'ts-train-service'],
  ['ts-travel-plan-service', 'ts-route-plan-service'],
  ['ts-travel-plan-service', 'ts-seat-service'],
  ['ts-route-plan-service', 'ts-travel-service'],
  ['ts-route-plan-service', 'ts-travel2-service'],
  ['ts-travel-service', 'ts-basic-service'],
  ['ts-travel-service', 'ts-seat-service'],
  ['ts-travel-service', 'ts-route-service'],
  ['ts-travel-service', 'ts-train-service'],
  ['ts-travel2-service', 'ts-basic-service'],
  ['ts-travel2-service', 'ts-seat-service'],
  ['ts-basic-service', 'ts-station-service'],
  ['ts-basic-service', 'ts-train-service'],
  ['ts-basic-service', 'ts-route-service'],
  ['ts-basic-service', 'ts-price-service'],
  ['ts-seat-service', 'ts-order-service'],
  ['ts-seat-service', 'ts-order-other-service'],
  ['ts-seat-service', 'ts-config-service'],
  ['ts-preserve-service', 'ts-security-service'],
  ['ts-preserve-service', 'ts-contacts-service'],
  ['ts-preserve-service', 'ts-travel-service'],
  ['ts-preserve-service', 'ts-seat-service'],
  ['ts-preserve-service', 'ts-assurance-service'],
  ['ts-preserve-service', 'ts-food-service'],
  ['ts-preserve-service', 'ts-consign-service'],
  ['ts-preserve-service', 'ts-user-service'],
  ['ts-preserve-service', 'ts-notification-service'],
  ['ts-security-service', 'ts-order-service'],
  ['ts-security-service', 'ts-order-other-service'],
  ['ts-food-service', 'ts-train-food-service'],
  ['ts-food-service', 'ts-station-food-service'],
  ['ts-food-service', 'ts-travel-service'],
  ['ts-consign-service', 'ts-consign-price-service'],
  ['ts-cancel-service', 'ts-order-service'],
  ['ts-cancel-service', 'ts-inside-payment-service'],
  ['ts-inside-payment-service', 'ts-payment-service'],
  ['ts-inside-payment-service', 'ts-order-service'],
  ['ts-order-service', 'ts-station-service'],
];

function CircuitGraphBoardSpecimen(): ReactNode {
  const [selected, setSelected] = useState<string | undefined>();
  const chips = useMemo(
    (): CircuitChip[] => [
      chip('loadgenerator', '', { kind: 'loadgen' }),
      ...BOARD_SERVICES.map((id, i) =>
        chip(id, `p95 ${String(3 + (i % 7) * 4)} ms`, {
          kind: id === 'ts-ui-dashboard' ? 'gateway' : 'service',
          tone: id === 'ts-order-service' ? 'caution' : undefined,
          tags:
            id === 'ts-order-service'
              ? [{ label: 'fault target', tone: 'caution' }]
              : undefined,
        })
      ),
    ],
    []
  );
  const wires = useMemo(
    (): CircuitWire[] =>
      BOARD_CALLS.map(([source, target], i) => ({
        id: `b${String(i)}`,
        source,
        target,
        weight: noise(i + 1),
        tone:
          target === 'ts-order-service'
            ? 'caution'
            : source === 'ts-order-service'
              ? 'faint'
              : 'neutral',
      })),
    []
  );
  return (
    <CircuitGraph
      chips={chips}
      wires={wires}
      height={560}
      selectedChipId={selected}
      onSelectChip={(c) => {
        setSelected(c.id);
      }}
      onSelectWire={() => undefined}
      legend={
        <CircuitLegend
          items={LEGEND.slice(1, 4)}
          collapsible
          defaultCollapsed
        />
      }
      ariaLabel='TrainTicket call graph'
    />
  );
}

/* ── Time series of the link under review ──────────────────────────── */

function linkRows(): TimeSeriesRow[] {
  const ts = buckets();
  const after = (t: number): boolean => t >= INJECTED_AT;
  const calls: TimeSeriesPoint[] = ts.map((t, i) => ({
    t,
    v: Math.round(4 + noise(i) * 3 - (after(t) ? 0.6 : 0)),
  }));
  const err: TimeSeriesPoint[] = ts.map((t, i) => ({
    t,
    v: after(t) && i % 7 === 3 ? 0.08 : 0,
  }));
  const p95: TimeSeriesPoint[] = ts.map((t, i) => ({
    t,
    v: after(t) ? 26 + noise(i + 99) * 12 : 8 + noise(i + 99) * 2.5,
  }));
  const p50: TimeSeriesPoint[] = ts.map((t, i) => ({
    t,
    v: after(t) ? 14 + noise(i + 7) * 5 : 4.8 + noise(i + 7) * 1.2,
  }));
  const pct = (v: number): string => `${(v * 100).toFixed(0)}%`;
  const ms = (v: number): string => `${v.toFixed(v < 10 ? 1 : 0)} ms`;
  return [
    {
      key: 'calls',
      label: 'Calls',
      kind: 'bars',
      lines: [{ key: 'calls', label: 'calls', color: 'cat-6', points: calls }],
      formatValue: (v) => v.toFixed(0),
      summary: '94 → 88 per window',
    },
    {
      key: 'errors',
      label: 'Error rate',
      lines: [{ key: 'err', label: 'errors', color: 'cat-3', points: err }],
      formatValue: pct,
      minMax: 0.05,
      summary: '0% → 1.1%',
    },
    {
      key: 'latency',
      label: 'Latency',
      lines: [
        { key: 'p95', label: 'p95', color: 'cat-1', points: p95 },
        {
          key: 'p50',
          label: 'p50',
          color: 'cat-1',
          lineStyle: 'dashed',
          points: p50,
        },
      ],
      formatValue: ms,
      summary: 'p95 9.1 → 31 ms · p50 5.3 → 16 ms',
    },
  ];
}

const WINDOWS = [
  {
    key: 'normal',
    start: NORMAL_START,
    end: INJECTED_AT,
    label: 'normal',
    tone: 'baseline' as const,
  },
  {
    key: 'abnormal',
    start: INJECTED_AT,
    end: ABNORMAL_END,
    label: 'abnormal',
    tone: 'focus' as const,
  },
];

const MARKERS = [
  {
    key: 'inj',
    at: INJECTED_AT,
    label: `injection ${utc(INJECTED_AT, 'second')} UTC`,
  },
];

function metricRows(): TimeSeriesRow[] {
  const ts = buckets();
  const after = (t: number): boolean => t >= INJECTED_AT;
  const pods = ['ts-order-service-7c9f-x2kq', 'ts-order-service-7c9f-m8zt'];
  const series = (
    base: number,
    jump: number,
    seed: number
  ): TimeSeriesPoint[][] =>
    pods.map((_, p) =>
      ts.map((t, i) => ({
        t,
        v:
          base * (1 + p * 0.15) +
          noise(i * 3 + p + seed) * base * 0.2 +
          (after(t) ? jump : 0),
      }))
    );
  const cpu = series(0.18, 0.05, 1);
  const mem = series(612, 4, 2);
  const net = series(14, -6, 3);
  const lines = (points: TimeSeriesPoint[][]) =>
    pods.map((pod, p) => ({
      key: pod,
      label: pod.slice(-4),
      color: p === 0 ? ('cat-1' as const) : ('cat-3' as const),
      points: points[p],
    }));
  return [
    {
      key: 'cpu',
      label: 'CPU',
      lines: lines(cpu),
      formatValue: (v) => `${(v * 100).toFixed(0)}%`,
    },
    {
      key: 'mem',
      label: 'Memory',
      lines: lines(mem),
      formatValue: (v) => `${v.toFixed(0)} MiB`,
    },
    {
      key: 'net',
      label: 'Network out',
      lines: lines(net),
      formatValue: (v) => `${v.toFixed(0)} KiB/s`,
    },
  ];
}

/* ── Verdicts ──────────────────────────────────────────────────────── */

const VERDICTS: DecisionOption[] = [
  {
    value: 'REAL',
    label: 'Real',
    tone: 'positive',
    shortcut: 'r',
    description:
      'v calls u, the calls degraded in the abnormal window, and not before the injection.',
  },
  {
    value: 'NOT_REAL',
    label: 'Not real',
    tone: 'negative',
    shortcut: 'n',
    description:
      'The calls exist, but v was not affected through u: everything slowed, or it began before the injection.',
  },
  {
    value: 'NO_CALL',
    label: 'No call',
    tone: 'neutral',
    shortcut: 'c',
    description: 'v does not call u in either window.',
  },
  {
    value: 'UNCLEAR',
    label: 'Unclear',
    tone: 'undecided',
    shortcut: 'u',
    description: 'The data cannot settle it; say what is missing in the note.',
  },
];

function DecisionBarSpecimen(): ReactNode {
  const [value, setValue] = useState<string | null>('NOT_REAL');
  return (
    <div className='gallery__stack'>
      <DecisionBar
        options={VERDICTS}
        value={value}
        onChange={setValue}
        ariaLabel='Verdict'
      />
      <MetricLabel>value · {value ?? 'none'}</MetricLabel>
    </div>
  );
}

export function EvidenceSection() {
  const link = useMemo(linkRows, []);
  const metrics = useMemo(metricRows, []);
  return (
    <Panel
      title={<PanelTitle size='lg'>Evidence</PanelTitle>}
      extra={<MetricLabel>telemetry review · fault cases</MetricLabel>}
    >
      <SectionDivider extra={<MetricLabel>dagre · xyflow</MetricLabel>}>
        CircuitGraph
      </SectionDivider>
      <div className='gallery__stack'>
        <Specimen
          caption="focus · expandedIds · strands — the link under review (highlighted, labelled) between two emphasised chips, with the caller's other callees, the fault target and a stub chip for callees not drawn; the callee opens with its pins and its wires run to them: in pins on the left where calls arrive, out pins on the right where calls leave; press a chip's chevron or double-click it to show its pins, and the selected chip keeps its place while the board re-lays itself; the legend states the thresholds behind the colours"
          span={3}
        >
          <CircuitGraphFocusSpecimen />
        </Specimen>
        <Specimen
          caption="ghost · inferred · faint — a claimed link with no calls in either window draws as a hollow dashed trace with its label; a chip that stopped emitting spans keeps its wires dashed; a wire counted from one end's own spans (a cache that emits none) carries cross ticks; a service with no telemetry at all is a ghost chip, and one on no wire recedes"
          span={3}
        >
          <CircuitGraphGhostSpecimen />
        </Specimen>
        <Specimen
          caption='31 chips, 51 wires, no focus — the whole board fitted, with the minimap; each wire is routed on its own path between the chips, so no two wires share a trunk; hover a chip to fade the wires it does not join'
          span={3}
        >
          <CircuitGraphBoardSpecimen />
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>windows · markers</MetricLabel>}>
        TimeSeriesChart
      </SectionDivider>
      <div className='gallery__stack'>
        <Specimen
          caption="a link's calls, error rate and latency stacked over one time axis, the normal window in the muted wash and the abnormal one in the warning wash, the injection marked through every row; bars span their 15 s bucket; hover, or focus and use ← →, to read every row at one time"
          span={3}
        >
          <TimeSeriesChart
            rows={link}
            windows={WINDOWS}
            markers={MARKERS}
            bucketSeconds={BUCKET}
            formatTime={utc}
            label='ts-travel-service to ts-seat-service over both windows'
          />
        </Specimen>
        <Specimen
          caption="density='compact' — per-pod metrics as small multiples; the axis of each row reaches its own maximum"
          span={3}
        >
          <TimeSeriesChart
            rows={metrics}
            windows={WINDOWS}
            markers={MARKERS}
            formatTime={utc}
            density='compact'
            label='ts-order-service metrics per pod'
          />
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>verdict · shortcuts</MetricLabel>}>
        DecisionBar
      </SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen
          caption='one answer of four, each with its key; the chosen one inverts; the line below says when to choose the answer chosen or pointed at; ← → move between answers'
          span={3}
        >
          <DecisionBarSpecimen />
        </Specimen>
      </div>
    </Panel>
  );
}
