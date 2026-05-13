/**
 * Type contracts for a llmharness case directory. Mirror the schemas in
 * contrib/extensions/llmharness/docs/02-schemas.md and the on-disk layout
 * documented in 06-case-aggregation.md.
 *
 * Kept loose where the harness payload is intentionally open-ended
 * (events / edges / findings / output blobs).
 */

export interface CaseMeta {
  case_id: string;
  root_session_id: string;
  sample_id: string | null;
  dataset_name: string | null;
  dataset_path: string | null;
  started_at_ns: number;
  ended_at_ns: number;
  extractor_firings: number;
  auditor_firings: number;
  surfaced_reminders: number;
  silent_verdicts: number;
}

export type FiringPhase = 'extractor' | 'auditor';
export type FiringStatus = 'ok' | 'no_call' | 'spawn_error' | 'prompt_error';

export interface FiringFile {
  phase: FiringPhase;
  sequence: number;
  turn_index: number;
  ts_ns: number;
  status: FiringStatus;
  error: string | null;
  latency_ms: number;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
}

export interface VerdictRow {
  sequence: number;
  turn_index: number;
  ts_ns: number;
  surface_reminder: boolean;
  reminder_text?: string;
  matched_event_ids?: number[];
  continuation_notes?: string[];
  cited_cards?: unknown[];
  [k: string]: unknown;
}

export interface TrajectoryRow {
  ts_ns: number;
  source: FiringPhase;
  sequence: number;
  turn_index: number;
  summary: string;
  ref: string;
}

export interface MainAgentMessage {
  index?: number;
  role: 'user' | 'assistant' | 'system' | 'tool' | string;
  content: unknown;
  [k: string]: unknown;
}

/** A row in the case-list view; backed by meta.json. */
export interface CaseSummary {
  caseId: string;
  meta: CaseMeta;
}

// --- Graph types (extractor output + cumulative snapshot) ------------------

export type EventKind = 'task' | 'hyp' | 'evid' | 'act' | 'dec' | 'concl' | string;
export type EdgeKind = 'data' | 'ref' | string;

export interface GraphEvent {
  id: number;
  kind: EventKind;
  summary: string;
  source_turns: number[];
  [k: string]: unknown;
}

export interface GraphEdge {
  src: number;
  dst: number;
  kind: EdgeKind;
  reason?: string;
  src_turns?: number[];
  dst_turns?: number[];
  cited_entities?: string[];
  [k: string]: unknown;
}

/** Mirrors event_graph/after_extractor_NNN.json on disk. */
export interface GraphSnapshotFile {
  after_extractor_firing: number;
  turn_index: number;
  events: GraphEvent[];
  edges: GraphEdge[];
}

// --- SFT rows --------------------------------------------------------------

export interface SftToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface SftRowBase {
  phase: 'extractor' | 'auditor';
  sample_id: string;
  root_session_id: string;
  turn_index: number;
  input: {
    system: string;
    user: string;
  };
  target: {
    tool_calls: SftToolCall[];
  };
  meta?: Record<string, unknown>;
}

export interface DroppedRow {
  /** Schema is the Stage-1 label row; audit-only. Kept loose. */
  sample_id?: string;
  root_session_id?: string;
  turn_index?: number;
  drop_reason?: string;
  [k: string]: unknown;
}
