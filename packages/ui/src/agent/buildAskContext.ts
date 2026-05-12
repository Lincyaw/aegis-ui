import type { AegisRuntime } from './runtime';
import type {
  AegisSnapshot,
  AskContext,
  AskOrigin,
  EntityProjection,
  SurfaceSnapshot,
} from './types';

export interface AskTrigger {
  origin: AskOrigin;
  surfaceId?: string;
  entityId?: string;
  actionId?: string;
}

function findSurface(
  snap: AegisSnapshot,
  surfaceId?: string,
  entityId?: string,
): SurfaceSnapshot | undefined {
  if (surfaceId) {
    const direct = snap.surfaces.find((s) => s.id === surfaceId);
    if (direct) {
      return direct;
    }
  }
  if (entityId) {
    return snap.surfaces.find((s) =>
      s.entities?.some((e) => e.id === entityId),
    );
  }
  return undefined;
}

function findEntity(
  snap: AegisSnapshot,
  entityId?: string,
): EntityProjection | undefined {
  if (!entityId) {
    return undefined;
  }
  for (const s of snap.surfaces) {
    const e = s.entities?.find((x) => x.id === entityId);
    if (e) {
      return e;
    }
  }
  return undefined;
}

export function buildAskContext(
  runtime: AegisRuntime,
  trigger: AskTrigger,
): AskContext {
  const snapshot = runtime.snapshot();
  const surface = findSurface(snapshot, trigger.surfaceId, trigger.entityId);
  const entity = findEntity(snapshot, trigger.entityId);
  let action: AskContext['action'];
  if (trigger.actionId) {
    const desc = runtime.getAction(trigger.actionId);
    if (desc) {
      action = { id: desc.id, label: desc.label };
    }
  }
  return {
    origin: trigger.origin,
    appId: snapshot.shell.currentAppId ?? surface?.appId ?? 'unknown',
    surface: surface
      ? { id: surface.id, kind: surface.kind, label: surface.label }
      : undefined,
    entity,
    action,
    suggestions: surface?.askSuggestions ?? [],
    snapshot,
  };
}
