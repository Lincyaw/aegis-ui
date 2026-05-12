# Agent-Native UI — design doc

Status: draft · Owner: TBD · Last updated: 2026-05-12

## 1. Goal

Turn `aegis-ui` into an **environment** an agent can perceive, reason
about, and act in — without losing the design discipline that makes the
human UI good. Three capabilities define "agent-native" here:

1. **Perception** — agent can read what the user currently sees, in
   structured form (not screenshots, not DOM dumps).
2. **Affordance discovery** — agent has a live, typed catalogue of every
   action the user could take right now, and the reason any blocked
   action is blocked.
3. **Co-execution** — agent can invoke those actions on the user's
   behalf, with the same validation, confirmation, and audit trail as a
   human click. Symmetrically, the user can **invoke the agent from any
   surface** ("Ask AI about this row") without leaving the page.

Non-goals:

- Building the agent itself. This doc is about the substrate, not the model
  loop.
- Replacing the design system. Everything here sits _next to_ primitives;
  no primitive's visual contract changes.
- Per-app SDKs. There is one substrate, in `packages/ui`. Sub-apps consume it.

## 2. Architecture (3 layers)

```
┌─ Agent runtime (Claude Code / browser MCP client / in-house agent)
│       ↑ JSON Schema tools, snapshot resource, ask-overlay channel
├─ Layer 3 · Runtime — window.__aegis  (created by AegisShell)
│       ↑ register / dispatch / snapshot / subscribe
├─ Layer 2 · Hooks — useAegisAction / useAegisSurface  (packages/ui)
│       ↑ called internally by primitives; also usable directly
├─ Layer 1 · Primitive bindings — <Button action={…}>, <DataTable surface={…}>, …
│       ↑ business code only writes this
└─ App-level — AegisApp.actions / AegisApp.snapshot (always-on capabilities)
```

Three principles to maintain in this order:

1. **Capability follows mount.** A component-bound action exists in the
   registry only while its component is mounted. App-level actions exist
   while the app is active. The registry is always the _truth of right
   now_.
2. **Projection, not exfiltration.** Surfaces declare a `project()` that
   shapes business data into agent-visible form. No primitive ever puts
   raw business records into a snapshot.
3. **Same path for human and agent.** A button click and an agent
   `dispatch` go through the same `run()` with the same validation,
   confirmation, and event emission. There is no second code path.

## 3. Core types

Lives in `packages/ui/src/agent/types.ts`. Public from
`@OperationsPAI/aegis-ui` under the `agent/*` subpath.

### 3.1 Action

```ts
export interface AegisAction<P = unknown, R = unknown> {
  /** Globally unique. Namespace: '<app>.<verb>[.<qualifier>]' */
  id: string;
  /** Human-readable short label (palette, button aria-label fallback) */
  label: string;
  /** For the agent. State side effects and prerequisites explicitly. */
  description?: string;
  category?: string;
  keywords?: string[];
  shortcut?: string;

  /** standard-schema; lets consumers pick zod / valibot / arktype */
  paramsSchema?: StandardSchemaV1<P>;
  resultSchema?: StandardSchemaV1<R>;

  run: (params: P, ctx: ActionContext) => Promise<R> | R;

  /** Returns a preview of what would happen. Required for destructive ops. */
  dryRun?: (
    params: P,
    ctx: ActionContext,
  ) => Promise<ActionPreview> | ActionPreview;

  /** true → available; string → unavailable, the string is the reason. */
  availability?: (snap: AegisSnapshot) => true | string;

  /** Human confirmation; agent may set { force: true } to skip. */
  confirm?: { title: string; body?: string; danger?: boolean };

  /** Defaults to 'both'. */
  invocableBy?: 'user' | 'agent' | 'both';
}

export interface ActionContext {
  appId: string;
  navigate: (to: string) => void;
  snapshot: () => AegisSnapshot;
  toast: (msg: string, level?: 'info' | 'warn' | 'error') => void;
  correlationId: string;
  invokedBy: 'user' | 'agent' | 'system';
  signal: AbortSignal;
}

export interface ActionPreview {
  summary: string;
  affectedEntities?: EntityRef[];
  diff?: unknown; // structured; agent interprets per action
}
```

### 3.2 Snapshot

```ts
export interface AegisSnapshot {
  timestamp: number;
  shell: ShellSnapshot;
  surfaces: SurfaceSnapshot[];
  selection: EntityRef[];
  focus: { surfaceId: string | null; entityId: string | null };
  appData: Record<string, unknown>; // opaque to shell
}

export interface ShellSnapshot {
  currentAppId: string | null;
  route: { pathname: string; search: string; params: Record<string, string> };
  breadcrumbs: Array<{ label: string; href?: string }>;
  theme: 'light' | 'dark';
  viewport: { width: number; height: number };
}

export interface SurfaceSnapshot {
  id: string; // matches data-agent-surface-id
  kind: SurfaceKind;
  appId: string;
  label?: string;
  entities?: EntityProjection[];
  fields?: FieldProjection[];
  actionIds: string[]; // actions scoped to this surface
  bbox?: { x: number; y: number; width: number; height: number };
  inViewport: boolean;
  /** Shown in the Ask-AI overlay as quick-prompt chips (see §7). */
  askSuggestions?: string[];
}

export type SurfaceKind =
  | 'list'
  | 'table'
  | 'form'
  | 'detail'
  | 'dialog'
  | 'panel'
  | 'chart'
  | 'editor';

export interface EntityRef {
  id: string;
  type: string;
}
export interface EntityProjection extends EntityRef {
  label?: string;
  data?: Record<string, unknown>; // small projection, not the full record
}
export interface FieldProjection {
  name: string;
  label?: string;
  type: string;
  value: unknown;
  required?: boolean;
  invalid?: string;
}
```

### 3.3 Events

```ts
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
  | { type: 'ask.opened'; context: AskContext }
  | { type: 'ask.submitted'; context: AskContext; prompt: string };
```

### 3.4 Agent-facing descriptor

Serialised form sent to the agent / over MCP. Schemas converted from
standard-schema to JSON Schema by the runtime.

```ts
export interface AegisActionDescriptor {
  id: string;
  label: string;
  description?: string;
  category?: string;
  paramsSchema?: unknown; // JSON Schema
  resultSchema?: unknown;
  available: boolean;
  unavailableReason?: string;
  invocableBy: 'user' | 'agent' | 'both';
  source: ActionSource;
}

export type ActionSource =
  | { kind: 'app'; appId: string }
  | { kind: 'route'; appId: string; pathname: string }
  | { kind: 'component'; appId: string; surfaceId?: string; nodeId: string };
```

### 3.5 Discovery — refs, inspect, search

Discovery is **noun-first**: the agent locates a target (surface / entity
/ action) and then asks what's bound to it. The substrate never asks the
agent to memorise a global verb table.

```ts
/** A reference to anything addressable in the env. */
export type AegisRef =
  | { kind: 'surface'; surfaceId: string }
  | { kind: 'entity'; entityId: string; surfaceId?: string }
  | { kind: 'action'; actionId: string }
  | { kind: 'route'; appId: string; pathname: string };

/** Result of `runtime.inspect(ref)`. */
export interface AegisInspectResult {
  ref: AegisRef;
  surface?: SurfaceSnapshot;
  entity?: EntityProjection;
  action?: AegisActionDescriptor;
  /** Actions bound to this target (or applicable to its entity type). */
  actions: AegisActionDescriptor[];
  /** When the target is a surface: a sample of its entities. */
  entities?: EntityProjection[];
}

/** Result of `runtime.search(query, opts)`. */
export interface AegisSearchResult {
  ref: AegisRef;
  kind: AegisRef['kind']; // mirrors ref.kind for filtering
  label: string; // what to show the agent / user
  snippet?: string; // context around the match
  appId?: string;
  source: 'snapshot' | 'provider'; // local vs registered SearchProvider
  score: number; // 0..1
}

/** Apps register providers to expose data not currently mounted. */
export interface SearchProvider {
  id: string; // 'datasets'
  appId: string;
  /** Which kinds this provider can return. */
  kinds: ('entity' | 'route')[];
  /** Optional filter — only invoke on queries matching the predicate. */
  matches?: (query: string) => boolean;
  search: (
    query: string,
    opts: { limit: number; signal: AbortSignal },
  ) => Promise<AegisSearchResult[]>;
}
```

Action gains an optional `appliesTo` field for entity-scoped discovery —
the lightest possible binding (no closure, no state):

```ts
export interface AegisAction<P = unknown, R = unknown> {
  // ...existing fields
  /** Entity-scoped discovery. inspect({entityId}) is a UNION (right-click intuition):
   *  source-bound to the entity's container surface
   *    OR appliesTo.surfaceKind === containingSurface.kind
   *    OR appliesTo.entityType === entity.type.
   *  This guarantees inspect(entity).actions ⊇ inspect(surface).actions. */
  appliesTo?: { entityType?: string; surfaceKind?: SurfaceKind };
}
```

## 4. Component binding API

### 4.1 Hooks

```ts
function useAegisAction<P, R>(
  action: AegisAction<P, R> | null | undefined,
): {
  invoke: (params: P) => Promise<R>;
  available: boolean;
  unavailableReason?: string;
};

function useAegisSurface<T>(opts: {
  id: string;
  kind: SurfaceKind;
  label?: string;
  data: T;
  /** Only project what the agent actually needs. PII / size discipline. */
  project: (data: T) => Pick<SurfaceSnapshot, 'entities' | 'fields'>;
  askSuggestions?: (entity?: EntityProjection) => string[];
  ref?: React.RefObject<HTMLElement>;
}): { surfaceId: string };
```

`useAegisAction` registers on mount, unregisters on unmount. ID
collisions raise a dev-mode warning; the most-recent registration wins.
Both hooks read their `ActionSource` from `<AegisAppBoundary>` /
`<AegisSurfaceBoundary>` context — apps and surfaces wrap their children
so deeply nested components don't have to thread `appId`.

### 4.2 Primitive `action` / `surface` props

The pay-off of putting this in primitives: business code declares an
action **once** and gets the button + agent tool + command palette entry

- telemetry for free.

```tsx
<Button action={createDataset}>Create</Button>

<DataTable
  rows={datasets}
  columns={cols}
  surface={{
    id: 'datasets.list',
    kind: 'list',
    project: (rows) => ({
      entities: rows.map((r) => ({
        id: r.id, type: 'dataset', label: r.name,
        data: { status: r.status, sizeBytes: r.size },
      })),
    }),
    askSuggestions: (e) => e
      ? [`Why is ${e.label} flagged?`, `Show similar datasets`]
      : [`Summarize this list`, `What changed in 24h?`],
  }}
/>
```

Primitives carrying agent bindings (initial set):

| Primitive     | Prop      | Behaviour                                                    |
| ------------- | --------- | ------------------------------------------------------------ |
| `Button`      | `action`  | onClick → dispatch; disables with reason when unavailable    |
| `IconButton`  | `action`  | Same                                                         |
| `MenuItem`    | `action`  | Same                                                         |
| `Link`        | `action`  | Navigation-style action; href falls out of `dryRun()`        |
| `Form`        | `action`  | onSubmit → dispatch with form values, schema validates first |
| `DataTable`   | `surface` | Auto-projects rows; row selection feeds `snapshot.selection` |
| `List`        | `surface` | Same, simpler                                                |
| `DetailPanel` | `surface` | kind: 'detail', single entity                                |
| `Dialog`      | `surface` | kind: 'dialog', auto-marks `inViewport` while open           |

Every binding-capable primitive emits `data-agent-*` attributes so the
shell-level Ask overlay (§7) can locate it without per-component wiring.

## 5. AegisApp extension

```ts
export interface AegisApp {
  // ...existing fields
  /** Always available while this app is active (or per `availability`). */
  actions?: AegisAction[];
  /** App contributes a snapshot fragment under appData[appId]. */
  snapshot?: (helpers: AppSnapshotHelpers) => Record<string, unknown>;
}

export interface AppSnapshotHelpers {
  route: ShellSnapshot['route'];
  read: <T>(selector: () => T) => T; // typically a useSyncExternalStore getter
}
```

## 6. Runtime

`packages/ui/src/agent/runtime.ts`. `AegisShell` constructs one and
mounts it on `window.__aegis`.

```ts
export interface AegisRuntime {
  snapshot(paths?: string[]): AegisSnapshot | unknown;

  /** Noun-first discovery. Returns the target plus actions bound to it. */
  inspect(ref: AegisRef): AegisInspectResult | null;

  /** Free-text discovery across snapshot + registered providers. */
  search(
    query: string,
    opts?: {
      kinds?: AegisRef['kind'][];
      appId?: string;
      limit?: number; // default 20
      signal?: AbortSignal;
    },
  ): Promise<AegisSearchResult[]>;

  dispatch<R = unknown>(
    id: string,
    params?: unknown,
    opts?: {
      force?: boolean;
      dryRun?: boolean;
      correlationId?: string;
      by?: InvocationSource;
    },
  ): Promise<DispatchResult<R>>;

  /** Highlight a target in the UI (scroll into view + transient ring). */
  highlight(ref: AegisRef): Promise<{ found: boolean; bbox?: DOMRect }>;

  /** Wait until a snapshot predicate is true; returns the snapshot at trigger. */
  waitFor(
    predicate: string,
    opts?: { timeoutMs?: number; signal?: AbortSignal },
  ): Promise<AegisSnapshot>;

  subscribe(listener: (e: AegisEvent) => void): () => void;

  /** Internal helpers — kept for debug, not exposed via MCP. */
  listActions(filter?: {
    available?: boolean;
    appId?: string;
    invocableBy?: InvocationSource;
  }): AegisActionDescriptor[];
  getAction(id: string): AegisActionDescriptor | null;

  /** Pure: returns the fixed MCP tool definitions (see §6.2). */
  toMcpTools(): McpToolDefinition[];
}

export type DispatchResult<R> =
  | { ok: true; result: R; correlationId: string }
  | { ok: false; error: AegisError; correlationId: string };

export interface AegisError {
  code:
    | 'unknown_action'
    | 'unavailable'
    | 'invalid_params'
    | 'needs_confirm'
    | 'aborted'
    | 'thrown';
  message: string;
  reason?: unknown;
}
```

### 6.1 Canonical agent loop

The agent should treat this as the default pattern; any deviation is a
smell.

```
1. snapshot({ paths: ['shell','surfaces[*].id','surfaces[*].kind','selection'] })
   → "where am I, what's on screen"

2. search(query)         OR    inspect({ surfaceId })
   → locate the target — by free text when the user named something,
     or by surface id when the page is already the target

3. inspect({ entityId | actionId })
   → see what's bound to the target

4. dispatch(actionId, params [, { dryRun: true } ])
   → execute (preview first if destructive)

5. snapshot()
   → verify the change landed
```

The loop is **noun-first**: discovery is always anchored to a concrete
ref. The agent never iterates over a global verb table.

### 6.2 MCP tool catalogue (the only public surface)

`toMcpTools()` returns a **fixed, atomic** set of 7 tools — independent
of how many actions the page registers. Per-action tools are explicitly
rejected (§10.9). Each tool maps 1:1 to a runtime method.

| MCP tool          | Runtime call            | Purpose                                                               |
| ----------------- | ----------------------- | --------------------------------------------------------------------- |
| `aegis_snapshot`  | `snapshot(paths?)`      | Read state. `paths` projects to keep tokens small.                    |
| `aegis_inspect`   | `inspect(ref)`          | Noun-first discovery — target + bound actions.                        |
| `aegis_search`    | `search(query, opts)`   | Free-text shortcut — finds targets without `navigate` chains.         |
| `aegis_invoke`    | `dispatch(id, params)`  | The **only** write entry. Carries `force` / `dryRun`.                 |
| `aegis_navigate`  | shell-registered action | Goes to a route. Just sugar for `dispatch('aegis.navigate', { to })`. |
| `aegis_highlight` | `highlight(ref)`        | Point the user's eye.                                                 |
| `aegis_wait_for`  | `waitFor(predicate)`    | Block on async UI state instead of sleeping.                          |

JSON Schema for each tool is generated from the runtime method's TypeScript signature.
Tool list is **static** — `tools/list_changed` is never emitted by this layer.
Action churn (mount / unmount) only changes what `inspect` and `search` return; the tool surface itself is constant. This dodges client-side
list-thrash and keeps prompts small.

**Why no per-action tool**: a console with 500 actions would pump a
~50k-token tool list into every prompt. Discovery via `inspect` /
`search` adds at most one round trip per task and the result list is
local (≤ tens of items), trading a little latency for an order-of-
magnitude reduction in prompt cost.

## 7. Ask-AI affordance — the human-side trigger

If the agent only ever runs from a sidebar chat, none of the above
matters at the UX level. The point of the substrate is that **any
agent-aware surface or entity is itself an entry point**. From the
user's POV: right-click a row → "Ask about this dataset" → an ask panel
opens already pre-loaded with that entity's context, the relevant
surface, and the available actions the agent can offer to take.

### 7.1 Trigger surface

The shell mounts a single `<AskOverlay>` that listens (delegated) for
these triggers on any element with `data-agent-surface-id`,
`data-agent-entity-id`, or `data-agent-action-id`:

| Trigger           | Gesture                                                                                |
| ----------------- | -------------------------------------------------------------------------------------- |
| Right-click       | Replaces native context menu only when modifier-free; Shift+RC bypasses to native menu |
| Hover-corner chip | Small `Ask AI` chip appears in the entity row's right edge after ~400 ms hover         |
| Keyboard          | `Cmd/Ctrl + .` opens ask panel for the focused entity                                  |
| Long-press        | Mobile / touch                                                                         |
| Slash inline      | Typing `/ai` inside a `Form`'s text field opens ask scoped to that field               |

Components opt **out** with `<DataTable surface={{ ask: false }} />` if
needed. The chip's visibility is controlled by a shell-level user
setting (`agent.askAffordance: 'always' | 'hover' | 'menu-only' | 'off'`)
because not everyone wants chips floating on every row.

### 7.2 AskContext — what the panel knows

```ts
export interface AskContext {
  /** What the user clicked from. */
  origin: 'entity' | 'surface' | 'action' | 'global';
  appId: string;
  surface?: { id: string; kind: SurfaceKind; label?: string };
  entity?: EntityProjection;
  selection?: EntityProjection[]; // multi-select case
  action?: { id: string; label: string }; // when origin = 'action'
  /** Pre-filled prompt chips, sourced from surface.askSuggestions. */
  suggestions: string[];
  /** Snapshot at trigger time. Frozen, the panel works on this. */
  snapshot: AegisSnapshot;
}
```

### 7.3 Ask panel — the primitive

`<AskPanel>` is a new primitive in `packages/ui`. It is presentational
only — it takes an `AskContext` and an `AskTransport` and renders the
conversation, the suggested actions, and confirmation steps.

```ts
export interface AskTransport {
  /** Streams the agent's reply. Implementation lives outside packages/ui. */
  send(req: AskRequest): AsyncIterable<AskMessage>;
}

export interface AskRequest {
  prompt: string;
  context: AskContext;
  /** All actions available *right now*. Agent uses these as tools. */
  tools: AegisActionDescriptor[];
  /** Conversation so far; first call is empty. */
  history: AskMessage[];
}

export type AskMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; citations?: Citation[] }
  | { role: 'proposal'; call: ProposedActionCall }
  | { role: 'tool'; callId: string; result: DispatchResult<unknown> };

export interface ProposedActionCall {
  callId: string;
  actionId: string;
  params: unknown;
  /** Auto-rendered when the action declares dryRun(). */
  preview?: ActionPreview;
  /** If the action declares `confirm`, the panel surfaces an accept/reject UI. */
  needsConfirm: boolean;
  rationale?: string;
}

export interface Citation {
  surfaceId?: string;
  entityId?: string;
  actionId?: string;
  /** Lets the panel scroll/highlight the cited element via the runtime. */
}
```

### 7.4 Flow — example

User right-clicks a row in `datasets.list` → "Why is `imagenet-mini`
flagged?" prompt chip is preselected.

1. Overlay reads `data-agent-entity-id="ds-1"`, walks up to find
   `data-agent-surface-id="datasets.list"`, calls
   `runtime.snapshot()` → builds `AskContext`.
2. Opens `<AskPanel>` anchored to the row, with the chip prompt.
3. User submits. Panel calls `transport.send({ prompt, context, tools, history })`.
4. Agent replies with text + a `proposal` to call
   `dataset.diagnose-anomaly` with `{ id: 'ds-1' }`. Because that action
   declares `dryRun`, the proposal already carries
   `preview = { summary: "Will scan last 7d of metrics, no writes." }`.
5. User clicks Accept. Panel calls
   `runtime.dispatch('dataset.diagnose-anomaly', { id: 'ds-1' }, { by: 'agent' })`.
6. Result is appended as a `tool` message; agent continues with a
   summary citing entities the diagnose action surfaced. Citations
   become click-through links via `runtime` highlight helpers.

### 7.5 Citation → highlight

The runtime exposes a small helper for the panel to "show me what you're
talking about":

```ts
runtime.highlight({ surfaceId?: string; entityId?: string; actionId?: string }):
  Promise<{ found: boolean; bbox?: DOMRect }>;
```

Implementation: scrolls into view, applies a transient
`--ask-highlight-ring` outline (token, defined in `theme.css`). Used by
the panel when the user hovers a citation chip, and by the agent when
it wants to direct the user's attention before a destructive action.

## 8. Trajectories

`AegisEvent` is already the shape `apps/console/.../trajectories` wants.
Wire `runtime.subscribe` into the existing trajectories sink — both user
clicks (via the same `dispatch` path) and agent calls (`by: 'agent'`)
land in one stream, distinguished by `by`. This is also the audit log
for security review of agent actions.

## 9. MCP bridge — deferred

`runtime.toMcpTools()` is a pure function over the registry. When ready:

- The Go console binary (`apps/console` build) hosts an SSE MCP server.
- An incoming tool call is forwarded to the browser session over a
  WebSocket (or BroadcastChannel for same-origin), terminating in
  `runtime.dispatch(id, params, { by: 'agent' })`.
- The snapshot is exposed as an MCP resource at
  `aegis://snapshot/current`, refreshed on `snapshot.changed`.

Front-end code does not change for this step.

## 10. Design judgements (non-obvious)

1. **ID namespace is enforced** (`<app>.<verb>[.<qualifier>]`). Runtime
   warns on collision in dev. Without this, two pages declaring `create`
   silently overwrite.
2. **standard-schema, not zod-direct.** Library never imports zod;
   consumers pick their validator. Runtime converts to JSON Schema for
   the agent.
3. **`availability` ≠ visibility.** Unmount → action gone (visibility).
   Mounted but not allowed in current state → in the registry,
   `available: false` with a reason. The agent needs the _reason_ —
   "switch to Datasets app first" is more useful than "doesn't exist".
4. **`dryRun` / `confirm` / `force`.** Destructive actions default to
   needing `force: true` to bypass `confirm`. `dryRun` is what makes the
   Ask panel's "preview before accept" possible without writing
   per-action UI.
5. **`project()` is mandatory.** Forces developers to think about which
   columns the agent actually needs. Prevents PII leakage and snapshot
   bloat.
6. **One overlay, delegated events.** `<AskOverlay>` lives in the shell.
   Primitives just need `data-agent-*` attributes — no per-component
   right-click wiring, no event handler proliferation.
7. **Same path, both directions.** A button click and an agent dispatch
   call the same `run`. The Ask panel's "Accept" button calls the same
   `runtime.dispatch` the agent would call directly. There is no second
   code path that could drift.
8. **Transport is injected.** `<AskPanel>` doesn't know whether the
   agent is Claude, an in-house model, or a stub. The transport is
   provided by the shell consumer (`<AegisShell agent={{ transport }}>`).
9. **Atomic MCP tool set, not per-action tools.** Discovery runs
   through `inspect` / `search`, not through a 500-tool list. Cost trade
   is one extra round trip per task vs ~50k prompt tokens per turn —
   the round trip wins by an order of magnitude. The "tool list = the
   capability list" property is recovered by `inspect`'s response shape.
10. **Search has two sources, one tool.** Snapshot search is free
    (entities currently mounted); provider search is opt-in (apps register
    `SearchProvider` for data not on screen). `aegis_search` merges them
    and tags each result with `source: 'snapshot' | 'provider'` so the
    agent can decide whether the hit means "already on screen" or "needs
    a navigate".
11. **Noun-first beats verb-first.** `inspect({entityId})` returns the
    union of (a) actions whose React tree sits inside the entity's
    container surface, (b) actions whose `appliesTo.surfaceKind` matches
    the container, (c) actions whose `appliesTo.entityType` matches the
    entity — the right-click intuition: "everything available on this
    list is also available on this row." Don't add a `listAllActions`
    MCP tool; if the agent wants the global table, it inspects each
    surface in turn.

## 11. Rollout

1. `packages/ui/src/agent/{types,runtime,context,hooks}.ts`. No
   primitive changes yet.
2. Add `action` / `surface` props to `Button`, `IconButton`, `MenuItem`,
   `Link`, `Form`, `DataTable`, `List`, `DetailPanel`, `Dialog`. All
   props optional, fully backward-compatible.
3. Gallery: new "Agent integration" section. Specimens for an action
   button, a surface table, and a floating debug panel that prints
   `__aegis.snapshot()` live. This is the validation that the API is
   pleasant to use.
4. **Noun-first discovery: `inspect`, `search`, `appliesTo`.** Add
   `runtime.inspect(ref)` and `runtime.search(query, opts)`. Add
   optional `appliesTo` to `AegisAction`. Add `useAegisSearchProvider`
   hook so apps can expose data not currently mounted. Gallery dumps
   the three `inspect` shapes + a `search` over the demo datasets.
5. `<AskOverlay>` + `<AskPanel>` primitives. Wire the trigger gestures.
   Ship with a no-op `AskTransport` stub and a `console.log` transport
   for dev.
6. Pick one portal page (datasets list or injections list). Migrate:
   declare 5–10 actions, 1–2 surfaces, write `askSuggestions`. Run end
   to end with the dev transport.
7. Real transport: wire to in-house agent / Claude API. Decide on the
   server hop here.
8. Trajectories: subscribe to runtime events.
9. MCP bridge in console binary.

## 12. Open questions

- **Multi-agent / multi-user.** Snapshot is per-session. If two humans
  share a screen via co-browsing, do we serialise dispatches? Out of
  scope v1.
- **Agent-initiated UI changes.** Does the agent get to _open dialogs_
  or _navigate_? Currently yes via `dispatch` of nav-style actions; do
  we want a stricter capability gate?
- **Streaming results.** `dispatch` returns once. Long-running actions
  (training, scans) need a `runtime.dispatchStream` that yields
  progress. Probably required before any real ML action ships.
- **Token cost of snapshot.** A 200-row table at full projection is
  large. Do we cap entities-per-surface in the descriptor and let agent
  ask for "next page" via a built-in `surface.page` action?
- **Error UX in Ask panel.** If a dispatched action fails, the panel
  shows the error; does the agent get the failure as a tool result and
  retry automatically, or stop and ask the user? Default: surface to
  user, agent reasons but does not auto-retry destructive ops.
- **Permissions.** `invocableBy: 'user' | 'agent' | 'both'` is the
  primitive; do we also need per-action allowlist that the user
  configures (e.g., "agent may never call `*.delete`")? Likely yes,
  shell-level setting.
