// Agent runtime — Layer 3 in docs/agent-native-ui.md.
// v0 deliberately ignores `confirm`, `dryRun`, and `availability` enforcement:
// every dispatch goes straight through `run()`. Those gates land in a later
// slice once the human-trigger / Ask-overlay layer is wired.
import { MCP_TOOL_CATALOGUE } from './mcpToolCatalogue';
import type {
  ActionContext,
  ActionSource,
  AegisAction,
  AegisActionDescriptor,
  AegisError,
  AegisEvent,
  AegisInspectResult,
  AegisRef,
  AegisSearchResult,
  AegisSnapshot,
  AskContext,
  AskRequest,
  DispatchResult,
  EntityProjection,
  EntityRef,
  FieldProjection,
  InvocationSource,
  McpToolDefinition,
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
  getBBox?: () => SurfaceSnapshot['bbox'];
  getInViewport?: () => boolean;
  askSuggestions?: string[];
}

export interface ListActionsFilter {
  available?: boolean;
  appId?: string;
  invocableBy?: InvocationSource;
}

export interface SearchOptions {
  kinds?: Array<AegisRef['kind']>;
  appId?: string;
  limit?: number;
  signal?: AbortSignal;
}

export interface AegisRuntime {
  snapshot(): AegisSnapshot;
  listActions(filter?: ListActionsFilter): AegisActionDescriptor[];
  getAction(id: string): AegisActionDescriptor | null;
  inspect(ref: AegisRef): AegisInspectResult | null;
  search(query: string, opts?: SearchOptions): Promise<AegisSearchResult[]>;
  highlight(ref: AegisRef): Promise<{ found: boolean; bbox?: DOMRect }>;
  waitFor(
    predicate: string,
    opts?: { timeoutMs?: number; signal?: AbortSignal },
  ): Promise<AegisSnapshot>;
  toMcpTools(): McpToolDefinition[];
  dispatch<R = unknown>(
    id: string,
    params?: unknown,
    opts?: {
      force?: boolean;
      correlationId?: string;
      by?: InvocationSource;
    },
  ): Promise<DispatchResult<R>>;
  subscribe(listener: (e: AegisEvent) => void): () => void;
  /** Subscribe specifically to ask-triggered events (sugar over subscribe). */
  onAskTriggered(handler: (ctx: AskContext) => void): () => void;
  /** Emit an ask-triggered event. Used by AskOverlay + programmatic openers. */
  emitAskTriggered(ctx: AskContext): void;
  /** Emit an ask-submit event. Env-only — there is no transport yet. */
  emitAskSubmit(req: AskRequest): void;
  // Internal — used by hooks / shell, not part of the agent-facing API.
  _register(entry: RegisteredAction): () => void;
  _registerSurface(entry: RegisteredSurface): () => void;
  _registerSearchProvider(provider: SearchProvider): () => void;
  _setSelection(refs: EntityRef[]): void;
  _setShellSnapshot(getter: () => ShellSnapshot): void;
  _setNavigate(nav: (to: string) => void): void;
}

export interface RuntimeDeps {
  navigate?: (to: string) => void;
  toast?: (msg: string, level?: 'info' | 'warn' | 'error') => void;
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
        // eslint-disable-next-line no-console
        // Listener errors must not poison the dispatch path.
        console.error('aegis runtime listener threw', err);
      }
    }
  };

  const defaultShell: ShellSnapshot = {
    currentAppId: null,
    route: { pathname: '/', search: '', params: {} },
    breadcrumbs: [],
    theme: 'light',
    viewport: { width: 0, height: 0 },
  };

  const projectSurfaces = (): SurfaceSnapshot[] => {
    const out: SurfaceSnapshot[] = [];
    for (const s of surfaces.values()) {
      const proj = s.getProjection();
      const actionIds: string[] = [];
      for (const entry of registry.values()) {
        if (
          entry.source.kind === 'component' &&
          entry.source.surfaceId === s.id
        ) {
          actionIds.push(entry.action.id);
        }
      }
      const entities: EntityProjection[] | undefined = proj.entities;
      const fields: FieldProjection[] | undefined = proj.fields;
      out.push({
        id: s.id,
        kind: s.kind,
        appId: s.appId,
        label: s.label,
        entities,
        fields,
        actionIds,
        bbox: s.getBBox?.(),
        inViewport: s.getInViewport?.() ?? true,
        askSuggestions: s.askSuggestions,
      });
    }
    return out;
  };

  const snapshot = (): AegisSnapshot => ({
    timestamp: Date.now(),
    shell: shellGetter ? shellGetter() : defaultShell,
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
      source,
    };
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
      if (filter?.invocableBy && desc.invocableBy !== filter.invocableBy) {
        continue;
      }
      if (filter?.appId) {
        const appId =
          desc.source.kind === 'app'
            ? desc.source.appId
            : desc.source.kind === 'route'
              ? desc.source.appId
              : desc.source.appId;
        if (appId !== filter.appId) {
          continue;
        }
      }
      out.push(desc);
    }
    return out;
  };

  const getAction = (id: string): AegisActionDescriptor | null => {
    const entry = registry.get(id);
    return entry ? describe(entry) : null;
  };

  const newCorrelationId = (): string =>
    `aegis-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const dispatch = async <R = unknown>(
    id: string,
    params: unknown = undefined,
    opts: {
      force?: boolean;
      correlationId?: string;
      by?: InvocationSource;
    } = {},
  ): Promise<DispatchResult<R>> => {
    const correlationId = opts.correlationId ?? newCorrelationId();
    const by: InvocationSource = opts.by ?? 'user';
    const entry = registry.get(id);
    if (!entry) {
      const error: AegisError = {
        code: 'unknown_action',
        message: `No action registered with id "${id}"`,
      };
      emit({ type: 'action.failed', correlationId, error });
      return { ok: false, error, correlationId };
    }

    const sourceAppId =
      entry.source.kind === 'app'
        ? entry.source.appId
        : entry.source.kind === 'route'
          ? entry.source.appId
          : entry.source.appId;

    const ctx: ActionContext = {
      appId: sourceAppId,
      navigate: navigateImpl ?? ((_to: string) => undefined),
      snapshot,
      toast: deps.toast ?? ((_msg: string) => undefined),
      correlationId,
      invokedBy: by,
      signal: new AbortController().signal,
    };

    emit({ type: 'action.invoked', id, params, by, correlationId });
    const start = Date.now();
    try {
      const result = (await entry.action.run(params, ctx)) as R;
      emit({
        type: 'action.completed',
        correlationId,
        result,
        durationMs: Date.now() - start,
      });
      return { ok: true, result, correlationId };
    } catch (err) {
      const error: AegisError = {
        code: 'thrown',
        message: err instanceof Error ? err.message : String(err),
        reason: err,
      };
      emit({ type: 'action.failed', correlationId, error });
      return { ok: false, error, correlationId };
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
      // eslint-disable-next-line no-console
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
    return () => {
      const current = surfaces.get(entry.id);
      if (current === entry) {
        surfaces.delete(entry.id);
      }
    };
  };

  const _setSelection: AegisRuntime['_setSelection'] = (refs) => {
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

  const findSurfaceContaining = (
    entityId: string,
  ): { surface: SurfaceSnapshot; entity: EntityProjection } | null => {
    for (const s of projectSurfaces()) {
      const e = s.entities?.find((x) => x.id === entityId);
      if (e) {
        return { surface: s, entity: e };
      }
    }
    return null;
  };

  const inspect = (ref: AegisRef): AegisInspectResult | null => {
    if (ref.kind === 'surface') {
      const surface = projectSurfaces().find((s) => s.id === ref.surfaceId);
      if (!surface) {
        return null;
      }
      const actions: AegisActionDescriptor[] = [];
      for (const entry of registry.values()) {
        const desc = describe(entry);
        if (
          entry.source.kind === 'component' &&
          entry.source.surfaceId === surface.id
        ) {
          actions.push(desc);
          continue;
        }
        if (entry.action.appliesTo?.surfaceKind === surface.kind) {
          actions.push(desc);
        }
      }
      return { ref, surface, entities: surface.entities, actions };
    }
    if (ref.kind === 'entity') {
      const found = findSurfaceContaining(ref.entityId);
      if (!found) {
        return null;
      }
      const { surface, entity } = found;
      // Right-click intuition: actions on an entity ⊇ actions on its container surface.
      const actions: AegisActionDescriptor[] = [];
      const seen = new Set<string>();
      const push = (entry: RegisteredAction): void => {
        if (seen.has(entry.action.id)) {
          return;
        }
        seen.add(entry.action.id);
        actions.push(describe(entry));
      };
      for (const entry of registry.values()) {
        if (
          entry.source.kind === 'component' &&
          entry.source.surfaceId === surface.id
        ) {
          push(entry);
          continue;
        }
        if (entry.action.appliesTo?.surfaceKind === surface.kind) {
          push(entry);
          continue;
        }
        if (entry.action.appliesTo?.entityType === entity.type) {
          push(entry);
        }
      }
      return { ref, surface, entity, actions };
    }
    if (ref.kind === 'action') {
      const entry = registry.get(ref.actionId);
      if (!entry) {
        return null;
      }
      const desc = describe(entry);
      let surface: SurfaceSnapshot | undefined;
      if (
        entry.source.kind === 'component' &&
        entry.source.surfaceId !== undefined
      ) {
        const targetSurfaceId = entry.source.surfaceId;
        surface = projectSurfaces().find((s) => s.id === targetSurfaceId);
      }
      return { ref, action: desc, surface, actions: [] };
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
  ): Promise<AegisSearchResult[]> => {
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

    const providerResults = await Promise.all(
      eligibleProviders.map(async (p) => {
        try {
          const r = await p.search(query, {
            limit,
            signal: providerCtl.signal,
          });
          return r.map((hit) => ({ ...hit, source: 'provider' as const }));
        } catch {
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
    return out.slice(0, limit);
  };

  const refToSelector = (ref: AegisRef): string | null => {
    switch (ref.kind) {
      case 'surface':
        return `[data-agent-surface-id="${ref.surfaceId}"]`;
      case 'entity':
        return `[data-agent-entity-id="${ref.entityId}"]`;
      case 'action':
        return `[data-agent-action-id="${ref.actionId}"]`;
      case 'route':
        return null;
    }
  };

  const HIGHLIGHT_DURATION_MS = 1200;
  const highlight = (
    ref: AegisRef,
  ): Promise<{ found: boolean; bbox?: DOMRect }> => {
    if (typeof document === 'undefined') {
      return Promise.resolve({ found: false });
    }
    const sel = refToSelector(ref);
    if (!sel) {
      return Promise.resolve({ found: false });
    }
    const el = document.querySelector(sel);
    if (!(el instanceof HTMLElement)) {
      return Promise.resolve({ found: false });
    }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.setAttribute('data-aegis-highlight', 'true');
    window.setTimeout(() => {
      el.removeAttribute('data-aegis-highlight');
    }, HIGHLIGHT_DURATION_MS);
    return Promise.resolve({ found: true, bbox: el.getBoundingClientRect() });
  };

  const waitFor = (
    predicate: string,
    opts: { timeoutMs?: number; signal?: AbortSignal } = {},
  ): Promise<AegisSnapshot> => {
    const timeoutMs = opts.timeoutMs ?? 5000;
    // safe-by-trust-model — runtime is local; agent already has dispatch power.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function('snap', `return (${predicate});`) as (
      snap: AegisSnapshot,
    ) => unknown;
    return new Promise((resolve, reject) => {
      const fail = (msg: string): void => {
        cleanup();
        const error: AegisError = { code: 'aborted', message: msg };
        reject(error);
      };
      const check = (): boolean => {
        const snap = snapshot();
        try {
          if (fn(snap)) {
            cleanup();
            resolve(snap);
            return true;
          }
        } catch (err) {
          fail(`waitFor predicate threw: ${String(err)}`);
          return true;
        }
        return false;
      };
      const unsub = subscribe((e) => {
        if (e.type === 'snapshot.changed' || e.type === 'registry.changed') {
          check();
        }
      });
      const tick = window.setInterval(check, 100);
      const timer = window.setTimeout(() => {
        fail(`waitFor timed out after ${String(timeoutMs)}ms: ${predicate}`);
      }, timeoutMs);
      const onAbort = (): void => {
        fail(`waitFor aborted: ${predicate}`);
      };
      if (opts.signal) {
        if (opts.signal.aborted) {
          onAbort();
          return;
        }
        opts.signal.addEventListener('abort', onAbort);
      }
      function cleanup(): void {
        unsub();
        window.clearInterval(tick);
        window.clearTimeout(timer);
        if (opts.signal) {
          opts.signal.removeEventListener('abort', onAbort);
        }
      }
      check();
    });
  };

  const toMcpTools = (): McpToolDefinition[] => MCP_TOOL_CATALOGUE;

  // Built-in app-level navigate action — sugar for aegis_navigate MCP tool.
  registry.set('aegis.navigate', {
    action: {
      id: 'aegis.navigate',
      label: 'Navigate',
      description: 'Navigate to a route inside the current app shell.',
      paramsSchema: {
        type: 'object',
        properties: { to: { type: 'string' } },
        required: ['to'],
      },
      invocableBy: 'both',
      run: (params, ctx) => {
        const p = params as { to?: unknown } | null | undefined;
        const to = typeof p?.to === 'string' ? p.to : '';
        if (!to) {
          throw new Error('aegis.navigate requires { to: string }');
        }
        ctx.navigate(to);
        return { to };
      },
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
    toMcpTools,
    dispatch,
    subscribe,
    onAskTriggered,
    emitAskTriggered,
    emitAskSubmit,
    _register,
    _registerSurface,
    _registerSearchProvider,
    _setSelection,
    _setShellSnapshot,
    _setNavigate,
  };
}
