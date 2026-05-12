// Agent-native UI substrate — core types.
// See docs/agent-native-ui.md §3. This slice intentionally omits the
// surface system, ask-overlay, and MCP descriptor pieces.
// TODO(next slice): adopt @standard-schema/spec for paramsSchema typing.
// For v0 we keep the field as `unknown` so the library has zero validator
// dependency surface.

export type InvocationSource = 'user' | 'agent' | 'system';

export interface EntityRef {
  id: string;
  type: string;
}

export interface EntityProjection extends EntityRef {
  label?: string;
  data?: Record<string, unknown>;
}

export interface FieldProjection {
  name: string;
  label?: string;
  type: string;
  value: unknown;
  required?: boolean;
  invalid?: string;
}

export type SurfaceKind =
  | 'list'
  | 'table'
  | 'form'
  | 'detail'
  | 'dialog'
  | 'panel'
  | 'chart'
  | 'editor'
  | 'metric'
  | 'code'
  | 'diff'
  | 'preview'
  | 'terminal'
  | 'timeline'
  | 'tree'
  | 'chat'
  | 'message'
  | 'entity'
  | 'value'
  | 'tag';

export interface SurfaceSnapshot {
  id: string;
  kind: SurfaceKind;
  appId: string;
  label?: string;
  entities?: EntityProjection[];
  fields?: FieldProjection[];
  actionIds: string[];
  bbox?: { x: number; y: number; width: number; height: number };
  inViewport: boolean;
  askSuggestions?: string[];
}

export interface ShellSnapshot {
  currentAppId: string | null;
  route: { pathname: string; search: string; params: Record<string, string> };
  breadcrumbs: Array<{ label: string; href?: string }>;
  theme: 'light' | 'dark';
  viewport: { width: number; height: number };
}

export interface AegisSnapshot {
  timestamp: number;
  shell: ShellSnapshot;
  surfaces: SurfaceSnapshot[];
  selection: EntityRef[];
  focus: { surfaceId: string | null; entityId: string | null };
  appData: Record<string, unknown>;
}

export interface ActionContext {
  appId: string;
  navigate: (to: string) => void;
  snapshot: () => AegisSnapshot;
  toast: (msg: string, level?: 'info' | 'warn' | 'error') => void;
  correlationId: string;
  invokedBy: InvocationSource;
  signal: AbortSignal;
}

export interface ActionPreview {
  summary: string;
  affectedEntities?: EntityRef[];
  diff?: unknown;
}

export interface AegisAction<P = unknown, R = unknown> {
  id: string;
  label: string;
  description?: string;
  category?: string;
  keywords?: string[];
  shortcut?: string;
  // Schema typed as unknown for v0 — see file header TODO.
  paramsSchema?: unknown;
  resultSchema?: unknown;
  run: (params: P, ctx: ActionContext) => Promise<R> | R;
  dryRun?: (
    params: P,
    ctx: ActionContext,
  ) => Promise<ActionPreview> | ActionPreview;
  availability?: (snap: AegisSnapshot) => true | string;
  confirm?: { title: string; body?: string; danger?: boolean };
  invocableBy?: 'user' | 'agent' | 'both';
  /** Noun-first discovery binding. See docs/agent-native-ui.md §3.5. */
  appliesTo?: { entityType?: string; surfaceKind?: SurfaceKind };
}

export type AegisRef =
  | { kind: 'surface'; surfaceId: string }
  | { kind: 'entity'; entityId: string; surfaceId?: string }
  | { kind: 'action'; actionId: string }
  | { kind: 'route'; appId: string; pathname: string };

export interface AegisInspectResult {
  ref: AegisRef;
  surface?: SurfaceSnapshot;
  entity?: EntityProjection;
  action?: AegisActionDescriptor;
  actions: AegisActionDescriptor[];
  entities?: EntityProjection[];
}

export interface AegisSearchResult {
  ref: AegisRef;
  kind: AegisRef['kind'];
  label: string;
  snippet?: string;
  appId?: string;
  source: 'snapshot' | 'provider';
  score: number;
}

export interface SearchProvider {
  id: string;
  appId: string;
  kinds: Array<'entity' | 'route'>;
  matches?: (query: string) => boolean;
  search: (
    query: string,
    opts: { limit: number; signal: AbortSignal },
  ) => Promise<AegisSearchResult[]>;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type ActionSource =
  | { kind: 'app'; appId: string }
  | { kind: 'route'; appId: string; pathname: string }
  | { kind: 'component'; appId: string; surfaceId?: string; nodeId: string };

export interface AegisActionDescriptor {
  id: string;
  label: string;
  description?: string;
  category?: string;
  paramsSchema?: unknown;
  resultSchema?: unknown;
  available: boolean;
  unavailableReason?: string;
  invocableBy: 'user' | 'agent' | 'both';
  source: ActionSource;
}

export type AegisErrorCode =
  | 'unknown_action'
  | 'unavailable'
  | 'invalid_params'
  | 'needs_confirm'
  | 'aborted'
  | 'thrown';

export interface AegisError {
  code: AegisErrorCode;
  message: string;
  reason?: unknown;
}

export type DispatchResult<R> =
  | { ok: true; result: R; correlationId: string }
  | { ok: false; error: AegisError; correlationId: string };

export interface SnapshotDiff {
  added?: string[];
  removed?: string[];
  changed?: string[];
}

export type AegisEvent =
  | {
      type: 'action.invoked';
      id: string;
      params: unknown;
      by: InvocationSource;
      correlationId: string;
    }
  | {
      type: 'action.completed';
      correlationId: string;
      result: unknown;
      durationMs: number;
    }
  | { type: 'action.failed'; correlationId: string; error: AegisError }
  | { type: 'snapshot.changed'; diff: SnapshotDiff }
  | { type: 'navigation'; from: string; to: string }
  | { type: 'registry.changed'; added: string[]; removed: string[] }
  | { type: 'ask.triggered'; context: AskContext }
  | { type: 'ask.submit'; request: AskRequest };

/* ── Ask-AI affordance — see docs/agent-native-ui.md §7. ───────────── */

export type AskOrigin = 'entity' | 'surface' | 'action' | 'global';

export interface AskContext {
  /** What the user clicked from. */
  origin: AskOrigin;
  appId: string;
  surface?: { id: string; kind: SurfaceKind; label?: string };
  entity?: EntityProjection;
  selection?: EntityProjection[];
  action?: { id: string; label: string };
  /** Pre-filled prompt chips, sourced from surface.askSuggestions. */
  suggestions: string[];
  /** Snapshot at trigger time. Frozen — the panel works on this. */
  snapshot: AegisSnapshot;
}

export interface AskRequest {
  prompt: string;
  context: AskContext;
  tools: AegisActionDescriptor[];
  /** Conversation so far; first call is empty. */
  history: AskMessage[];
}

export type AskMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string };
