/**
 * Shape checks for the files of a case directory. Cases come from folders
 * the user picks, so a file that does not match its schema is an expected
 * input: it is rejected here with the file and field named, before any pane
 * reads a missing field.
 */
import type {
  AuditorFiring,
  CaseMeta,
  CaseSummary,
  DroppedRow,
  ExtractorFiring,
  FiringPhase,
  GraphSnapshot,
  MainTurn,
  SftRow,
} from './schemas';

/** A case file that is not valid JSON or does not match its schema. */
export class CaseFileError extends Error {
  readonly source: string;

  constructor(source: string, detail: string) {
    super(`${source} is malformed: ${detail}`);
    this.name = 'CaseFileError';
    this.source = source;
  }
}

class ShapeError extends Error {}

type Check<T> = (value: unknown, at: string) => T;

function fail(at: string, expected: string): never {
  throw new ShapeError(`${at} should be ${expected}`);
}

function record(value: unknown, at: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(at, 'an object');
  }
  return value as Record<string, unknown>;
}

function list(value: unknown, at: string): unknown[] {
  if (!Array.isArray(value)) {
    fail(at, 'an array');
  }
  return value;
}

const num: Check<number> = (value, at) =>
  typeof value === 'number' ? value : fail(at, 'a number');

const str: Check<string> = (value, at) =>
  typeof value === 'string' ? value : fail(at, 'a string');

const bool: Check<boolean> = (value, at) =>
  typeof value === 'boolean' ? value : fail(at, 'true or false');

function optional<T>(check: Check<T>): Check<T | undefined> {
  return (value, at) => (value === undefined ? undefined : check(value, at));
}

function nullable<T>(check: Check<T>): Check<T | null | undefined> {
  return (value, at) =>
    value === null || value === undefined ? value : check(value, at);
}

function each<T>(check: Check<T>): Check<T[]> {
  return (value, at) =>
    list(value, at).map((item, i) => check(item, `${at}[${i.toString()}]`));
}

function fields(
  value: unknown,
  at: string,
  checks: Record<string, Check<unknown>>
): Record<string, unknown> {
  const obj = record(value, at);
  for (const [key, check] of Object.entries(checks)) {
    check(obj[key], `${at}.${key}`);
  }
  return obj;
}

function shape(checks: Record<string, Check<unknown>>): Check<unknown> {
  return (value, at) => fields(value, at, checks);
}

const mainTurn = shape({
  index: num,
  role: str,
  content: (value, at) =>
    typeof value === 'string' ? value : each(record)(value, at),
});

const extractorEvent = shape({
  id: num,
  kind: str,
  summary: str,
  source_turns: each(num),
  refs: optional(each(shape({ dst: num, kind: str }))),
});

const graphEdge = shape({ src: num, dst: num, kind: str });

const firingCommon = {
  sequence: num,
  turn_index: num,
  status: str,
  error: nullable(str),
};

function phaseIs(phase: FiringPhase): Check<string> {
  return (value, at) => (value === phase ? phase : fail(at, `"${phase}"`));
}

const extractorFiring = shape({
  ...firingCommon,
  phase: phaseIs('extractor'),
  input: shape({ payload: shape({ new_turns: each(mainTurn) }) }),
  output: nullable(
    shape({
      events: each(extractorEvent),
      edges: each(graphEdge),
      dropped_edges: each(shape({ reason: str })),
    })
  ),
});

const auditorFiring = shape({
  ...firingCommon,
  phase: phaseIs('auditor'),
  input: shape({
    graph_snapshot_ref: num,
    findings: each(
      shape({
        index: num,
        kind: str,
        summary: str,
        related_event_ids: each(num),
      })
    ),
  }),
  output: nullable(
    shape({
      surface_reminder: bool,
      reminder_text: optional(str),
      matched_event_ids: optional(each(num)),
    })
  ),
});

const caseMeta = shape({
  case_id: str,
  root_session_id: str,
  sample_id: nullable(str),
  dataset_name: nullable(str),
  started_at_ns: num,
  ended_at_ns: num,
  extractor_firings: num,
  auditor_firings: num,
  surfaced_reminders: num,
});

const graphSnapshot = shape({
  after_extractor_firing: num,
  turn_index: num,
  events: each(extractorEvent),
  edges: each(graphEdge),
});

const sftRow = shape({
  phase: str,
  sample_id: str,
  root_session_id: str,
  turn_index: num,
  input: shape({ system: str, user: str }),
  target: shape({ tool_calls: each(shape({ name: str })) }),
});

const droppedRow = shape({
  sample_id: optional(str),
  root_session_id: optional(str),
  turn_index: optional(num),
  drop_reason: optional(str),
});

function checked<T>(source: string, check: Check<unknown>, value: unknown): T {
  try {
    check(value, '$');
  } catch (err) {
    if (err instanceof ShapeError) {
      throw new CaseFileError(source, err.message);
    }
    throw err;
  }
  return value as T;
}

function parseJson(source: string, text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (err) {
    throw new CaseFileError(
      source,
      err instanceof Error ? err.message : 'invalid JSON'
    );
  }
}

function rowsOf<T>(source: string, check: Check<unknown>, text: string): T[] {
  const rows: T[] = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (line) {
      const at = `${source} line ${(i + 1).toString()}`;
      rows.push(checked<T>(at, check, parseJson(at, line)));
    }
  });
  return rows;
}

export const validate = {
  meta: (source: string, value: unknown): CaseMeta =>
    checked(source, caseMeta, value),
  firing: (
    source: string,
    phase: FiringPhase,
    value: unknown
  ): ExtractorFiring | AuditorFiring =>
    checked(
      source,
      phase === 'extractor' ? extractorFiring : auditorFiring,
      value
    ),
  snapshot: (source: string, value: unknown): GraphSnapshot =>
    checked(source, graphSnapshot, value),
  mainTurns: (source: string, value: unknown): MainTurn[] =>
    checked(source, each(mainTurn), value),
  sftRows: (source: string, value: unknown): SftRow[] =>
    checked(source, each(sftRow), value),
  droppedRows: (source: string, value: unknown): DroppedRow[] =>
    checked(source, each(droppedRow), value),
  caseList: (source: string, value: unknown): CaseSummary[] =>
    checked<{ cases: Array<{ case_id: string; meta: CaseMeta }> }>(
      source,
      shape({ cases: each(shape({ case_id: str, meta: caseMeta })) }),
      value
    ).cases.map((c) => ({ caseId: c.case_id, meta: c.meta })),
  fileNames: (source: string, value: unknown): string[] =>
    checked<{ files: string[] }>(source, shape({ files: each(str) }), value)
      .files,
  sftBundle: (
    source: string,
    value: unknown
  ): { extractor: SftRow[]; auditor: SftRow[]; dropped: DroppedRow[] } =>
    checked(
      source,
      shape({
        extractor: each(sftRow),
        auditor: each(sftRow),
        dropped: each(droppedRow),
      }),
      value
    ),
};

export const parse = {
  json: parseJson,
  meta: (source: string, text: string): CaseMeta =>
    validate.meta(source, parseJson(source, text)),
  firing: (
    source: string,
    phase: FiringPhase,
    text: string
  ): ExtractorFiring | AuditorFiring =>
    validate.firing(source, phase, parseJson(source, text)),
  snapshot: (source: string, text: string): GraphSnapshot =>
    validate.snapshot(source, parseJson(source, text)),
  mainTurns: (source: string, text: string): MainTurn[] =>
    rowsOf(source, mainTurn, text),
  sftRows: (source: string, text: string): SftRow[] =>
    rowsOf(source, sftRow, text),
  droppedRows: (source: string, text: string): DroppedRow[] =>
    rowsOf(source, droppedRow, text),
};
