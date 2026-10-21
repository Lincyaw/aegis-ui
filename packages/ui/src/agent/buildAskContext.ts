import { type AegisRuntime, findSurfaceContaining } from './runtime';
import type { AskContext, AskOrigin } from './types';

export interface AskTrigger {
  origin: AskOrigin;
  surfaceId?: string;
  entityId?: string;
  actionId?: string;
}

export function buildAskContext(
  runtime: AegisRuntime,
  trigger: AskTrigger,
): AskContext {
  const snapshot = runtime.snapshot();
  const found = trigger.entityId
    ? findSurfaceContaining(snapshot.surfaces, trigger.entityId)
    : null;
  const surface =
    (trigger.surfaceId
      ? snapshot.surfaces.find((s) => s.id === trigger.surfaceId)
      : undefined) ?? found?.surface;
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
    entity: found?.entity,
    action,
    suggestions: surface?.askSuggestions ?? [],
    snapshot,
  };
}
