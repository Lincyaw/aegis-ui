/**
 * Wire-protocol types for the AgentM ``live_inspector`` atom (schema_version
 * 1). The source of truth lives in
 * ``contrib/extensions/live_inspector/__init__.py`` in the AgentM repo;
 * keep this file in sync with that module's docstring.
 *
 * The reducer below folds a stream of frames into the in-memory state the
 * UI renders. It is intentionally pure (no fetch, no timers, no globals)
 * so the Zustand store can apply it from the WS ``onmessage`` callback
 * and tests can replay canned sequences.
 */

// ── Wire frames (server → client) ──────────────────────────────────────

export interface HelloFrame {
  type: 'hello';
  root_session_id: string;
  schema_version: number;
}

export interface SessionStartedFrame {
  type: 'session_started';
  session_id: string;
  parent_session_id: string | null;
  purpose: string;
  cwd: string;
  ts: number;
}

export interface SessionEndedFrame {
  type: 'session_ended';
  session_id: string;
  ts: number;
}

export interface EventFrame {
  type: 'event';
  session_id: string;
  ts: number;
  kind: string;
  channel?: string;
  payload: Record<string, unknown>;
}

export interface EntryFrame {
  type: 'entry';
  session_id: string;
  ts: number;
  entry_type: string;
  entry_id?: string;
  parent_id?: string | null;
  payload: Record<string, unknown>;
}

export interface BacklogDoneFrame {
  type: 'backlog_done';
}

export type Frame =
  | HelloFrame
  | SessionStartedFrame
  | SessionEndedFrame
  | EventFrame
  | EntryFrame
  | BacklogDoneFrame;

export const SUPPORTED_SCHEMA_VERSION = 1;

// Purposes the UI specialises on. Anything else falls back to the
// "main / sub-agent" view.
export const PURPOSE_EXTRACTOR = 'cognitive_audit_extractor';
export const PURPOSE_AUDITOR = 'cognitive_audit_auditor';

// ── Reducer state ──────────────────────────────────────────────────────

export interface SessionNode {
  id: string;
  parent_id: string | null;
  purpose: string;
  cwd: string;
  started_ts: number;
  ended_ts: number | null;
}

/**
 * One ordered item on a session's timeline. We keep both source kinds
 * in the same array so the UI can render an interleaved transcript;
 * ``source`` is the discriminator.
 */
export type TimelineItem =
  | {
      source: 'event';
      session_id: string;
      ts: number;
      kind: string;
      payload: Record<string, unknown>;
    }
  | {
      source: 'entry';
      session_id: string;
      ts: number;
      entry_type: string;
      payload: Record<string, unknown>;
    };

export interface InspectState {
  rootSessionId: string | null;
  /** Frames received before ``backlog_done`` are tagged as backlog. */
  isReplayingBacklog: boolean;
  schemaMismatch: boolean;
  sessions: Map<string, SessionNode>;
  /** parent_id → child ids, ordered by ``started_ts`` ascending. */
  childrenByParent: Map<string | null, string[]>;
  /** session_id → bounded ring-buffer of timeline items. */
  timelinesBySession: Map<string, TimelineItem[]>;
  /** session_id → bool indicating the bound was hit and items were dropped. */
  truncatedSessions: Set<string>;
  /** Increment-only counter exposed for debugging / banners. */
  framesProcessed: number;
}

export function emptyState(): InspectState {
  return {
    rootSessionId: null,
    isReplayingBacklog: false,
    schemaMismatch: false,
    sessions: new Map(),
    childrenByParent: new Map(),
    timelinesBySession: new Map(),
    truncatedSessions: new Set(),
    framesProcessed: 0,
  };
}

/** Maximum timeline items kept per session before we drop oldest. */
export const TIMELINE_CAP = 5000;

function insertChildOrdered(
  childrenByParent: Map<string | null, string[]>,
  parent: string | null,
  child: string,
  startedTs: number,
  sessions: Map<string, SessionNode>,
): Map<string | null, string[]> {
  const current = childrenByParent.get(parent) ?? [];
  if (current.includes(child)) {
    return childrenByParent;
  }
  // Binary-search-ish but n is tiny in practice — linear is fine.
  const next = [...current];
  let i = 0;
  while (i < next.length) {
    const sibling = sessions.get(next[i]);
    if (!sibling || sibling.started_ts > startedTs) {
      break;
    }
    i += 1;
  }
  next.splice(i, 0, child);
  const out = new Map(childrenByParent);
  out.set(parent, next);
  return out;
}

function appendTimeline(
  timelines: Map<string, TimelineItem[]>,
  truncated: Set<string>,
  sessionId: string,
  item: TimelineItem,
): {
  timelines: Map<string, TimelineItem[]>;
  truncated: Set<string>;
} {
  const cur = timelines.get(sessionId) ?? [];
  const next = [...cur, item];
  let truncatedOut = truncated;
  if (next.length > TIMELINE_CAP) {
    next.splice(0, next.length - TIMELINE_CAP);
    if (!truncated.has(sessionId)) {
      truncatedOut = new Set(truncated);
      truncatedOut.add(sessionId);
    }
  }
  const timelinesOut = new Map(timelines);
  timelinesOut.set(sessionId, next);
  return { timelines: timelinesOut, truncated: truncatedOut };
}

/**
 * Apply one frame. Returns a new state (Map / Set values are copy-on-write
 * for the touched keys only — Zustand consumers can rely on referential
 * inequality to detect changes without iterating).
 */
export function reduce(prev: InspectState, frame: Frame): InspectState {
  const framesProcessed = prev.framesProcessed + 1;
  switch (frame.type) {
    case 'hello': {
      if (frame.schema_version !== SUPPORTED_SCHEMA_VERSION) {
        return {
          ...prev,
          rootSessionId: frame.root_session_id,
          schemaMismatch: true,
          isReplayingBacklog: true,
          framesProcessed,
        };
      }
      return {
        ...prev,
        rootSessionId: frame.root_session_id,
        isReplayingBacklog: true,
        schemaMismatch: false,
        framesProcessed,
      };
    }
    case 'session_started': {
      if (prev.sessions.has(frame.session_id)) {
        // idempotent re-announce — ignore
        return { ...prev, framesProcessed };
      }
      const node: SessionNode = {
        id: frame.session_id,
        parent_id: frame.parent_session_id,
        purpose: frame.purpose,
        cwd: frame.cwd,
        started_ts: frame.ts,
        ended_ts: null,
      };
      const sessions = new Map(prev.sessions);
      sessions.set(frame.session_id, node);
      const childrenByParent = insertChildOrdered(
        prev.childrenByParent,
        node.parent_id,
        node.id,
        node.started_ts,
        sessions,
      );
      return {
        ...prev,
        sessions,
        childrenByParent,
        framesProcessed,
      };
    }
    case 'session_ended': {
      const existing = prev.sessions.get(frame.session_id);
      if (!existing) {
        return { ...prev, framesProcessed };
      }
      const sessions = new Map(prev.sessions);
      sessions.set(frame.session_id, { ...existing, ended_ts: frame.ts });
      return { ...prev, sessions, framesProcessed };
    }
    case 'event': {
      const item: TimelineItem = {
        source: 'event',
        session_id: frame.session_id,
        ts: frame.ts,
        kind: frame.kind,
        payload: frame.payload,
      };
      const { timelines, truncated } = appendTimeline(
        prev.timelinesBySession,
        prev.truncatedSessions,
        frame.session_id,
        item,
      );
      return {
        ...prev,
        timelinesBySession: timelines,
        truncatedSessions: truncated,
        framesProcessed,
      };
    }
    case 'entry': {
      const item: TimelineItem = {
        source: 'entry',
        session_id: frame.session_id,
        ts: frame.ts,
        entry_type: frame.entry_type,
        payload: frame.payload,
      };
      const { timelines, truncated } = appendTimeline(
        prev.timelinesBySession,
        prev.truncatedSessions,
        frame.session_id,
        item,
      );
      return {
        ...prev,
        timelinesBySession: timelines,
        truncatedSessions: truncated,
        framesProcessed,
      };
    }
    case 'backlog_done': {
      return { ...prev, isReplayingBacklog: false, framesProcessed };
    }
    default: {
      // Unknown frame type — keep the connection open, just bump the counter.
      return { ...prev, framesProcessed };
    }
  }
}

/**
 * Parse a raw WS text frame into a typed ``Frame`` or ``null`` if the
 * payload is structurally invalid. Defensive — we deliberately accept
 * unknown ``type`` strings (reducer treats them as no-op) so the UI
 * survives protocol additions.
 */
export function parseFrame(raw: string): Frame | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  const obj = parsed as Record<string, unknown>;
  const type = obj.type;
  if (typeof type !== 'string') {
    return null;
  }
  // Trust the wire — narrow only the shared fields and let the reducer
  // discriminate the rest.
  return obj as unknown as Frame;
}
