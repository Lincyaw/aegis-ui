/**
 * ClickHouse HTTP client for the default OTel exporter schema.
 *
 * Endpoint comes from runtime config — empty defaults to the dev-server
 * proxy at /api/v2/clickhouse → CH HTTP port (8123).
 * Returns rows in JSON form so we don't pay the column-name tax for
 * every row.
 */
import { apiFetch } from '../../../api/apiClient';
import { clickhouseBase, getRuntimeConfig } from '../../../config/runtime';

interface ChJsonResponse<T> {
  meta: Array<{ name: string; type: string }>;
  data: T[];
  rows: number;
  statistics?: { elapsed: number; rows_read: number; bytes_read: number };
}

async function chQuery<TRow = unknown>(
  sql: string,
  params: Record<string, string | number | boolean> = {}
): Promise<TRow[]> {
  const cfg = getRuntimeConfig();
  const search = new URLSearchParams();
  search.set('database', cfg.clickhouseDatabase);
  search.set('default_format', 'JSON');
  search.set('output_format_json_quote_64bit_integers', '0');
  for (const [k, v] of Object.entries(params)) {
    search.set(`param_${k}`, String(v));
  }
  const headers: Record<string, string> = { 'Content-Type': 'text/plain' };
  if (cfg.clickhouseUser) {
    headers['X-ClickHouse-User'] = cfg.clickhouseUser;
  }
  if (cfg.clickhousePassword) {
    headers['X-ClickHouse-Key'] = cfg.clickhousePassword;
  }
  const path = `${clickhouseBase()}/?${search.toString()}`;
  // Route through apiFetch when going via the gateway proxy so the SSO
  // bearer + gateway base prefix are attached uniformly. For an
  // absolute direct ClickHouse URL skip the wrapper — it would prefix
  // the gateway base and clobber the host.
  const isAbsolute = /^https?:\/\//i.test(path);
  const res = isAbsolute
    ? await fetch(path, { method: 'POST', headers, body: sql })
    : await apiFetch(path, { method: 'POST', headers, body: sql });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`ClickHouse ${res.status.toString()}: ${detail}`);
  }
  const json = (await res.json()) as ChJsonResponse<TRow>;
  return json.data;
}

/* ── Domain models ───────────────────────────────────────────────────── */

export interface SessionRow {
  sessionId: string;
  rootSessionId: string;
  parentSessionId: string;
  purpose: string;
  scenario: string;
  lineageKind: string;
  sourceSessionId: string;
  forkMessageId: string;
  forkTurnIndex: string;
  startedAt: string;
  turnCount: number;
  toolCount: number;
  errorCount: number;
  inputTokens: number;
  outputTokens: number;
}

export interface SessionMessage {
  type: string;
  id: string;
  parentId: string | null;
  timestamp: number;
  payload: {
    role: string;
    content: unknown[];
  };
  raw: Record<string, unknown>;
}

export interface ToolCallRow {
  tool: string;
  spanId: string;
  startTimeUnixNano: number | null;
  endTimeUnixNano: number | null;
  durationMs: number;
  statusCode: string;
  statusMessage: string;
  args: unknown;
  result: unknown;
  attributes: Record<string, string>;
}

interface RawSessionRow {
  session_id: string;
  'starts.session_id'?: string;
  root_session_id: string;
  'starts.root_session_id'?: string;
  parent_session_id: string;
  'starts.parent_session_id'?: string;
  purpose: string;
  'starts.purpose'?: string;
  scenario: string;
  'starts.scenario'?: string;
  lineage_kind: string;
  'starts.lineage_kind'?: string;
  source_session_id: string;
  'starts.source_session_id'?: string;
  fork_message_id: string;
  'starts.fork_message_id'?: string;
  fork_turn_index: string;
  'starts.fork_turn_index'?: string;
  started_at: string;
  'starts.started_at'?: string;
  turn_count: number;
  tool_count: number;
  error_count: number;
  input_tokens: number;
  output_tokens: number;
}

interface RawLogBodyRow {
  EventName: string;
  Body: unknown;
  timestamp_ns: number;
}

interface RawToolCall {
  SpanName: string;
  SpanId: string;
  SpanAttributes: Record<string, string>;
  Duration: number;
  StatusCode: string;
  StatusMessage: string;
  start_ns: number;
}

function rawSessionString(
  row: RawSessionRow,
  key: keyof RawSessionRow,
  fallbackKey?: keyof RawSessionRow
): string {
  const value = row[key] ?? (fallbackKey ? row[fallbackKey] : undefined);
  return value == null ? '' : String(value);
}

function rawSessionNumber(
  row: RawSessionRow,
  key: keyof RawSessionRow
): number {
  const value = Number(row[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function mapSessionRow(r: RawSessionRow): SessionRow {
  return {
    sessionId: rawSessionString(r, 'session_id', 'starts.session_id'),
    rootSessionId: rawSessionString(
      r,
      'root_session_id',
      'starts.root_session_id'
    ),
    parentSessionId: rawSessionString(
      r,
      'parent_session_id',
      'starts.parent_session_id'
    ),
    purpose: rawSessionString(r, 'purpose', 'starts.purpose'),
    scenario: rawSessionString(r, 'scenario', 'starts.scenario'),
    lineageKind: rawSessionString(r, 'lineage_kind', 'starts.lineage_kind'),
    sourceSessionId: rawSessionString(
      r,
      'source_session_id',
      'starts.source_session_id'
    ),
    forkMessageId: rawSessionString(
      r,
      'fork_message_id',
      'starts.fork_message_id'
    ),
    forkTurnIndex: rawSessionString(
      r,
      'fork_turn_index',
      'starts.fork_turn_index'
    ),
    startedAt: rawSessionString(r, 'started_at', 'starts.started_at'),
    turnCount: rawSessionNumber(r, 'turn_count'),
    toolCount: rawSessionNumber(r, 'tool_count'),
    errorCount: rawSessionNumber(r, 'error_count'),
    inputTokens: rawSessionNumber(r, 'input_tokens'),
    outputTokens: rawSessionNumber(r, 'output_tokens'),
  };
}

function parseJsonString(raw: string): unknown {
  const trimmed = raw.trim();
  const startsWithJson =
    trimmed.startsWith('{') ||
    trimmed.startsWith('[') ||
    trimmed.startsWith('"{') ||
    trimmed.startsWith('"[');
  if (!startsWithJson) {
    return raw;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return raw;
  }
}

function deepParseJsonStrings(value: unknown, depth = 0): unknown {
  if (depth >= 8) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseJsonString(value);
    return parsed === value ? value : deepParseJsonStrings(parsed, depth + 1);
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepParseJsonStrings(item, depth + 1));
  }
  if (value != null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        deepParseJsonStrings(item, depth + 1),
      ])
    );
  }
  return value;
}

function parseBody(raw: unknown): unknown {
  if (typeof raw !== 'string') {
    return deepParseJsonStrings(raw);
  }
  return deepParseJsonStrings(parseJsonString(raw));
}

function tryJson(raw: string | undefined): unknown {
  if (!raw) {
    return null;
  }
  return deepParseJsonStrings(parseJsonString(raw));
}

function normalizeMessageBody(
  body: unknown,
  timestampNs: number
): SessionMessage | null {
  if (body == null || typeof body !== 'object') {
    return null;
  }
  const obj = body as Record<string, unknown>;
  const payloadRaw = obj.payload;
  if (payloadRaw == null || typeof payloadRaw !== 'object') {
    return null;
  }
  const payloadObj = payloadRaw as Record<string, unknown>;
  const content = Array.isArray(payloadObj.content)
    ? (payloadObj.content as unknown[])
    : typeof payloadObj.content === 'string'
      ? [{ type: 'text', text: payloadObj.content }]
      : [];
  return {
    type: typeof obj.type === 'string' ? obj.type : 'message',
    id: typeof obj.id === 'string' ? obj.id : '',
    parentId: typeof obj.parent_id === 'string' ? obj.parent_id : null,
    timestamp:
      typeof obj.timestamp === 'number' ? obj.timestamp : timestampNs / 1e9,
    payload: {
      role: typeof payloadObj.role === 'string' ? payloadObj.role : 'user',
      content,
    },
    raw: obj,
  };
}

/* ── Queries ─────────────────────────────────────────────────────────── */

export interface ListSessionsOpts {
  limit?: number;
  sinceHours?: number;
  /** Pre-compiled SQL WHERE fragment (without the leading WHERE/AND). */
  whereSql?: string;
  /** Bound parameters keyed to match {name:Type} refs inside whereSql. */
  whereParams?: Record<string, string | number | boolean>;
}

export async function listSessionRows(
  opts: ListSessionsOpts = {}
): Promise<SessionRow[]> {
  const limit = opts.limit ?? 500;
  const sinceHours = opts.sinceHours ?? 168;
  const whereSql = opts.whereSql?.trim() ?? '';
  const whereParams = opts.whereParams ?? {};
  const logsTbl = getRuntimeConfig().clickhouseLogsTable;
  const tracesTbl = getRuntimeConfig().clickhouseTracesTable;
  const searchClause = whereSql ? `AND (${whereSql})` : '';
  const sql = `
WITH starts AS (
  SELECT
    LogAttributes['agentm.session.id'] AS session_id,
    LogAttributes['agentm.session.root_id'] AS root_session_id,
    LogAttributes['agentm.session.parent_id'] AS parent_session_id,
    LogAttributes['agentm.session.purpose'] AS purpose,
    LogAttributes['agentm.session.scenario'] AS scenario,
    LogAttributes['agentm.session.lineage.kind'] AS lineage_kind,
    LogAttributes['agentm.session.lineage.source_session_id'] AS source_session_id,
    LogAttributes['agentm.session.lineage.fork.message_id'] AS fork_message_id,
    LogAttributes['agentm.session.lineage.fork.turn_index'] AS fork_turn_index,
    formatDateTime(Timestamp, '%Y-%m-%dT%H:%i:%S.%fZ', 'UTC') AS started_at
  FROM ${logsTbl}
  WHERE EventName = 'agentm.session.start'
    AND Timestamp >= now() - toIntervalHour({sinceHours:UInt32})
    ${searchClause}
  ORDER BY Timestamp DESC
  LIMIT {limit:UInt32}
),
turns AS (
  SELECT
    LogAttributes['agentm.session.id'] AS session_id,
    count() AS turn_count,
    sum(toUInt64OrZero(JSONExtractString(Body, 'input_tokens'))) AS input_tokens,
    sum(toUInt64OrZero(JSONExtractString(Body, 'output_tokens'))) AS output_tokens
  FROM ${logsTbl}
  WHERE EventName = 'agentm.turn.summary'
    AND Timestamp >= now() - toIntervalHour({sinceHours:UInt32})
  GROUP BY session_id
),
tools AS (
  SELECT
    SpanAttributes['agentm.session.id'] AS session_id,
    count() AS tool_count,
    countIf(StatusCode = 'STATUS_CODE_ERROR') AS error_count
  FROM ${tracesTbl}
  WHERE startsWith(SpanName, 'execute_tool ')
    AND Timestamp >= now() - toIntervalHour({sinceHours:UInt32})
  GROUP BY session_id
)
SELECT
  starts.session_id AS session_id,
  starts.root_session_id AS root_session_id,
  starts.parent_session_id AS parent_session_id,
  starts.purpose AS purpose,
  starts.scenario AS scenario,
  starts.lineage_kind AS lineage_kind,
  starts.source_session_id AS source_session_id,
  starts.fork_message_id AS fork_message_id,
  starts.fork_turn_index AS fork_turn_index,
  starts.started_at AS started_at,
  coalesce(turns.turn_count, 0) AS turn_count,
  coalesce(tools.tool_count, 0) AS tool_count,
  coalesce(tools.error_count, 0) AS error_count,
  coalesce(turns.input_tokens, 0) AS input_tokens,
  coalesce(turns.output_tokens, 0) AS output_tokens
FROM starts
LEFT JOIN turns USING(session_id)
LEFT JOIN tools USING(session_id)
ORDER BY started_at DESC
FORMAT JSON`;

  const rows = await chQuery<RawSessionRow>(sql, {
    limit,
    sinceHours,
    ...whereParams,
  });
  return rows.map(mapSessionRow);
}

export async function getSessionRow(
  sessionId: string
): Promise<SessionRow | null> {
  const logsTbl = getRuntimeConfig().clickhouseLogsTable;
  const tracesTbl = getRuntimeConfig().clickhouseTracesTable;
  const sql = `
WITH starts AS (
  SELECT
    LogAttributes['agentm.session.id'] AS session_id,
    LogAttributes['agentm.session.root_id'] AS root_session_id,
    LogAttributes['agentm.session.parent_id'] AS parent_session_id,
    LogAttributes['agentm.session.purpose'] AS purpose,
    LogAttributes['agentm.session.scenario'] AS scenario,
    LogAttributes['agentm.session.lineage.kind'] AS lineage_kind,
    LogAttributes['agentm.session.lineage.source_session_id'] AS source_session_id,
    LogAttributes['agentm.session.lineage.fork.message_id'] AS fork_message_id,
    LogAttributes['agentm.session.lineage.fork.turn_index'] AS fork_turn_index,
    formatDateTime(Timestamp, '%Y-%m-%dT%H:%i:%S.%fZ', 'UTC') AS started_at
  FROM ${logsTbl}
  WHERE EventName = 'agentm.session.start'
    AND LogAttributes['agentm.session.id'] = {sessionId:String}
  ORDER BY Timestamp DESC
  LIMIT 1
),
turns AS (
  SELECT
    LogAttributes['agentm.session.id'] AS session_id,
    count() AS turn_count,
    sum(toUInt64OrZero(JSONExtractString(Body, 'input_tokens'))) AS input_tokens,
    sum(toUInt64OrZero(JSONExtractString(Body, 'output_tokens'))) AS output_tokens
  FROM ${logsTbl}
  WHERE EventName = 'agentm.turn.summary'
    AND LogAttributes['agentm.session.id'] = {sessionId:String}
  GROUP BY session_id
),
tools AS (
  SELECT
    SpanAttributes['agentm.session.id'] AS session_id,
    count() AS tool_count,
    countIf(StatusCode = 'STATUS_CODE_ERROR') AS error_count
  FROM ${tracesTbl}
  WHERE startsWith(SpanName, 'execute_tool ')
    AND SpanAttributes['agentm.session.id'] = {sessionId:String}
  GROUP BY session_id
)
SELECT
  starts.session_id AS session_id,
  starts.root_session_id AS root_session_id,
  starts.parent_session_id AS parent_session_id,
  starts.purpose AS purpose,
  starts.scenario AS scenario,
  starts.lineage_kind AS lineage_kind,
  starts.source_session_id AS source_session_id,
  starts.fork_message_id AS fork_message_id,
  starts.fork_turn_index AS fork_turn_index,
  starts.started_at AS started_at,
  coalesce(turns.turn_count, 0) AS turn_count,
  coalesce(tools.tool_count, 0) AS tool_count,
  coalesce(tools.error_count, 0) AS error_count,
  coalesce(turns.input_tokens, 0) AS input_tokens,
  coalesce(turns.output_tokens, 0) AS output_tokens
FROM starts
LEFT JOIN turns USING(session_id)
LEFT JOIN tools USING(session_id)
FORMAT JSON`;
  const rows = await chQuery<RawSessionRow>(sql, { sessionId });
  return rows.length > 0 ? mapSessionRow(rows[0]) : null;
}

export async function listMessagesBySession(
  sessionId: string
): Promise<SessionMessage[]> {
  const logsTbl = getRuntimeConfig().clickhouseLogsTable;
  const systemSql = `
SELECT EventName, Body, toUnixTimestamp64Nano(Timestamp) AS timestamp_ns
FROM ${logsTbl}
WHERE EventName = 'agentm.llm.system_prompt'
  AND LogAttributes['agentm.session.id'] = {sessionId:String}
ORDER BY Timestamp ASC
LIMIT 1
FORMAT JSON`;
  const messageSql = `
SELECT EventName, Body, toUnixTimestamp64Nano(Timestamp) AS timestamp_ns
FROM ${logsTbl}
WHERE EventName = 'agentm.message.appended'
  AND LogAttributes['agentm.session.id'] = {sessionId:String}
ORDER BY Timestamp ASC
LIMIT 10000
FORMAT JSON`;
  const [systemRows, messageRows] = await Promise.all([
    chQuery<RawLogBodyRow>(systemSql, { sessionId }),
    chQuery<RawLogBodyRow>(messageSql, { sessionId }),
  ]);
  const out: SessionMessage[] = [];
  const system = systemRows[0];
  if (system) {
    const body = parseBody(system.Body);
    const text =
      body != null && typeof body === 'object'
        ? String((body as Record<string, unknown>).text ?? '')
        : '';
    if (text) {
      out.push({
        type: 'message',
        id: 'system-prompt-turn0',
        parentId: null,
        timestamp: Number(system.timestamp_ns) / 1e9,
        payload: {
          role: 'system',
          content: [{ type: 'text', text }],
        },
        raw: {
          type: 'message',
          id: 'system-prompt-turn0',
          payload: {
            role: 'system',
            content: [{ type: 'text', text }],
          },
        },
      });
    }
  }
  for (const row of messageRows) {
    const normalized = normalizeMessageBody(
      parseBody(row.Body),
      Number(row.timestamp_ns)
    );
    if (normalized) {
      out.push(normalized);
    }
  }
  return out;
}

export async function listToolsBySession(
  sessionId: string
): Promise<ToolCallRow[]> {
  const tracesTbl = getRuntimeConfig().clickhouseTracesTable;
  const sql = `
SELECT
  SpanName,
  SpanId,
  SpanAttributes,
  Duration,
  StatusCode,
  StatusMessage,
  toUnixTimestamp64Nano(Timestamp) AS start_ns
FROM ${tracesTbl}
WHERE startsWith(SpanName, 'execute_tool ')
  AND SpanAttributes['agentm.session.id'] = {sessionId:String}
ORDER BY Timestamp ASC
LIMIT 10000
FORMAT JSON`;
  const rows = await chQuery<RawToolCall>(sql, { sessionId });
  return rows.map((r) => {
    const attrs = r.SpanAttributes;
    const tool =
      attrs['gen_ai.tool.name'] ??
      r.SpanName.replace(/^execute_tool\s+/, '').trim();
    const startNs = Number(r.start_ns);
    const durationNs = Number(r.Duration);
    return {
      tool,
      spanId: r.SpanId,
      startTimeUnixNano: Number.isFinite(startNs) ? startNs : null,
      endTimeUnixNano:
        Number.isFinite(startNs) && Number.isFinite(durationNs)
          ? startNs + durationNs
          : null,
      durationMs: Number.isFinite(durationNs) ? durationNs / 1_000_000 : 0,
      statusCode: r.StatusCode,
      statusMessage: r.StatusMessage,
      args: tryJson(attrs['gen_ai.tool.call.arguments']),
      result: tryJson(attrs['gen_ai.tool.call.result']),
      attributes: attrs,
    };
  });
}
