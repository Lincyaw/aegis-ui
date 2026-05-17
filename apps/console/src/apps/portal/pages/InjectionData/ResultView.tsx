import { useMemo, useState } from 'react';

import {
  DataTable,
  type DataTableColumn,
  EmptyState,
  Tabs,
  TraceTree,
  type TraceSpan,
} from '@lincyaw/aegis-ui';

import type { ArrowColumnInfo } from './arrowToRows';

type Row = Record<string, unknown>;

interface ResultViewProps {
  rows: Row[];
  columns: ArrowColumnInfo[];
}

type ViewMode = 'table' | 'trace';

export function ResultView({ rows, columns }: ResultViewProps) {
  const traceMapping = useMemo(() => detectTraceMapping(columns), [columns]);
  const [mode, setMode] = useState<ViewMode>(traceMapping ? 'trace' : 'table');

  if (rows.length === 0) {
    return (
      <EmptyState
        title='No rows'
        description='The query returned zero rows.'
      />
    );
  }

  const items = traceMapping
    ? [
        { key: 'table', label: 'Table' },
        { key: 'trace', label: 'Trace' },
      ]
    : [{ key: 'table', label: 'Table' }];

  return (
    <div className='injection-data__result'>
      {traceMapping && (
        <Tabs
          activeKey={mode}
          onChange={(k) => {
            setMode(k === 'trace' ? 'trace' : 'table');
          }}
          items={items}
        />
      )}
      {mode === 'trace' && traceMapping ? (
        <TraceView rows={rows} mapping={traceMapping} />
      ) : (
        <TableView rows={rows} columns={columns} />
      )}
    </div>
  );
}

function TableView({ rows, columns }: { rows: Row[]; columns: ArrowColumnInfo[] }) {
  const tableColumns: Array<DataTableColumn<Row>> = useMemo(
    () =>
      columns.map((c) => ({
        key: c.name,
        header: c.name,
        render: (r) => renderCell(r[c.name]),
      })),
    [columns],
  );

  return (
    <DataTable<Row>
      data={rows}
      rowKey={(_r, i) => String(i)}
      columns={tableColumns}
    />
  );
}

interface TraceMapping {
  traceId: string;
  spanId: string;
  parentId?: string;
  name?: string;
  startMs: string;
  durationMs: string;
  durationDivisor: number;
  status?: string;
}

function detectTraceMapping(columns: ArrowColumnInfo[]): TraceMapping | undefined {
  const idx = new Map<string, string>();
  for (const c of columns) {
    idx.set(c.name.toLowerCase(), c.name);
  }
  const pick = (...names: string[]): string | undefined => {
    for (const n of names) {
      const hit = idx.get(n);
      if (hit !== undefined) {
        return hit;
      }
    }
    return undefined;
  };
  const traceId = pick('trace_id', 'traceid');
  const spanId = pick('span_id', 'spanid');
  const start = pick('start_time', 'start_ts', 'start_ms', 'startms');
  const durationNs = pick('duration_ns', 'durationns');
  const durationMs = pick('duration_ms', 'durationms', 'duration');
  if (!traceId || !spanId || !start || (!durationNs && !durationMs)) {
    return undefined;
  }
  const durationCol = durationMs ?? durationNs;
  if (!durationCol) {
    return undefined;
  }
  return {
    traceId,
    spanId,
    parentId: pick('parent_span_id', 'parent_id', 'parentid'),
    name: pick('name', 'op', 'operation', 'span_name'),
    startMs: start,
    durationMs: durationCol,
    durationDivisor: durationMs ? 1 : 1_000_000,
    status: pick('status', 'status_code'),
  };
}

function TraceView({ rows, mapping }: { rows: Row[]; mapping: TraceMapping }) {
  const spans = useMemo(() => rowsToSpans(rows, mapping), [rows, mapping]);
  if (spans.length === 0) {
    return (
      <EmptyState
        title='No spans'
        description='Result columns matched the trace heuristic but no usable rows came back.'
      />
    );
  }
  return <TraceTree spans={spans} />;
}

function rowsToSpans(rows: Row[], m: TraceMapping): TraceSpan[] {
  const startValues = rows
    .map((r) => toMs(r[m.startMs]))
    .filter((v): v is number => v !== undefined);
  const traceStart = startValues.length > 0 ? Math.min(...startValues) : 0;
  return rows
    .map((r): TraceSpan | undefined => {
      const id = String(r[m.spanId] ?? '');
      if (id.length === 0) {
        return undefined;
      }
      const startAbs = toMs(r[m.startMs]) ?? traceStart;
      const rawDur = toNumber(r[m.durationMs]) ?? 0;
      const parentRaw = m.parentId ? r[m.parentId] : undefined;
      const parentId =
        parentRaw === null || parentRaw === undefined || parentRaw === ''
          ? null
          : String(parentRaw);
      const name = m.name ? String(r[m.name] ?? id) : id;
      return {
        id,
        parentId,
        name,
        startMs: startAbs - traceStart,
        durationMs: rawDur / m.durationDivisor,
        status: mapStatus(m.status ? r[m.status] : undefined),
      };
    })
    .filter((s): s is TraceSpan => s !== undefined);
}

function mapStatus(v: unknown): TraceSpan['status'] {
  if (v === undefined || v === null) {
    return 'unset';
  }
  const s = String(v).toLowerCase();
  if (s === 'ok' || s === '0' || s === 'unset') {
    return 'ok';
  }
  if (s === 'error' || s === 'err' || s === '2') {
    return 'error';
  }
  return 'unset';
}

function toMs(v: unknown): number | undefined {
  if (typeof v === 'number') {
    return v;
  }
  if (typeof v === 'bigint') {
    return Number(v);
  }
  if (typeof v === 'string') {
    const n = Number(v);
    if (!Number.isNaN(n)) {
      return n;
    }
    const d = Date.parse(v);
    if (!Number.isNaN(d)) {
      return d;
    }
  }
  return undefined;
}

function toNumber(v: unknown): number | undefined {
  if (typeof v === 'number') {
    return v;
  }
  if (typeof v === 'bigint') {
    return Number(v);
  }
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

function renderCell(v: unknown): string {
  if (v === null || v === undefined) {
    return '—';
  }
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}
