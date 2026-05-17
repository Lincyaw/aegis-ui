import { useEffect, useMemo, useState } from 'react';

import {
  Chip,
  DataTable,
  type DataTableColumn,
  EmptyState,
  MonoValue,
  StatusDot,
  Tabs,
  type TraceSpan,
  TraceTree,
} from '@lincyaw/aegis-ui';

import type { ArrowColumnInfo } from './arrowToRows';

type Row = Record<string, unknown>;

interface ResultViewProps {
  rows: Row[];
  columns: ArrowColumnInfo[];
}

type ViewMode = 'table' | 'trace';

const RIBBON_INLINE_LIMIT = 12;

export function ResultView({ rows, columns }: ResultViewProps) {
  const traceMapping = useMemo(() => detectTraceMapping(columns), [columns]);
  const traces = useMemo(
    () => (traceMapping ? groupRowsByTrace(rows, traceMapping) : []),
    [rows, traceMapping]
  );
  const hasTrace = traces.length > 0;
  const [mode, setMode] = useState<ViewMode>(hasTrace ? 'trace' : 'table');

  if (rows.length === 0) {
    return (
      <EmptyState title='No rows' description='The query returned zero rows.' />
    );
  }

  const items = hasTrace
    ? [
        { key: 'table', label: 'Table' },
        { key: 'trace', label: `Trace · ${String(traces.length)}` },
      ]
    : [{ key: 'table', label: 'Table' }];

  return (
    <div className='injection-data__result'>
      {hasTrace && (
        <Tabs
          activeKey={mode}
          onChange={(k) => {
            setMode(k === 'trace' ? 'trace' : 'table');
          }}
          items={items}
        />
      )}
      {mode === 'trace' && hasTrace ? (
        <TraceMultiView traces={traces} />
      ) : (
        <TableView rows={rows} columns={columns} />
      )}
    </div>
  );
}

function TableView({
  rows,
  columns,
}: {
  rows: Row[];
  columns: ArrowColumnInfo[];
}) {
  const tableColumns: Array<DataTableColumn<Row>> = useMemo(
    () =>
      columns.map((c) => ({
        key: c.name,
        header: c.name,
        render: (r) => renderCell(r[c.name]),
      })),
    [columns]
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
  startCol: string;
  durationCol: string;
  /** Divisor to convert raw duration value → milliseconds. */
  durationDivisor: number;
  status?: string;
}

interface TraceBundle {
  traceId: string;
  spans: TraceSpan[];
  rootName: string;
  spanCount: number;
  durationMs: number;
  hasError: boolean;
  truncated: boolean;
}

function detectTraceMapping(
  columns: ArrowColumnInfo[]
): TraceMapping | undefined {
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
  const start = pick(
    'start_time',
    'start_ts',
    'start_ms',
    'startms',
    'timestamp',
    'starttime'
  );
  const durationMillis = pick('duration_ms', 'durationms');
  // OTel's `Duration` (bare) is u64 nanoseconds — treat the same as
  // `duration_ns` rather than as already-ms.
  const durationNanos = pick(
    'duration_ns',
    'durationns',
    'duration',
    'durationnanos'
  );
  if (!traceId || !spanId || !start || (!durationMillis && !durationNanos)) {
    return undefined;
  }
  const durationCol = durationMillis ?? durationNanos;
  if (!durationCol) {
    return undefined;
  }
  return {
    traceId,
    spanId,
    parentId: pick('parent_span_id', 'parent_id', 'parentid', 'parentspanid'),
    name: pick('name', 'op', 'operation', 'span_name', 'spanname'),
    startCol: start,
    durationCol,
    durationDivisor: durationMillis ? 1 : 1_000_000,
    status: pick('status', 'status_code', 'statuscode'),
  };
}

function groupRowsByTrace(rows: Row[], m: TraceMapping): TraceBundle[] {
  const byTrace = new Map<string, Row[]>();
  for (const r of rows) {
    const tid = r[m.traceId];
    if (tid === null || tid === undefined || tid === '') {
      continue;
    }
    const key = String(tid);
    const bucket = byTrace.get(key);
    if (bucket) {
      bucket.push(r);
    } else {
      byTrace.set(key, [r]);
    }
  }
  const bundles: TraceBundle[] = [];
  byTrace.forEach((traceRows, traceId) => {
    bundles.push(buildBundle(traceId, traceRows, m));
  });
  bundles.sort((a, b) => {
    if (a.hasError !== b.hasError) {
      return a.hasError ? -1 : 1;
    }
    return b.durationMs - a.durationMs;
  });
  return bundles;
}

function buildBundle(
  traceId: string,
  traceRows: Row[],
  m: TraceMapping
): TraceBundle {
  const startValues = traceRows
    .map((r) => toMs(r[m.startCol]))
    .filter((v): v is number => v !== undefined);
  const traceStartMs = startValues.length > 0 ? Math.min(...startValues) : 0;

  const spans: TraceSpan[] = [];
  const ids = new Set<string>();
  for (const r of traceRows) {
    const id = String(r[m.spanId] ?? '');
    if (id.length === 0) {
      continue;
    }
    ids.add(id);
  }

  let traceEndMs = 0;
  let hasError = false;
  let truncated = false;
  // Track "earliest local root" name as a fallback when no in-result root is
  // found (LIMIT truncated the actual root out).
  let earliestStart = Number.POSITIVE_INFINITY;
  let earliestName = traceId;
  let inResultRoot: { startMs: number; name: string } | undefined;

  for (const r of traceRows) {
    const id = String(r[m.spanId] ?? '');
    if (id.length === 0) {
      continue;
    }
    const absMs = toMs(r[m.startCol]) ?? traceStartMs;
    const startMs = absMs - traceStartMs;
    const durRaw = toRawNumber(r[m.durationCol]) ?? 0;
    const durationMs = durRaw / m.durationDivisor;
    const parentRaw = m.parentId ? r[m.parentId] : undefined;
    const parentStr =
      parentRaw === null || parentRaw === undefined || parentRaw === ''
        ? null
        : String(parentRaw);
    const status = mapStatus(m.status ? r[m.status] : undefined);
    const name = m.name ? String(r[m.name] ?? id) : id;
    spans.push({
      id,
      parentId: parentStr,
      name,
      startMs,
      durationMs,
      status,
    });
    if (status === 'error') {
      hasError = true;
    }
    if (startMs + durationMs > traceEndMs) {
      traceEndMs = startMs + durationMs;
    }
    const isRoot = parentStr === null || !ids.has(parentStr);
    if (isRoot) {
      if (parentStr !== null) {
        // Parent existed but is missing from this result → truncation.
        truncated = true;
      }
      if (inResultRoot === undefined || startMs < inResultRoot.startMs) {
        inResultRoot = { startMs, name };
      }
    }
    if (startMs < earliestStart) {
      earliestStart = startMs;
      earliestName = name;
    }
  }

  const rootName = inResultRoot ? inResultRoot.name : earliestName;
  return {
    traceId,
    spans,
    rootName,
    spanCount: spans.length,
    durationMs: traceEndMs,
    hasError,
    truncated,
  };
}

function TraceMultiView({ traces }: { traces: TraceBundle[] }) {
  const [selectedId, setSelectedId] = useState<string>(
    traces[0]?.traceId ?? ''
  );
  // If the result set changes (new query), reset selection to the top trace.
  useEffect(() => {
    if (traces.length > 0 && !traces.some((t) => t.traceId === selectedId)) {
      setSelectedId(traces[0].traceId);
    }
  }, [traces, selectedId]);

  const selected = traces.find((t) => t.traceId === selectedId) ?? traces[0];
  if (!selected) {
    return (
      <EmptyState
        title='No spans'
        description='Result columns matched the trace heuristic but no usable rows came back.'
      />
    );
  }

  return (
    <div className='injection-data__trace'>
      {traces.length > 1 ? (
        <TraceRibbon
          traces={traces}
          selectedId={selected.traceId}
          onSelect={setSelectedId}
        />
      ) : null}
      <TraceCaption trace={selected} singleton={traces.length === 1} />
      <TraceTree spans={selected.spans} />
    </div>
  );
}

function TraceRibbon({
  traces,
  selectedId,
  onSelect,
}: {
  traces: TraceBundle[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const inline = traces.slice(0, RIBBON_INLINE_LIMIT);
  const overflow = traces.slice(RIBBON_INLINE_LIMIT);
  const overflowSelected = overflow.find((t) => t.traceId === selectedId);
  return (
    <div className='injection-data__trace-ribbon' role='tablist'>
      {inline.map((t) => (
        <TraceRibbonItem
          key={t.traceId}
          trace={t}
          selected={t.traceId === selectedId}
          onSelect={onSelect}
        />
      ))}
      {overflowSelected ? (
        <TraceRibbonItem
          trace={overflowSelected}
          selected
          onSelect={onSelect}
        />
      ) : null}
      {overflow.length > 0 ? (
        <select
          className='injection-data__trace-overflow'
          aria-label={`Select from ${String(overflow.length)} more traces`}
          value={overflowSelected ? overflowSelected.traceId : ''}
          onChange={(e) => {
            if (e.target.value !== '') {
              onSelect(e.target.value);
            }
          }}
        >
          <option value=''>{`+${String(overflow.length)} more`}</option>
          {overflow.map((t) => (
            <option key={t.traceId} value={t.traceId}>
              {`${t.hasError ? '⚠ ' : ''}${t.rootName} · ${String(t.spanCount)} spans · ${formatMs(t.durationMs)}`}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

function TraceRibbonItem({
  trace,
  selected,
  onSelect,
}: {
  trace: TraceBundle;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <Chip
      tone={selected ? 'ink' : trace.hasError ? 'warning' : 'default'}
      leading={<StatusDot tone={trace.hasError ? 'warning' : 'ink'} size={6} />}
      onClick={() => {
        onSelect(trace.traceId);
      }}
    >
      <span
        className='injection-data__trace-ribbon-label'
        title={`${trace.rootName} · ${trace.traceId}`}
      >
        {trace.rootName}
      </span>
      <span className='injection-data__trace-ribbon-meta'>
        {`${String(trace.spanCount)} · ${formatMs(trace.durationMs)}`}
      </span>
    </Chip>
  );
}

function TraceCaption({
  trace,
  singleton,
}: {
  trace: TraceBundle;
  singleton: boolean;
}) {
  return (
    <div className='injection-data__trace-caption'>
      {singleton ? (
        <StatusDot tone={trace.hasError ? 'warning' : 'ink'} size={6} />
      ) : null}
      <span className='injection-data__trace-caption-name'>
        {trace.rootName}
      </span>
      <MonoValue size='sm'>{trace.traceId}</MonoValue>
      <MonoValue size='sm'>{`${String(trace.spanCount)} spans`}</MonoValue>
      <MonoValue size='sm'>{formatMs(trace.durationMs)}</MonoValue>
      {trace.truncated ? (
        <span
          className='injection-data__trace-caption-warn'
          title='Some parent spans are missing from the result — LIMIT may have truncated this trace.'
        >
          ⚠ truncated by LIMIT
        </span>
      ) : null}
    </div>
  );
}

function mapStatus(v: unknown): TraceSpan['status'] {
  if (v === undefined || v === null) {
    return 'unset';
  }
  const s = String(v).toLowerCase();
  if (s === 'ok' || s === '0' || s === 'status_code_ok' || s === 'unset') {
    return 'ok';
  }
  if (s === 'error' || s === 'err' || s === '2' || s === 'status_code_error') {
    return 'error';
  }
  return 'unset';
}

function toRawNumber(v: unknown): number | undefined {
  if (typeof v === 'number') {
    return v;
  }
  if (typeof v === 'bigint') {
    return Number(v);
  }
  if (typeof v === 'string') {
    if (v.length === 0) {
      return undefined;
    }
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

// OTel timestamps reach us as a mix:
//   - ISO strings (Arrow Timestamp(ms,UTC) → Date → ISO via arrowToRows)
//   - decimal strings of nanos (Arrow Timestamp(ns) → BigInt → stringified
//     because the value overflows Number.MAX_SAFE_INTEGER)
//   - plain numbers (already-ms epoch in synthetic test fixtures)
// We normalize all of them to "milliseconds since epoch".
function toMs(v: unknown): number | undefined {
  if (typeof v === 'number') {
    return v > 1e14 ? v / 1_000_000 : v;
  }
  if (typeof v === 'bigint') {
    return Number(v / 1_000_000n);
  }
  if (typeof v === 'string') {
    if (v.length === 0) {
      return undefined;
    }
    if (/^-?\d+$/.test(v)) {
      // Pure-digit string is an integer epoch. ns-since-epoch values overflow
      // Number, so scale them down via BigInt before the cast. The 15-digit
      // threshold rules out ms-epochs (year 5138 is still 13 digits).
      if (v.length >= 15) {
        try {
          return Number(BigInt(v) / 1_000_000n);
        } catch {
          return undefined;
        }
      }
      const n = Number(v);
      return Number.isNaN(n) ? undefined : n;
    }
    const d = Date.parse(v);
    if (!Number.isNaN(d)) {
      return d;
    }
    const n = Number(v);
    if (!Number.isNaN(n)) {
      return n > 1e14 ? n / 1_000_000 : n;
    }
  }
  return undefined;
}

function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return '—';
  }
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}µs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(ms < 10 ? 1 : 0)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
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
