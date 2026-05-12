/**
 * ClickHouse HTTP client for the default OTel exporter schema.
 *
 * Talks to the dev-server proxy at /api/v2/clickhouse → CH HTTP port (8123).
 * Returns rows in JSONCompact form so we don't pay the column-name tax for
 * every row.
 */

const CH_PATH = '/api/v2/clickhouse';
const CH_DATABASE =
  (import.meta.env.VITE_CLICKHOUSE_DATABASE as string | undefined) ?? 'otel';
const CH_TABLE =
  (import.meta.env.VITE_CLICKHOUSE_TRACES_TABLE as string | undefined) ??
  'otel_traces';
const CH_USER = import.meta.env.VITE_CLICKHOUSE_USER as string | undefined;
const CH_PASSWORD = import.meta.env.VITE_CLICKHOUSE_PASSWORD as
  | string
  | undefined;

interface ChJsonResponse<T> {
  meta: Array<{ name: string; type: string }>;
  data: T[];
  rows: number;
  statistics?: { elapsed: number; rows_read: number; bytes_read: number };
}

async function chQuery<TRow = unknown>(
  sql: string,
  params: Record<string, string | number> = {},
): Promise<TRow[]> {
  const search = new URLSearchParams();
  search.set('database', CH_DATABASE);
  search.set('default_format', 'JSON');
  search.set('output_format_json_quote_64bit_integers', '0');
  for (const [k, v] of Object.entries(params)) {
    search.set(`param_${k}`, String(v));
  }
  const headers: Record<string, string> = { 'Content-Type': 'text/plain' };
  if (CH_USER) {
    headers['X-ClickHouse-User'] = CH_USER;
  }
  if (CH_PASSWORD) {
    headers['X-ClickHouse-Key'] = CH_PASSWORD;
  }
  const res = await fetch(`${CH_PATH}/?${search.toString()}`, {
    method: 'POST',
    headers,
    body: sql,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`ClickHouse ${res.status.toString()}: ${detail}`);
  }
  const json = (await res.json()) as ChJsonResponse<TRow>;
  return json.data;
}

/* ── Domain models ───────────────────────────────────────────────────── */

/**
 * One row per agent tree (grouped by `agentm.root_session_id`). For an
 * in-process tree this matches one OTel TraceId; for a cross-process
 * tree linked via W3C TraceContext it also typically matches one
 * TraceId (children inherit parent's trace_id), but we group on the
 * AgentM-logical root_session_id so the row is stable even when the
 * orchestrator's session span hasn't ended yet.
 */
export interface SessionSummary {
  rootSessionId: string;
  /** session_id of the root session (logical AgentM key). */
  sessionId: string;
  /** OTel TraceId — used to fetch the full span set for the detail page. */
  traceId: string;
  serviceName: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number;
  turnCount: number;
  toolCount: number;
  errorCount: number;
  /** Number of distinct agentm.session spans (root + spawned children). */
  sessionCount: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface SpanRow {
  traceId: string;
  spanId: string;
  parentSpanId: string;
  name: string;
  kind: string;
  serviceName: string;
  timestamp: string;
  durationNs: number;
  statusCode: string;
  statusMessage: string;
  attributes: Record<string, string>;
  resourceAttributes: Record<string, string>;
  events: SpanEvent[];
}

export interface SpanEvent {
  timestamp: string;
  name: string;
  attributes: Record<string, string>;
}

interface RawSession {
  TraceId: string;
  root_session_id: string;
  session_id: string;
  ServiceName: string;
  started_at: string;
  ended_at: string | null;
  duration_ns: number;
  turn_count: number;
  tool_count: number;
  error_count: number;
  session_count: number;
  input_tokens: number;
  output_tokens: number;
  model: string;
}

interface RawSpan {
  TraceId: string;
  SpanId: string;
  ParentSpanId: string;
  SpanName: string;
  SpanKind: string;
  ServiceName: string;
  Timestamp: string;
  Duration: number;
  StatusCode: string;
  StatusMessage: string;
  SpanAttributes: Record<string, string>;
  ResourceAttributes: Record<string, string>;
  'Events.Timestamp': string[];
  'Events.Name': string[];
  'Events.Attributes': Array<Record<string, string>>;
}

/* ── Queries ─────────────────────────────────────────────────────────── */

export async function listSessions(opts: {
  limit?: number;
  sinceHours?: number;
  search?: string;
} = {}): Promise<SessionSummary[]> {
  const limit = opts.limit ?? 100;
  const sinceHours = opts.sinceHours ?? 168;
  const search = opts.search?.trim() ?? '';
  // Group by `agentm.root_session_id` so each row represents one whole
  // agent tree (orchestrator + all in-process / cross-process children).
  // Reading from arbitrary spans (not just SpanName='agentm.session') means
  // in-flight trees show up immediately, before the orchestrator's session
  // span has ended.
  const searchClause = search
    ? `AND (positionCaseInsensitive(SpanAttributes['agentm.root_session_id'], {search:String}) > 0
          OR positionCaseInsensitive(TraceId, {search:String}) > 0
          OR positionCaseInsensitive(ServiceName, {search:String}) > 0)`
    : '';
  // Group by TraceId. With standard W3C propagation, every span in one
  // agent tree (orchestrator + in-process children + cross-process
  // children whose embedder set TRACEPARENT) shares one TraceId, so
  // grouping at this level captures the whole tree correctly without
  // needing every span to carry agentm.* attributes.
  // root_session_id / session_id / model are projected from the session
  // spans that DO carry the relevant attributes.
  const sql = `
SELECT
  TraceId,
  anyIf(SpanAttributes['agentm.root_session_id'],
        SpanAttributes['agentm.root_session_id'] != '') AS root_session_id,
  -- Prefer the root agentm.session span_id (parent_session_id == ''),
  -- falling back to whatever children claim as parent for the
  -- in-flight case where the root span hasn't ended yet.
  coalesce(
    nullIf(anyIf(SpanAttributes['agentm.session_id'],
                 SpanName = 'agentm.session'
                 AND SpanAttributes['agentm.parent_session_id'] = ''), ''),
    nullIf(anyIf(SpanAttributes['agentm.parent_session_id'],
                 SpanAttributes['agentm.parent_session_id'] != ''), ''),
    anyIf(SpanAttributes['agentm.session_id'],
          SpanName = 'agentm.session')
  )                                                      AS session_id,
  any(ServiceName)                                       AS ServiceName,
  formatDateTime(min(Timestamp), '%Y-%m-%dT%H:%i:%S.%fZ', 'UTC')                AS started_at,
  formatDateTime(max(Timestamp + toIntervalNanosecond(Duration)), '%Y-%m-%dT%H:%i:%S.%fZ', 'UTC') AS ended_at,
  dateDiff('nanosecond', min(Timestamp), max(Timestamp + toIntervalNanosecond(Duration))) AS duration_ns,
  countIf(SpanName = 'agentm.turn')                      AS turn_count,
  countIf(SpanName = 'agentm.tool.execute')              AS tool_count,
  countIf(StatusCode = 'STATUS_CODE_ERROR')              AS error_count,
  countIf(SpanName = 'agentm.session')                   AS session_count,
  sum(toUInt64OrZero(SpanAttributes['gen_ai.usage.input_tokens']))  AS input_tokens,
  sum(toUInt64OrZero(SpanAttributes['gen_ai.usage.output_tokens'])) AS output_tokens,
  anyIf(SpanAttributes['gen_ai.request.model'],
        SpanAttributes['gen_ai.request.model'] != '')                AS model
FROM ${CH_TABLE}
WHERE Timestamp >= now() - toIntervalHour({sinceHours:UInt32})
  ${searchClause}
GROUP BY TraceId
HAVING root_session_id != ''
ORDER BY started_at DESC
LIMIT {limit:UInt32}
FORMAT JSON`;

  const rows = await chQuery<RawSession>(sql, {
    limit,
    sinceHours,
    ...(search ? { search } : {}),
  });
  return rows.map((r) => ({
    rootSessionId: r.root_session_id,
    sessionId: r.session_id,
    traceId: r.TraceId,
    serviceName: r.ServiceName,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    durationMs: r.duration_ns / 1_000_000,
    turnCount: Number(r.turn_count),
    toolCount: Number(r.tool_count),
    errorCount: Number(r.error_count),
    sessionCount: Number(r.session_count),
    inputTokens: Number(r.input_tokens),
    outputTokens: Number(r.output_tokens),
    model: r.model || '—',
  }));
}

export async function listSpansByRootSession(
  rootSessionId: string,
  opts: { sinceHours?: number } = {},
): Promise<SpanRow[]> {
  const sinceHours = opts.sinceHours ?? 720; // 30d window for detail
  // Two-step: first resolve the set of TraceIds carrying this
  // root_session_id (cross-process trees may span multiple), then fetch
  // all their spans via the TraceId primary key. Doing it as one query
  // with a subquery lets ClickHouse use the trace-id index for the
  // outer scan instead of map-attribute filtering across the whole
  // partition.
  const sql = `
SELECT
  TraceId, SpanId, ParentSpanId, SpanName, SpanKind, ServiceName,
  formatDateTime(Timestamp, '%Y-%m-%dT%H:%i:%S.%fZ', 'UTC') AS Timestamp,
  Duration, StatusCode, StatusMessage,
  SpanAttributes, ResourceAttributes,
  Events.Timestamp, Events.Name, Events.Attributes
FROM ${CH_TABLE}
WHERE TraceId IN (
  SELECT DISTINCT TraceId FROM ${CH_TABLE}
  WHERE SpanAttributes['agentm.root_session_id'] = {rootSessionId:String}
    AND Timestamp >= now() - toIntervalHour({sinceHours:UInt32})
)
ORDER BY Timestamp ASC
LIMIT 50000
FORMAT JSON`;
  const rows = await chQuery<RawSpan>(sql, { rootSessionId, sinceHours });
  return rows.map((r) => {
    const evTs = r['Events.Timestamp'];
    const evName = r['Events.Name'];
    const evAttr = r['Events.Attributes'];
    const events: SpanEvent[] = evTs.map((t, i) => ({
      timestamp: t,
      name: evName[i] ?? '',
      attributes: evAttr[i] ?? {},
    }));
    return {
      traceId: r.TraceId,
      spanId: r.SpanId,
      parentSpanId: r.ParentSpanId,
      name: r.SpanName,
      kind: r.SpanKind,
      serviceName: r.ServiceName,
      timestamp: r.Timestamp,
      durationNs: Number(r.Duration),
      statusCode: r.StatusCode,
      statusMessage: r.StatusMessage,
      attributes: r.SpanAttributes,
      resourceAttributes: r.ResourceAttributes,
      events,
    };
  });
}
