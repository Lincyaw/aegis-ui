import {
  type ReactElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import './AskOverlay.css';
import { AskPanel } from './AskPanel';
import { AegisAgentContext } from './aegisAgentContext';
import { type AskTrigger, buildAskContext } from './buildAskContext';
import type { AskContext, AskOrigin } from './types';

interface PanelState {
  context: AskContext;
  anchor: DOMRect | null;
}

interface TriggerInfo {
  origin: AskOrigin;
  surfaceId?: string;
  entityId?: string;
  actionId?: string;
  el: HTMLElement;
}

function findTrigger(target: EventTarget | null): TriggerInfo | null {
  if (!(target instanceof Element)) {
    return null;
  }
  let el: Element | null = target;
  let entityId: string | undefined;
  let surfaceId: string | undefined;
  let actionId: string | undefined;
  let host: HTMLElement | null = null;
  while (el) {
    if (el instanceof HTMLElement) {
      if (el.dataset.agentAsk === 'off') {
        return null;
      }
      if (entityId === undefined && el.dataset.agentEntityId) {
        entityId = el.dataset.agentEntityId;
        host = host ?? el;
      }
      if (surfaceId === undefined && el.dataset.agentSurfaceId) {
        surfaceId = el.dataset.agentSurfaceId;
        host = host ?? el;
      }
      if (actionId === undefined && el.dataset.agentActionId) {
        actionId = el.dataset.agentActionId;
        host = host ?? el;
      }
    }
    el = el.parentElement;
  }
  if (!host || (!entityId && !surfaceId && !actionId)) {
    return null;
  }
  const origin: AskOrigin = entityId
    ? 'entity'
    : actionId
      ? 'action'
      : 'surface';
  return { origin, surfaceId, entityId, actionId, el: host };
}

export function AskOverlay(): ReactElement | null {
  const ctx = useContext(AegisAgentContext);
  const runtime = ctx?.runtime ?? null;
  const [panel, setPanel] = useState<PanelState | null>(null);

  const open = useCallback((context: AskContext, anchor: DOMRect | null) => {
    setPanel({ context, anchor });
  }, []);

  const close = useCallback(() => {
    setPanel(null);
  }, []);

  // Handle right-click + keyboard triggers (delegated on document).
  useEffect(() => {
    if (!runtime) {
      return;
    }
    const onContextMenu = (e: MouseEvent): void => {
      if (e.shiftKey) {
        return;
      }
      const trigger = findTrigger(e.target);
      if (!trigger) {
        return;
      }
      e.preventDefault();
      const askContext = buildAskContext(runtime, trigger);
      runtime.emitAskTriggered(askContext);
      open(askContext, trigger.el.getBoundingClientRect());
    };
    const onKeyDown = (e: KeyboardEvent): void => {
      const isAsk = (e.metaKey || e.ctrlKey) && e.key === '.';
      if (!isAsk) {
        return;
      }
      const target = (e.target as Element | null) ?? document.activeElement;
      const trigger = findTrigger(target);
      if (!trigger) {
        return;
      }
      e.preventDefault();
      const askContext = buildAskContext(runtime, trigger);
      runtime.emitAskTriggered(askContext);
      open(askContext, trigger.el.getBoundingClientRect());
    };
    document.addEventListener('contextmenu', onContextMenu, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [runtime, open]);

  // Programmatic open: external code subscribes via runtime.onAskTriggered
  // and may not need the panel; AskOverlay opens the default panel only for
  // overlay-triggered events. For test/demo paths we expose a window helper.
  useEffect(() => {
    if (!runtime || typeof window === 'undefined') {
      return;
    }
    interface AskWindow extends Window {
      __aegisOpenAskPanel?: (
        trigger: AskTrigger,
        anchorEl?: HTMLElement | null,
      ) => void;
    }
    const w = window as AskWindow;
    w.__aegisOpenAskPanel = (trigger, anchorEl) => {
      const askContext = buildAskContext(runtime, trigger);
      runtime.emitAskTriggered(askContext);
      open(askContext, anchorEl?.getBoundingClientRect() ?? null);
    };
    return () => {
      if (w.__aegisOpenAskPanel) {
        delete w.__aegisOpenAskPanel;
      }
    };
  }, [runtime, open]);

  const portalled = useMemo(() => {
    if (!panel) {
      return null;
    }
    return (
      <AskPanel
        context={panel.context}
        anchorRect={panel.anchor}
        onClose={close}
      />
    );
  }, [panel, close]);

  if (!portalled) {
    return null;
  }
  return <div className="aegis-ask-overlay">{portalled}</div>;
}

export default AskOverlay;
