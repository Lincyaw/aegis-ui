import type { TerminalLine, TraceSpan } from '@lincyaw/aegis-ui';
import type {
  InjectionInjectionTimelineEvent,
  InjectionInjectionTimelineResp,
  InjectionInjectionTimelineWindow,
  TraceSpanNode,
} from '@lincyaw/portal';

/**
 * Pure mapping from the backend's trace shapes — orchestrator span nodes,
 * the injection's phase timeline, and span rows returned by a datapack
 * query — onto the library's `TraceSpan`.
 */

type Row = Record<string, unknown>;

export function formatMs(ms: number): string {
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

/**
 * Wall-clock time between two ISO timestamps; a missing end means "until
 * now". Runs last minutes to hours, so past a minute it reads `4m 05s`.
 */
export function formatElapsed(startIso?: string, endIso?: string): string {
  const start = Date.parse(startIso ?? '');
  const end = endIso ? Date.parse(endIso) : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return '—';
  }
  const ms = end - start;
  if (ms < 60_000) {
    return formatMs(ms);
  }
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = String(totalSec % 60).padStart(2, '0');
  return h > 0
    ? `${String(h)}h ${String(m).padStart(2, '0')}m`
    : `${String(m)}m ${s}s`;
}

/** OTel status, given as a name (`Ok`, `STATUS_CODE_ERROR`) or a code (0 unset, 1 ok, 2 error). */
export function spanStatus(value: unknown): TraceSpan['status'] {
  if (value === undefined || value === null) {
    return 'unset';
  }
  const s = String(value).toLowerCase();
  if (s === 'ok' || s === 'status_code_ok' || s === '1') {
    return 'ok';
  }
  if (s === 'error' || s === 'err' || s === 'status_code_error' || s === '2') {
    return 'error';
  }
  return 'unset';
}

/* ── Orchestrator spans and phase timeline ─────────────────────────── */

export interface SpanGroup {
  otelTraceId: string;
  spans: TraceSpan[];
  startMs: number;
  durationMs: number;
}

export function groupSpansByOTelTrace(
  nodes: TraceSpanNode[] | undefined
): SpanGroup[] {
  const byOTel = new Map<string, TraceSpanNode[]>();
  for (const n of nodes ?? []) {
    const key = n.otel_trace_id ?? '';
    byOTel.set(key, [...(byOTel.get(key) ?? []), n]);
  }
  const groups: SpanGroup[] = [];
  for (const [otelTraceId, members] of byOTel) {
    const localIds = new Set(
      members.map((m) => m.span_id).filter((id): id is string => Boolean(id))
    );
    const starts = members
      .map((m) => Date.parse(m.start_ts ?? ''))
      .filter((n) => !Number.isNaN(n));
    if (starts.length === 0) {
      continue;
    }
    const traceStartMs = Math.min(...starts);
    let traceEndMs = traceStartMs;
    const spans: TraceSpan[] = members.map((m, i) => {
      const startMs = Date.parse(m.start_ts ?? '');
      const endMs = Date.parse(m.end_ts ?? '');
      const safeStart = Number.isNaN(startMs) ? traceStartMs : startMs;
      const safeEnd = Number.isNaN(endMs)
        ? safeStart
        : Math.max(endMs, safeStart);
      traceEndMs = Math.max(traceEndMs, safeEnd);
      return {
        id: m.span_id ?? `span-${otelTraceId}-${String(i)}`,
        parentId: m.parent_id && localIds.has(m.parent_id) ? m.parent_id : null,
        name: [m.service, m.op].filter(Boolean).join(' · ') || 'span',
        startMs: safeStart - traceStartMs,
        durationMs: safeEnd - safeStart,
        status: spanStatus(m.status),
        kind: m.service,
      };
    });
    groups.push({
      otelTraceId,
      spans,
      startMs: traceStartMs,
      durationMs: traceEndMs - traceStartMs,
    });
  }
  return groups.sort((a, b) => a.startMs - b.startMs);
}

const PHASE_ORDER = ['pre', 'fault', 'post', 'recover'] as const;

export interface PhaseGantt {
  spans: TraceSpan[];
  maxMs: number;
  totalMs: number;
}

export function buildPhaseGantt(
  timeline: InjectionInjectionTimelineResp
): PhaseGantt | null {
  const phases = PHASE_ORDER.flatMap((key) => {
    const window: InjectionInjectionTimelineWindow | undefined = timeline[key];
    return window?.start ? [{ key, window }] : [];
  });
  const starts = phases
    .map((p) => Date.parse(p.window.start ?? ''))
    .filter((n) => !Number.isNaN(n));
  if (starts.length === 0) {
    return null;
  }
  const traceStartMs = Math.min(...starts);
  let traceEndMs = traceStartMs;
  const spans: TraceSpan[] = phases.map((p, i) => {
    const startMs = Date.parse(p.window.start ?? '');
    const endMs = p.window.end ? Date.parse(p.window.end) : Date.now();
    const safeStart = Number.isNaN(startMs) ? traceStartMs : startMs;
    const safeEnd = Number.isNaN(endMs)
      ? safeStart
      : Math.max(endMs, safeStart);
    traceEndMs = Math.max(traceEndMs, safeEnd);
    return {
      id: `phase-${p.key}-${String(i)}`,
      name: p.key,
      startMs: safeStart - traceStartMs,
      durationMs: Math.max(1, safeEnd - safeStart),
      kind: p.key,
    };
  });
  const totalMs = traceEndMs - traceStartMs;
  return { spans, maxMs: Math.max(totalMs, 1), totalMs };
}

export function timelineEventLines(
  events: InjectionInjectionTimelineEvent[] | undefined
): TerminalLine[] {
  return [...(events ?? [])]
    .sort((a, b) => (a.ts ?? '').localeCompare(b.ts ?? ''))
    .map((e, i) => ({
      ts: e.ts ?? String(i),
      prefix: e.kind ?? 'event',
      body: e.label ?? '',
    }));
}

/* ── Span rows from a datapack query ───────────────────────────────── */

export interface TraceColumnMapping {
  traceId: string;
  spanId: string;
  parentId?: string;
  name?: string;
  startCol: string;
  durationCol: string;
  /** Divisor that turns the raw duration value into milliseconds. */
  durationDivisor: number;
  status?: string;
}

export interface TraceBundle {
  traceId: string;
  spans: TraceSpan[];
  rootName: string;
  spanCount: number;
  durationMs: number;
  hasError: boolean;
  /** A span's parent is missing from the rows, e.g. cut off by LIMIT. */
  truncated: boolean;
}

/** Finds the span columns in a result by their usual OTel names, if all are there. */
export function detectTraceMapping(
  columns: ReadonlyArray<{ name: string }>
): TraceColumnMapping | undefined {
  const byLower = new Map(columns.map((c) => [c.name.toLowerCase(), c.name]));
  const pick = (...names: string[]): string | undefined =>
    names.map((n) => byLower.get(n)).find((hit) => hit !== undefined);
  const traceId = pick('trace_id', 'traceid');
  const spanId = pick('span_id', 'spanid');
  const startCol = pick(
    'start_time',
    'start_ts',
    'start_ms',
    'startms',
    'timestamp',
    'starttime'
  );
  const durationMillis = pick('duration_ms', 'durationms');
  // OTel's bare `Duration` is u64 nanoseconds, like `duration_ns`.
  const durationNanos = pick(
    'duration_ns',
    'durationns',
    'duration',
    'durationnanos'
  );
  const durationCol = durationMillis ?? durationNanos;
  if (!traceId || !spanId || !startCol || !durationCol) {
    return undefined;
  }
  return {
    traceId,
    spanId,
    parentId: pick('parent_span_id', 'parent_id', 'parentid', 'parentspanid'),
    name: pick('name', 'op', 'operation', 'span_name', 'spanname'),
    startCol,
    durationCol,
    durationDivisor: durationMillis ? 1 : 1_000_000,
    status: pick('status', 'status_code', 'statuscode'),
  };
}

/** One bundle per trace id, failing traces first, then the longest. */
export function groupRowsByTrace(
  rows: Row[],
  mapping: TraceColumnMapping
): TraceBundle[] {
  const byTrace = new Map<string, Row[]>();
  for (const r of rows) {
    const tid = r[mapping.traceId];
    if (tid === null || tid === undefined || tid === '') {
      continue;
    }
    const key = String(tid);
    byTrace.set(key, [...(byTrace.get(key) ?? []), r]);
  }
  return [...byTrace]
    .map(([traceId, traceRows]) => buildBundle(traceId, traceRows, mapping))
    .sort((a, b) =>
      a.hasError === b.hasError
        ? b.durationMs - a.durationMs
        : a.hasError
          ? -1
          : 1
    );
}

function buildBundle(
  traceId: string,
  traceRows: Row[],
  m: TraceColumnMapping
): TraceBundle {
  const startValues = traceRows
    .map((r) => toMs(r[m.startCol]))
    .filter((v): v is number => v !== undefined);
  const traceStartMs = startValues.length > 0 ? Math.min(...startValues) : 0;
  const ids = new Set(
    traceRows.map((r) => String(r[m.spanId] ?? '')).filter((id) => id !== '')
  );

  const spans: TraceSpan[] = [];
  let traceEndMs = 0;
  let hasError = false;
  let truncated = false;
  let earliest: { startMs: number; name: string } | undefined;
  let root: { startMs: number; name: string } | undefined;

  for (const r of traceRows) {
    const id = String(r[m.spanId] ?? '');
    if (id === '') {
      continue;
    }
    const startMs = (toMs(r[m.startCol]) ?? traceStartMs) - traceStartMs;
    const durationMs = (toRawNumber(r[m.durationCol]) ?? 0) / m.durationDivisor;
    const parentRaw = m.parentId ? r[m.parentId] : undefined;
    const parentId =
      parentRaw === null || parentRaw === undefined || parentRaw === ''
        ? null
        : String(parentRaw);
    const status = spanStatus(m.status ? r[m.status] : undefined);
    const name = m.name ? String(r[m.name] ?? id) : id;
    spans.push({ id, parentId, name, startMs, durationMs, status });

    hasError ||= status === 'error';
    traceEndMs = Math.max(traceEndMs, startMs + durationMs);
    if (parentId === null || !ids.has(parentId)) {
      truncated ||= parentId !== null;
      if (root === undefined || startMs < root.startMs) {
        root = { startMs, name };
      }
    }
    if (earliest === undefined || startMs < earliest.startMs) {
      earliest = { startMs, name };
    }
  }

  return {
    traceId,
    spans,
    rootName: (root ?? earliest)?.name ?? traceId,
    spanCount: spans.length,
    durationMs: traceEndMs,
    hasError,
    truncated,
  };
}

function toRawNumber(v: unknown): number | undefined {
  if (typeof v === 'number') {
    return v;
  }
  if (typeof v === 'bigint') {
    return Number(v);
  }
  if (typeof v === 'string' && v !== '') {
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

/**
 * Milliseconds since the epoch from the mix OTel timestamps arrive in: ISO
 * strings (Arrow ms timestamps), decimal strings of nanoseconds (Arrow ns
 * timestamps overflow a JS number, so arrive stringified), and plain
 * numbers in either unit.
 */
function toMs(v: unknown): number | undefined {
  if (typeof v === 'number') {
    return v > 1e14 ? v / 1_000_000 : v;
  }
  if (typeof v === 'bigint') {
    return Number(v / 1_000_000n);
  }
  if (typeof v !== 'string' || v === '') {
    return undefined;
  }
  if (/^-?\d+$/.test(v)) {
    // 15+ digits rules out a millisecond epoch, which stays under 1e14 until the year 5138.
    return v.length >= 15 ? Number(BigInt(v) / 1_000_000n) : Number(v);
  }
  const parsed = Date.parse(v);
  if (!Number.isNaN(parsed)) {
    return parsed;
  }
  const n = Number(v);
  if (Number.isNaN(n)) {
    return undefined;
  }
  return n > 1e14 ? n / 1_000_000 : n;
}
