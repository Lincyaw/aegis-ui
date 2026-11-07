// Agent runtime — layer 3 in docs/agent-native-ui.md. Dispatch enforces
// `invocableBy` and keeps `confirm.danger` actions away from the agent.
// `availability` is not evaluated yet: every registered action reports
// `available: true`.
import { uniqueId } from '../../lib/id';
import type {
  ActionContext,
  ActionSource,
  AegisAction,
  AegisActionDescriptor,
  AegisError,
  AegisEvent,
  AegisInspectResult,
  AegisRef,
  AegisSearchResponse,
  AegisSearchResult,
  AegisSnapshot,
  AegisWaitCondition,
  AskContext,
  AskRequest,
  DispatchResult,
  EntityProjection,
  EntityRef,
  InvocationSource,
  PreviewResult,
  SearchProvider,
  ShellSnapshot,
  SurfaceKind,
  SurfaceSnapshot,
} from './types';

export interface RegisteredAction {
  action: AegisAction<unknown, unknown>;
  source: ActionSource;
}

export interface RegisteredSurface {
  id: string;
  kind: SurfaceKind;
  appId: string;
  label?: string;
  getProjection: () => Pick<SurfaceSnapshot, 'entities' | 'fields'>;
  /** The surface's root element; actions rendered inside it bind to it. */
  getElement?: () => Element | null;
  getBBox?: () => SurfaceSnapshot['bbox'];
  getInViewport?: () => boolean;
  askSuggestions?: string[];
}

export interface ListActionsFilter {
  available?: boolean;
  appId?: string;
  /** Keeps the actions this source may invoke. */
  invocableBy?: InvocationSource;
}

export interface SearchOptions {
  kinds?: Array<AegisRef['kind']>;
  appId?: string;
  limit?: number;
  signal?: AbortSignal;
}

export interface WaitForOptions {
  /** Defaults to 5 s; capped at 20 s. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface AegisRuntime {
  snapshot(): AegisSnapshot;
  listActions(filter?: ListActionsFilter): AegisActionDescriptor[];
  getAction(id: string): AegisActionDescriptor | null;
  inspect(ref: AegisRef): AegisInspectResult | null;
  search(query: string, opts?: SearchOptions): Promise<AegisSearchResponse>;
  highlight(ref: AegisRef): Promise<{ found: boolean; bbox?: DOMRect }>;
  /**
   * Resolves with the snapshot once `condition` holds. Rejects with an
   * `AegisError`: `timeout`, `aborted`, or `thrown` when a surface's
   * projection throws.
   */
  waitFor(
    condition: AegisWaitCondition,
    opts?: WaitForOptions,
  ): Promise<AegisSnapshot>;
  /** `signal` reaches the action as `ctx.signal`. */
  dispatch<R = unknown>(
    id: string,
    params?: unknown,
    opts?: {
      correlationId?: string;
      by?: InvocationSource;
      signal?: AbortSignal;
    },
  ): Promise<DispatchResult<R>>;
  /**
   * Describes what dispatching `id` would do without running it: the
   * action's descriptor plus the output of its `dryRun`, if it has one.
   * The `dryRun` gets a `ctx.navigate` that does nothing.
   */
  preview(
    id: string,
    params?: unknown,
    opts?: { by?: InvocationSource; signal?: AbortSignal },
  ): Promise<PreviewResult>;
  subscribe(listener: (e: AegisEvent) => void): () => void;
  /** Subscribe specifically to ask-triggered events (sugar over subscribe). */
  onAskTriggered(handler: (ctx: AskContext) => void): () => void;
  /** Emit an ask-triggered event. Used by AskOverlay + programmatic openers. */
  emitAskTriggered(ctx: AskContext): void;
  /** Emit an ask-submit event; AskOverlay does so when the user sends a question. */
  emitAskSubmit(req: AskRequest): void;
  /** Tell the runtime what the user has selected; it shows in snapshot().selection. */
  setSelection(refs: EntityRef[]): void;
  // Used by the library's hooks and providers; left out of the published
  // declarations (`stripInternal`).
  /** @internal */
  _register(entry: RegisteredAction): () => void;
  /** @internal */
  _registerSurface(entry: RegisteredSurface): () => void;
  /** @internal */
  _registerSearchProvider(provider: SearchProvider): () => void;
  /** @internal */
  _setShellSnapshot(getter: () => ShellSnapshot): void;
  /** @internal */
  _setNavigate(nav: (to: string) => void): void;
}

export interface RuntimeDeps {
  navigate?: (to: string) => void;
  toast?: (msg: string, level?: 'info' | 'warn' | 'error') => void;
}

const WAIT_FOR_DEFAULT_TIMEOUT_MS = 5_000;
// Below the MCP bridge's 30 s call timeout, so the agent gets this
// runtime's timeout error rather than the bridge's.
const WAIT_FOR_MAX_TIMEOUT_MS = 20_000;
// Route changes and new surface data emit no event, so waitFor also polls.
const WAIT_FOR_POLL_MS = 250;
const HIGHLIGHT_DURATION_MS = 1200;
const SCROLL_SETTLE_POLL_MS = 50;
const SCROLL_SETTLE_MAX_MS = 3000;

export function defaultShellSnapshot(
  currentAppId: string | null = null,
): ShellSnapshot {
  return {
    currentAppId,
    route: { pathname: '/', search: '', params: {} },
    breadcrumbs: [],
    theme: 'light',
    viewport: { width: 0, height: 0 },
  };
}

export function findSurfaceContaining(
  surfaces: SurfaceSnapshot[],
  entityId: string,
): { surface: SurfaceSnapshot; entity: EntityProjection } | null {
  for (const surface of surfaces) {
    const entity = surface.entities?.find((e) => e.id === entityId);
    if (entity) {
      return { surface, entity };
    }
  }
  return null;
}

function canInvoke(
  allowed: AegisActionDescriptor['invocableBy'],
  by: InvocationSource,
): boolean {
  return allowed === 'both' || by === 'system' || allowed === by;
}

function containsText(needle: string, values: unknown[]): boolean {
  return values.some(
    (v) =>
      (typeof v === 'string' ||
        typeof v === 'number' ||
        typeof v === 'boolean') &&
      String(v).toLowerCase().includes(needle),
  );
}

class InvalidParamsError extends Error {}

function thrownError(err: unknown): AegisError {
  return {
    code: err instanceof InvalidParamsError ? 'invalid_params' : 'thrown',
    message: err instanceof Error ? err.message : String(err),
    reason: err,
  };
}

function navigateTarget(params: unknown): string {
  const to = (params as { to?: unknown } | null | undefined)?.to;
  if (typeof to !== 'string' || to === '') {
    throw new InvalidParamsError('aegis.navigate requires { to: string }');
  }
  return to;
}

// Resolves `to` the way a link's href resolves and keeps only a path on
// this page's origin, so the agent can neither run a javascript: URL nor
// send the tab to another site.
function sameOriginPath(to: string): string {
  let url: URL;
  try {
    url = new URL(to, window.location.href);
  } catch {
    throw new InvalidParamsError(`aegis.navigate: "${to}" is not a URL`);
  }
  if (url.origin !== window.location.origin) {
    throw new InvalidParamsError(
      `aegis.navigate: "${to}" leaves ${window.location.origin}; only paths on this site are allowed`,
    );
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function unknownActionError(id: string): AegisError {
  return {
    code: 'unknown_action',
    message: `No action registered with id "${id}"`,
  };
}

function attrSelector(attr: string, value: string): string {
  return `[${attr}="${CSS.escape(value)}"]`;
}

function refToSelector(ref: AegisRef): string | null {
  switch (ref.kind) {
    case 'surface':
      return attrSelector('data-agent-surface-id', ref.surfaceId);
    case 'entity':
      return attrSelector('data-agent-entity-id', ref.entityId);
    case 'action':
      return attrSelector('data-agent-action-id', ref.actionId);
    case 'route':
      return null;
  }
}

/** Resolves with the element's rect once a smooth scroll has stopped moving it. */
function settledRect(el: HTMLElement): Promise<DOMRect> {
  return new Promise((resolve) => {
    const started = Date.now();
    let last = el.getBoundingClientRect();
    let stableReads = 0;
    const poll = (): void => {
      const next = el.getBoundingClientRect();
      stableReads =
        next.top === last.top && next.left === last.left ? stableReads + 1 : 0;
      last = next;
      if (stableReads >= 2 || Date.now() - started >= SCROLL_SETTLE_MAX_MS) {
        resolve(next);
        return;
      }
      window.setTimeout(poll, SCROLL_SETTLE_POLL_MS);
    };
    window.setTimeout(poll, SCROLL_SETTLE_POLL_MS);
  });
}

export function createAegisRuntime(deps: RuntimeDeps = {}): AegisRuntime {
  const registry = new Map<string, RegisteredAction>();
  const surfaces = new Map<string, RegisteredSurface>();
  const providers = new Map<string, SearchProvider>();
  const listeners = new Set<(e: AegisEvent) => void>();
  let shellGetter: (() => ShellSnapshot) | null = null;
  let navigateImpl: ((to: string) => void) | null = deps.navigate ?? null;
  // v0: selection lives in a single shell-global slot updated by actions.
  let selection: EntityRef[] = [];

  const emit = (e: AegisEvent): void => {
    for (const l of listeners) {
      try {
        l(e);
      } catch (err) {
        // Listener errors must not poison the dispatch path.
        console.error('aegis runtime listener threw', err);
      }
    }
  };

  const currentShell = (): ShellSnapshot =>
    shellGetter ? shellGetter() : defaultShellSnapshot();

  const boundActionIds = (s: RegisteredSurface): string[] => {
    const rendered = new Set<string>();
    const root = s.getElement?.();
    if (root) {
      for (const el of root.querySelectorAll('[data-agent-action-id]')) {
        const id = el.getAttribute('data-agent-action-id');
        if (id) {
          rendered.add(id);
        }
      }
    }
    const ids: string[] = [];
    for (const { action, source } of registry.values()) {
      if (
        rendered.has(action.id) ||
        action.appliesTo?.surfaceKind === s.kind ||
        (source.kind === 'component' && source.surfaceId === s.id)
      ) {
        ids.push(action.id);
      }
    }
    return ids;
  };

  const projectSurface = (s: RegisteredSurface): SurfaceSnapshot => {
    const { entities, fields } = s.getProjection();
    return {
      id: s.id,
      kind: s.kind,
      appId: s.appId,
      label: s.label,
      entities,
      fields,
      actionIds: boundActionIds(s),
      bbox: s.getBBox?.(),
      inViewport: s.getInViewport?.() ?? true,
      askSuggestions: s.askSuggestions,
    };
  };

  const projectSurfaces = (): SurfaceSnapshot[] =>
    [...surfaces.values()].map(projectSurface);

  const snapshot = (): AegisSnapshot => ({
    timestamp: Date.now(),
    shell: currentShell(),
    surfaces: projectSurfaces(),
    selection: [...selection],
    focus: { surfaceId: null, entityId: null },
    appData: {},
  });

  const describe = (entry: RegisteredAction): AegisActionDescriptor => {
    const { action, source } = entry;
    return {
      id: action.id,
      label: action.label,
      description: action.description,
      category: action.category,
      paramsSchema: action.paramsSchema,
      resultSchema: action.resultSchema,
      available: true,
      invocableBy: action.invocableBy ?? 'both',
      confirm: action.confirm,
      source,
    };
  };

  const describeIds = (ids: Iterable<string>): AegisActionDescriptor[] => {
    const out: AegisActionDescriptor[] = [];
    for (const id of ids) {
      const entry = registry.get(id);
      if (entry) {
        out.push(describe(entry));
      }
    }
    return out;
  };

  const listActions = (filter?: ListActionsFilter): AegisActionDescriptor[] => {
    const out: AegisActionDescriptor[] = [];
    for (const entry of registry.values()) {
      const desc = describe(entry);
      if (
        filter?.available !== undefined &&
        desc.available !== filter.available
      ) {
        continue;
      }
      if (
        filter?.invocableBy &&
        !canInvoke(desc.invocableBy, filter.invocableBy)
      ) {
        continue;
      }
      if (filter?.appId && desc.source.appId !== filter.appId) {
        continue;
      }
      out.push(desc);
    }
    return out;
  };

  const getAction = (id: string): AegisActionDescriptor | null => {
    const entry = registry.get(id);
    return entry ? describe(entry) : null;
  };

  const refusal = (
    entry: RegisteredAction,
    by: InvocationSource,
    mode: 'run' | 'preview',
  ): AegisError | null => {
    const { id, invocableBy = 'both', confirm } = entry.action;
    if (!canInvoke(invocableBy, by)) {
      return {
        code: 'unavailable',
        message: `Action "${id}" can only be invoked by the ${invocableBy}.`,
      };
    }
    if (mode === 'run' && by === 'agent' && confirm?.danger) {
      return {
        code: 'needs_confirm',
        message: `Action "${id}" is marked dangerous; only the user can run it.`,
      };
    }
    return null;
  };

  const makeContext = (
    entry: RegisteredAction,
    by: InvocationSource,
    correlationId: string,
    overrides: Partial<Pick<ActionContext, 'navigate' | 'signal'>> = {},
  ): ActionContext => ({
    appId: entry.source.appId,
    navigate:
      overrides.navigate ?? navigateImpl ?? ((_to: string) => undefined),
    snapshot,
    toast: deps.toast ?? ((_msg: string) => undefined),
    correlationId,
    invokedBy: by,
    signal: overrides.signal ?? new AbortController().signal,
  });

  const dispatch = async <R = unknown>(
    id: string,
    params: unknown = undefined,
    opts: {
      correlationId?: string;
      by?: InvocationSource;
      signal?: AbortSignal;
    } = {},
  ): Promise<DispatchResult<R>> => {
    const correlationId = opts.correlationId ?? uniqueId('aegis');
    const by: InvocationSource = opts.by ?? 'user';
    const fail = (error: AegisError): DispatchResult<R> => {
      emit({ type: 'action.failed', correlationId, error });
      return { ok: false, error, correlationId };
    };
    const entry = registry.get(id);
    if (!entry) {
      return fail(unknownActionError(id));
    }
    const refused = refusal(entry, by, 'run');
    if (refused) {
      return fail(refused);
    }

    emit({ type: 'action.invoked', id, params, by, correlationId });
    const start = Date.now();
    try {
      const result = (await entry.action.run(
        params,
        makeContext(entry, by, correlationId, { signal: opts.signal }),
      )) as R;
      emit({
        type: 'action.completed',
        correlationId,
        result,
        durationMs: Date.now() - start,
      });
      return { ok: true, result, correlationId };
    } catch (err) {
      return fail(thrownError(err));
    }
  };

  const preview = async (
    id: string,
    params: unknown = undefined,
    opts: { by?: InvocationSource; signal?: AbortSignal } = {},
  ): Promise<PreviewResult> => {
    const by: InvocationSource = opts.by ?? 'user';
    const entry = registry.get(id);
    if (!entry) {
      return { ok: false, error: unknownActionError(id) };
    }
    const refused = refusal(entry, by, 'preview');
    if (refused) {
      return { ok: false, error: refused };
    }
    const action = describe(entry);
    if (!entry.action.dryRun) {
      return { ok: true, action, params };
    }
    try {
      const result = await entry.action.dryRun(
        params,
        makeContext(entry, by, uniqueId('aegis'), {
          navigate: (_to: string) => undefined,
          signal: opts.signal,
        }),
      );
      return { ok: true, action, params, preview: result };
    } catch (err) {
      return { ok: false, error: thrownError(err) };
    }
  };

  const subscribe = (listener: (e: AegisEvent) => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const _register: AegisRuntime['_register'] = (entry) => {
    const { id } = entry.action;
    if (registry.has(id)) {
      // Per design doc §10.1 — collisions are silent overwrites otherwise.
      console.warn(
        `[aegis] action id collision: "${id}" is being re-registered. ` +
          `Most-recent registration wins.`,
      );
    }
    registry.set(id, entry);
    emit({ type: 'registry.changed', added: [id], removed: [] });
    return () => {
      const current = registry.get(id);
      if (current === entry) {
        registry.delete(id);
        emit({ type: 'registry.changed', added: [], removed: [id] });
      }
    };
  };

  const _setShellSnapshot: AegisRuntime['_setShellSnapshot'] = (getter) => {
    shellGetter = getter;
  };

  const _registerSurface: AegisRuntime['_registerSurface'] = (entry) => {
    if (surfaces.has(entry.id)) {
      console.warn(
        `[aegis] surface id collision: "${entry.id}" is being re-registered. ` +
          `Most-recent registration wins.`,
      );
    }
    surfaces.set(entry.id, entry);
    emit({ type: 'snapshot.changed', diff: { added: [entry.id] } });
    return () => {
      const current = surfaces.get(entry.id);
      if (current === entry) {
        surfaces.delete(entry.id);
        emit({ type: 'snapshot.changed', diff: { removed: [entry.id] } });
      }
    };
  };

  const setSelection: AegisRuntime['setSelection'] = (refs) => {
    selection = [...refs];
  };

  const _setNavigate: AegisRuntime['_setNavigate'] = (nav) => {
    navigateImpl = nav;
  };

  const _registerSearchProvider: AegisRuntime['_registerSearchProvider'] = (
    provider,
  ) => {
    if (providers.has(provider.id)) {
      console.warn(
        `[aegis] search provider id collision: "${provider.id}" is being ` +
          `re-registered. Most-recent registration wins.`,
      );
    }
    providers.set(provider.id, provider);
    return () => {
      const current = providers.get(provider.id);
      if (current === provider) {
        providers.delete(provider.id);
      }
    };
  };

  const inspect = (ref: AegisRef): AegisInspectResult | null => {
    if (ref.kind === 'surface') {
      const registered = surfaces.get(ref.surfaceId);
      if (!registered) {
        return null;
      }
      const surface = projectSurface(registered);
      return {
        ref,
        surface,
        entities: surface.entities,
        actions: describeIds(surface.actionIds),
      };
    }
    if (ref.kind === 'entity') {
      const scope = projectSurfaces().filter(
        (s) => ref.surfaceId === undefined || s.id === ref.surfaceId,
      );
      const found = findSurfaceContaining(scope, ref.entityId);
      if (!found) {
        return null;
      }
      const { surface, entity } = found;
      // Right-click intuition: actions on an entity ⊇ actions on its container surface.
      const ids = new Set(surface.actionIds);
      for (const { action } of registry.values()) {
        if (action.appliesTo?.entityType === entity.type) {
          ids.add(action.id);
        }
      }
      return { ref, surface, entity, actions: describeIds(ids) };
    }
    if (ref.kind === 'action') {
      const entry = registry.get(ref.actionId);
      if (!entry) {
        return null;
      }
      const surface = projectSurfaces().find((s) =>
        s.actionIds.includes(ref.actionId),
      );
      return { ref, action: describe(entry), surface, actions: [] };
    }
    // route
    const actions: AegisActionDescriptor[] = [];
    for (const entry of registry.values()) {
      if (entry.source.kind === 'app' && entry.source.appId === ref.appId) {
        actions.push(describe(entry));
      }
    }
    return { ref, actions };
  };

  const scoreFor = (
    needle: string,
    label: string | undefined,
    id: string,
    description: string | undefined,
  ): number => {
    const q = needle.toLowerCase();
    const lab = (label ?? '').toLowerCase();
    const idl = id.toLowerCase();
    const desc = (description ?? '').toLowerCase();
    if (lab && lab === q) {
      return 1.0;
    }
    if (lab.startsWith(q)) {
      return 0.8;
    }
    if (lab.includes(q)) {
      return 0.6;
    }
    if (idl.includes(q)) {
      return 0.4;
    }
    if (desc.includes(q)) {
      return 0.2;
    }
    return 0;
  };

  const search = async (
    query: string,
    opts: SearchOptions = {},
  ): Promise<AegisSearchResponse> => {
    const limit = opts.limit ?? 20;
    const requestedKinds = new Set<AegisRef['kind']>(
      opts.kinds ?? ['surface', 'entity', 'action', 'route'],
    );
    const results: AegisSearchResult[] = [];

    if (query.length > 0) {
      for (const s of projectSurfaces()) {
        if (opts.appId && s.appId !== opts.appId) {
          continue;
        }
        if (requestedKinds.has('surface')) {
          const score = scoreFor(query, s.label, s.id, undefined);
          if (score > 0) {
            results.push({
              ref: { kind: 'surface', surfaceId: s.id },
              kind: 'surface',
              label: s.label ?? s.id,
              appId: s.appId,
              source: 'snapshot',
              score,
            });
          }
        }
        if (requestedKinds.has('entity') && s.entities) {
          for (const e of s.entities) {
            let score = scoreFor(query, e.label, e.id, undefined);
            const typeScore = scoreFor(query, e.type, e.type, undefined);
            if (typeScore > score) {
              score = typeScore;
            }
            if (score > 0) {
              results.push({
                ref: { kind: 'entity', entityId: e.id, surfaceId: s.id },
                kind: 'entity',
                label: e.label ?? e.id,
                appId: s.appId,
                source: 'snapshot',
                score,
              });
            }
          }
        }
      }
      if (requestedKinds.has('action')) {
        for (const entry of registry.values()) {
          const a = entry.action;
          let score = scoreFor(query, a.label, a.id, a.description);
          if (a.keywords) {
            for (const kw of a.keywords) {
              const ks = scoreFor(query, kw, kw, undefined);
              if (ks > score) {
                score = ks;
              }
            }
          }
          if (score > 0) {
            results.push({
              ref: { kind: 'action', actionId: a.id },
              kind: 'action',
              label: a.label,
              source: 'snapshot',
              score,
            });
          }
        }
      }
    }

    // Provider search — parallel, AbortSignal aware.
    const providerCtl = new AbortController();
    const onAbort = (): void => {
      providerCtl.abort();
    };
    if (opts.signal) {
      if (opts.signal.aborted) {
        providerCtl.abort();
      } else {
        opts.signal.addEventListener('abort', onAbort);
      }
    }
    const eligibleProviders = [...providers.values()].filter((p) => {
      if (opts.appId && p.appId !== opts.appId) {
        return false;
      }
      if (!p.kinds.some((k) => requestedKinds.has(k))) {
        return false;
      }
      if (p.matches && !p.matches(query)) {
        return false;
      }
      return true;
    });

    const failedProviders: AegisSearchResponse['failedProviders'] = [];
    const providerResults = await Promise.all(
      eligibleProviders.map(async (p) => {
        try {
          const r = await p.search(query, {
            limit,
            signal: providerCtl.signal,
          });
          return r.map((hit) => ({ ...hit, source: 'provider' as const }));
        } catch (err) {
          // A provider that stops because the caller aborted has not failed.
          if (!providerCtl.signal.aborted) {
            failedProviders.push({
              providerId: p.id,
              message: err instanceof Error ? err.message : String(err),
            });
          }
          return [] as AegisSearchResult[];
        }
      }),
    );
    if (opts.signal) {
      opts.signal.removeEventListener('abort', onAbort);
    }
    for (const arr of providerResults) {
      for (const hit of arr) {
        results.push(hit);
      }
    }

    // Dedupe by ref — snapshot wins on conflict.
    const refKey = (r: AegisRef): string => {
      switch (r.kind) {
        case 'surface':
          return `s:${r.surfaceId}`;
        case 'entity':
          return `e:${r.entityId}`;
        case 'action':
          return `a:${r.actionId}`;
        case 'route':
          return `r:${r.appId}:${r.pathname}`;
      }
    };
    const seen = new Map<string, AegisSearchResult>();
    for (const hit of results) {
      const k = refKey(hit.ref);
      const prev = seen.get(k);
      if (!prev) {
        seen.set(k, hit);
      } else if (prev.source === 'provider' && hit.source === 'snapshot') {
        seen.set(k, hit);
      }
    }
    const out = [...seen.values()].sort((a, b) => b.score - a.score);
    return { results: out.slice(0, limit), failedProviders };
  };

  const highlight = async (
    ref: AegisRef,
  ): Promise<{ found: boolean; bbox?: DOMRect }> => {
    if (typeof document === 'undefined') {
      return { found: false };
    }
    const selector = refToSelector(ref);
    const el = selector ? document.querySelector(selector) : null;
    if (!(el instanceof HTMLElement)) {
      return { found: false };
    }
    const instant =
      document.visibilityState === 'hidden' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({
      block: 'center',
      behavior: instant ? 'auto' : 'smooth',
    });
    el.setAttribute('data-aegis-highlight', 'true');
    window.setTimeout(() => {
      el.removeAttribute('data-aegis-highlight');
    }, HIGHLIGHT_DURATION_MS);
    const bbox = instant ? el.getBoundingClientRect() : await settledRect(el);
    return { found: true, bbox };
  };

  const surfacesIn = (surfaceId: string | undefined): RegisteredSurface[] => {
    if (surfaceId === undefined) {
      return [...surfaces.values()];
    }
    const s = surfaces.get(surfaceId);
    return s ? [s] : [];
  };

  const isPresent = (
    ref: Extract<AegisWaitCondition, { kind: 'present' }>['ref'],
  ): boolean => {
    switch (ref.kind) {
      case 'surface':
        return surfaces.has(ref.surfaceId);
      case 'action':
        return registry.has(ref.actionId);
      case 'entity':
        return surfacesIn(ref.surfaceId).some(
          (s) =>
            s.getProjection().entities?.some((e) => e.id === ref.entityId) ??
            false,
        );
    }
  };

  const conditionHolds = (condition: AegisWaitCondition): boolean => {
    switch (condition.kind) {
      case 'present':
        return isPresent(condition.ref);
      case 'absent':
        return !isPresent(condition.ref);
      case 'route':
        return currentShell().route.pathname === condition.pathname;
      case 'text': {
        const needle = condition.text.toLowerCase();
        return surfacesIn(condition.surfaceId).some((s) => {
          const { entities = [], fields = [] } = s.getProjection();
          return (
            containsText(needle, [s.label]) ||
            entities.some((e) =>
              containsText(needle, [
                e.id,
                e.label,
                ...Object.values(e.data ?? {}),
              ]),
            ) ||
            fields.some((f) => containsText(needle, [f.label, f.value]))
          );
        });
      }
      case 'field':
        return (
          surfaces
            .get(condition.surfaceId)
            ?.getProjection()
            .fields?.some(
              (f) => f.name === condition.name && f.value === condition.value,
            ) ?? false
        );
    }
  };

  const waitFor = (
    condition: AegisWaitCondition,
    opts: WaitForOptions = {},
  ): Promise<AegisSnapshot> => {
    const timeoutMs = Math.min(
      Math.max(opts.timeoutMs ?? WAIT_FOR_DEFAULT_TIMEOUT_MS, 0),
      WAIT_FOR_MAX_TIMEOUT_MS,
    );
    const { signal } = opts;
    return new Promise((resolve, reject) => {
      const aborted: AegisError = {
        code: 'aborted',
        message: 'waitFor was aborted',
      };
      if (signal?.aborted) {
        reject(aborted);
        return;
      }
      let settled = false;
      const settle = (finish: () => void): void => {
        if (settled) {
          return;
        }
        settled = true;
        unsubscribe();
        window.clearInterval(poll);
        window.clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        finish();
      };
      const check = (): void => {
        try {
          if (conditionHolds(condition)) {
            const snap = snapshot();
            settle(() => {
              resolve(snap);
            });
          }
        } catch (err) {
          const error = thrownError(err);
          settle(() => {
            reject(error);
          });
        }
      };
      const onAbort = (): void => {
        settle(() => {
          reject(aborted);
        });
      };
      const unsubscribe = subscribe((e) => {
        if (e.type === 'snapshot.changed' || e.type === 'registry.changed') {
          check();
        }
      });
      const poll = window.setInterval(check, WAIT_FOR_POLL_MS);
      const timer = window.setTimeout(() => {
        const error: AegisError = {
          code: 'timeout',
          message: `waitFor: condition not met within ${String(timeoutMs)} ms`,
        };
        settle(() => {
          reject(error);
        });
      }, timeoutMs);
      signal?.addEventListener('abort', onAbort);
      check();
    });
  };

  // Built-in app-level navigate action — sugar for aegis_navigate MCP tool.
  registry.set('aegis.navigate', {
    action: {
      id: 'aegis.navigate',
      label: 'Navigate',
      description:
        'Navigate to a path on this site, resolved like a link; other origins are refused.',
      paramsSchema: {
        type: 'object',
        properties: { to: { type: 'string' } },
        required: ['to'],
      },
      invocableBy: 'both',
      run: (params, ctx) => {
        const to = sameOriginPath(navigateTarget(params));
        ctx.navigate(to);
        return { to };
      },
      dryRun: (params) => ({
        summary: `would navigate to ${sameOriginPath(navigateTarget(params))}`,
      }),
    },
    source: { kind: 'app', appId: 'aegis' },
  });

  const onAskTriggered = (handler: (ctx: AskContext) => void): (() => void) => {
    return subscribe((e) => {
      if (e.type === 'ask.triggered') {
        handler(e.context);
      }
    });
  };

  const emitAskTriggered = (ctx: AskContext): void => {
    emit({ type: 'ask.triggered', context: ctx });
  };

  const emitAskSubmit = (req: AskRequest): void => {
    emit({ type: 'ask.submit', request: req });
  };

  return {
    snapshot,
    listActions,
    getAction,
    inspect,
    search,
    highlight,
    waitFor,
    dispatch,
    preview,
    subscribe,
    onAskTriggered,
    emitAskTriggered,
    emitAskSubmit,
    _register,
    _registerSurface,
    _registerSearchProvider,
    setSelection,
    _setShellSnapshot,
    _setNavigate,
  };
}
