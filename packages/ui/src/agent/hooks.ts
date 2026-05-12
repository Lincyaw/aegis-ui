import {
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AegisAgentContext } from './aegisAgentContext';
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
  const ctx = useContext(AegisAgentContext);
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
          'useAegisAction.invoke called without an AegisAgentProvider or action',
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
  const ctx = useContext(AegisAgentContext);
  const dataRef = useRef(opts.data);
  dataRef.current = opts.data;
  const projectRef = useRef(opts.project);
  projectRef.current = opts.project;
  const { ref, enabled = true } = opts;

  const [bbox, setBBox] = useState<SurfaceSnapshot['bbox']>(undefined);
  const [inViewport, setInViewport] = useState<boolean>(true);

  useEffect(() => {
    if (!ctx || !enabled) {
      return;
    }
    const appId = ctx.appId ?? 'unknown';
    const unregister = ctx.runtime._registerSurface({
      id: opts.id,
      kind: opts.kind,
      appId,
      label: opts.label,
      askSuggestions: opts.askSuggestions,
      getProjection: () => projectRef.current(dataRef.current),
      getBBox: () => bbox,
      getInViewport: () => inViewport,
    });
    return unregister;
  }, [
    ctx,
    enabled,
    opts.id,
    opts.kind,
    opts.label,
    opts.askSuggestions,
    bbox,
    inViewport,
  ]);

  // bbox + inViewport — measured on mount + window resize for v0.
  useEffect(() => {
    const el = ref?.current;
    if (!el || typeof window === 'undefined') {
      return;
    }
    const measure = (): void => {
      const r = el.getBoundingClientRect();
      setBBox({ x: r.x, y: r.y, width: r.width, height: r.height });
      setInViewport(
        r.bottom > 0 &&
          r.right > 0 &&
          r.top < window.innerHeight &&
          r.left < window.innerWidth,
      );
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [ref]);

  return { surfaceId: opts.id };
}

export function useAegisSearchProvider(provider: SearchProvider): void {
  const ctx = useContext(AegisAgentContext);
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
