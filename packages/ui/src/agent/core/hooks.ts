import {
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { AegisRuntimeContext } from './aegisRuntimeContext';
import type {
  AegisAction,
  SearchProvider,
  SurfaceKind,
  SurfaceSnapshot,
} from './types';

export interface UseAegisActionResult<P, R> {
  invoke: (params: P) => Promise<R>;
  available: boolean;
  unavailableReason?: string;
}

export function useAegisAction<P = void, R = unknown>(
  action: AegisAction<P, R> | null | undefined,
): UseAegisActionResult<P, R> {
  const ctx = useContext(AegisRuntimeContext);
  const actionRef = useRef(action);
  actionRef.current = action;

  useEffect(() => {
    if (!ctx || !action) {
      return;
    }
    const appId = ctx.appId ?? 'unknown';
    const unregister = ctx.runtime._register({
      action: action as AegisAction<unknown, unknown>,
      source: { kind: 'component', appId, nodeId: action.id },
    });
    return unregister;
    // Re-register only when identity-relevant fields change. We intentionally
    // skip deep-comparing the whole action object to avoid noisy re-mounts.
  }, [ctx, action]);

  const invoke = useCallback(
    async (params: P): Promise<R> => {
      const current = actionRef.current;
      if (!ctx || !current) {
        throw new Error(
          'useAegisAction.invoke called without an AegisRuntimeProvider or action',
        );
      }
      const result = await ctx.runtime.dispatch<R>(current.id, params, {
        by: 'user',
      });
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.result;
    },
    [ctx],
  );

  return useMemo(
    () => ({ invoke, available: Boolean(ctx && action) }),
    [invoke, ctx, action],
  );
}

export interface UseAegisSurfaceOptions<T> {
  id: string;
  kind: SurfaceKind;
  label?: string;
  data: T;
  project: (data: T) => Pick<SurfaceSnapshot, 'entities' | 'fields'>;
  ref?: RefObject<HTMLElement | null>;
  askSuggestions?: string[];
  /** When false the hook is a no-op — lets callers skip registration. */
  enabled?: boolean;
}

export interface UseAegisSurfaceResult {
  surfaceId: string;
}

export function useAegisSurface<T>(
  opts: UseAegisSurfaceOptions<T>,
): UseAegisSurfaceResult {
  const ctx = useContext(AegisRuntimeContext);
  const dataRef = useRef(opts.data);
  dataRef.current = opts.data;
  const projectRef = useRef(opts.project);
  projectRef.current = opts.project;
  const { ref, enabled = true } = opts;
  const refRef = useRef(ref);
  refRef.current = ref;

  useEffect(() => {
    if (!ctx || !enabled) {
      return;
    }
    const appId = ctx.appId ?? 'unknown';
    // Measured when the runtime takes a snapshot, not on every scroll.
    const rect = (): DOMRect | undefined =>
      refRef.current?.current?.getBoundingClientRect();
    const unregister = ctx.runtime._registerSurface({
      id: opts.id,
      kind: opts.kind,
      appId,
      label: opts.label,
      askSuggestions: opts.askSuggestions,
      getProjection: () => projectRef.current(dataRef.current),
      getBBox: () => {
        const r = rect();
        return r && { x: r.x, y: r.y, width: r.width, height: r.height };
      },
      getInViewport: () => {
        const r = rect();
        return (
          !r ||
          (r.bottom > 0 &&
            r.right > 0 &&
            r.top < window.innerHeight &&
            r.left < window.innerWidth)
        );
      },
    });
    return unregister;
  }, [ctx, enabled, opts.id, opts.kind, opts.label, opts.askSuggestions]);

  return { surfaceId: opts.id };
}

export function useAegisSearchProvider(provider: SearchProvider): void {
  const ctx = useContext(AegisRuntimeContext);
  const providerRef = useRef(provider);
  providerRef.current = provider;
  useEffect(() => {
    if (!ctx) {
      return;
    }
    // Stable wrapper so the registered identity tracks the latest provider.
    const wrapped: SearchProvider = {
      id: provider.id,
      appId: provider.appId,
      kinds: provider.kinds,
      matches: (q) => providerRef.current.matches?.(q) ?? true,
      search: (q, opts) => providerRef.current.search(q, opts),
    };
    return ctx.runtime._registerSearchProvider(wrapped);
    // Re-register only on identity-relevant fields.
  }, [ctx, provider.id, provider.appId, provider.kinds]);
}
