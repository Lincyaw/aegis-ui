import type { RefObject } from 'react';

import { useAegisSurface } from './hooks';
import type { SurfaceKind, SurfaceSnapshot } from './types';

type SurfaceProjection = Pick<SurfaceSnapshot, 'entities' | 'fields'>;

interface PrimitiveSurfaceBase {
  id: string;
  kind?: SurfaceKind;
  label?: string;
  askSuggestions?: string[];
  /** When false, AskOverlay skips this surface (per docs §7.1). */
  ask?: boolean;
}

/** `surface` prop shape for primitives that project their own data. */
export interface PrimitiveSurface<T> extends PrimitiveSurfaceBase {
  project: (data: T) => SurfaceProjection;
}

/** `surface` prop shape for containers (Panel, AgentPanel) with no data. */
export interface ContainerSurface extends PrimitiveSurfaceBase {
  project?: () => SurfaceProjection;
}

export interface PrimitiveSurfaceAttrs {
  'data-agent-surface-id': string | undefined;
  'data-agent-ask': 'off' | undefined;
}

const emptyProjection = (): SurfaceProjection => ({});

/**
 * Registers a primitive's optional `surface` prop with the agent runtime
 * and returns the `data-agent-*` attributes for its root element. A no-op
 * registration when `surface` is undefined.
 */
export function usePrimitiveSurface<T>(
  surface: PrimitiveSurface<T> | ContainerSurface | undefined,
  data: T,
  defaultKind: SurfaceKind,
  ref: RefObject<HTMLElement | null>,
): PrimitiveSurfaceAttrs {
  useAegisSurface<T>({
    id: surface?.id ?? '__unused__',
    kind: surface?.kind ?? defaultKind,
    label: surface?.label,
    askSuggestions: surface?.askSuggestions,
    data,
    project: surface?.project ?? emptyProjection,
    ref,
    enabled: Boolean(surface),
  });
  return {
    'data-agent-surface-id': surface?.id,
    'data-agent-ask': surface?.ask === false ? 'off' : undefined,
  };
}
