import {
  type ReactElement,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { defaultAgentChatValue } from '../chat/chat';
import { useAgentChat } from '../chat/useAgentChat';
import { AegisRuntimeContext } from '../core/aegisRuntimeContext';
import type { AskContext, AskOrigin, AskRequest } from '../core/types';
import './AskOverlay.css';
import { AskPanel } from './AskPanel';
import { type AskTrigger, buildAskContext } from './buildAskContext';

interface PanelState {
  context: AskContext;
  anchor: DOMRect | null;
  point: { x: number; y: number } | null;
}

type TriggerInfo = AskTrigger & { el: HTMLElement };

interface AskWindow extends Window {
  __aegisOpenAskPanel?: (
    trigger: AskTrigger,
    anchorEl?: HTMLElement | null,
  ) => void;
}

interface Opener {
  owns: (el: Element | null) => boolean;
  open: (trigger: AskTrigger, anchorEl: HTMLElement | null) => void;
}

const SCOPE_ATTRIBUTE = 'data-aegis-ask-scope';

// Every listening overlay, so the window helper reaches the one that owns
// its anchor rather than whichever overlay mounted last.
const openers = new Set<Opener>();

function openFromScript(
  trigger: AskTrigger,
  anchorEl: HTMLElement | null = null,
): void {
  for (const opener of openers) {
    if (opener.owns(anchorEl)) {
      opener.open(trigger, anchorEl);
      return;
    }
  }
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

function describeContext(context: AskContext): string {
  const parts: string[] = [];
  const { entity, action, surface } = context;
  if (entity) {
    parts.push(
      `${entity.type} "${entity.label ?? entity.id}" (entity ${entity.id})`,
    );
  }
  if (action) {
    parts.push(`action "${action.label}" (${action.id})`);
  }
  if (surface) {
    parts.push(
      `${surface.kind} "${surface.label ?? surface.id}" (surface ${surface.id})`,
    );
  }
  parts.push(`app ${context.appId}`);
  return parts.join(' · ');
}

export interface AskOverlayProps {
  /**
   * Limits the overlay to this element. An overlay without a scope serves
   * the rest of the page and leaves scoped elements to their own overlay.
   */
  scope?: RefObject<HTMLElement | null>;
}

/**
 * Opens the AskPanel on a right-click or Cmd/Ctrl + . over any element with
 * a `data-agent-*` attribute, and sends the question to the agent chat.
 * It stays inert, leaving the browser's context menu alone, until an
 * `<AgentChatProvider>` above it supplies a chat to send to.
 */
export function AskOverlay({
  scope,
}: AskOverlayProps = {}): ReactElement | null {
  const ctx = useContext(AegisRuntimeContext);
  const chat = useAgentChat();
  const runtime =
    chat === defaultAgentChatValue ? null : (ctx?.runtime ?? null);
  const [panel, setPanel] = useState<PanelState | null>(null);

  const open = useCallback(
    (
      context: AskContext,
      anchor: DOMRect | null,
      point: { x: number; y: number } | null,
    ) => {
      setPanel({ context, anchor, point });
    },
    [],
  );

  const close = useCallback(() => {
    setPanel(null);
  }, []);

  const owns = useCallback(
    (el: Element | null): boolean => {
      const owner = el?.closest(`[${SCOPE_ATTRIBUTE}]`) ?? null;
      if (!scope) {
        return owner === null;
      }
      return scope.current !== null && owner === scope.current;
    },
    [scope],
  );

  useEffect(() => {
    const el = scope?.current;
    if (!runtime || !el) {
      return;
    }
    el.setAttribute(SCOPE_ATTRIBUTE, '');
    return () => {
      el.removeAttribute(SCOPE_ATTRIBUTE);
    };
  }, [runtime, scope]);

  const { send, setPanelOpen } = chat;
  const ask = useCallback(
    (request: AskRequest) => {
      void Promise.resolve(
        send(
          `${request.prompt}\n\nContext: ${describeContext(request.context)}`,
        ),
      );
      setPanelOpen?.(true);
      setPanel(null);
    },
    [send, setPanelOpen],
  );

  // Handle right-click + keyboard triggers (delegated on document).
  useEffect(() => {
    if (!runtime) {
      return;
    }
    const onContextMenu = (e: MouseEvent): void => {
      if (e.shiftKey || !(e.target instanceof Element) || !owns(e.target)) {
        return;
      }
      const trigger = findTrigger(e.target);
      if (!trigger) {
        return;
      }
      e.preventDefault();
      const askContext = buildAskContext(runtime, trigger);
      runtime.emitAskTriggered(askContext);
      open(askContext, trigger.el.getBoundingClientRect(), {
        x: e.clientX,
        y: e.clientY,
      });
    };
    const onKeyDown = (e: KeyboardEvent): void => {
      const isAsk = (e.metaKey || e.ctrlKey) && e.key === '.';
      if (!isAsk) {
        return;
      }
      const target = (e.target as Element | null) ?? document.activeElement;
      if (!owns(target)) {
        return;
      }
      const trigger = findTrigger(target);
      if (!trigger) {
        return;
      }
      e.preventDefault();
      const askContext = buildAskContext(runtime, trigger);
      runtime.emitAskTriggered(askContext);
      open(askContext, trigger.el.getBoundingClientRect(), null);
    };
    document.addEventListener('contextmenu', onContextMenu, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [runtime, open, owns]);

  // Programmatic open: external code subscribes via runtime.onAskTriggered
  // and may not need the panel; AskOverlay opens the default panel only for
  // overlay-triggered events. For test/demo paths we expose a window helper.
  useEffect(() => {
    if (!runtime || typeof window === 'undefined') {
      return;
    }
    const opener: Opener = {
      owns,
      open: (trigger, anchorEl) => {
        const askContext = buildAskContext(runtime, trigger);
        runtime.emitAskTriggered(askContext);
        open(askContext, anchorEl?.getBoundingClientRect() ?? null, null);
      },
    };
    const w = window as AskWindow;
    openers.add(opener);
    w.__aegisOpenAskPanel = openFromScript;
    return () => {
      openers.delete(opener);
      if (openers.size === 0) {
        delete w.__aegisOpenAskPanel;
      }
    };
  }, [runtime, open, owns]);

  const portalled = useMemo(() => {
    if (!panel) {
      return null;
    }
    return (
      <AskPanel
        context={panel.context}
        anchorRect={panel.anchor}
        anchorPoint={panel.point}
        onClose={close}
        onSend={ask}
        sending={chat.sending}
      />
    );
  }, [panel, close, ask, chat.sending]);

  if (!portalled) {
    return null;
  }
  return <div className="aegis-ask-overlay">{portalled}</div>;
}
