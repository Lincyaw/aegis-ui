import {
  type CSSProperties,
  type ReactElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import './AskPanel.css';
import { AegisAgentContext } from './aegisAgentContext';
import type { AegisActionDescriptor, AskContext, AskRequest } from './types';

export interface AskPanelProps {
  context: AskContext;
  /** Tools the agent could invoke. Defaults to deriving from snapshot. */
  tools?: AegisActionDescriptor[];
  /** Optional anchor — the panel positions itself near this rect. */
  anchorRect?: DOMRect | null;
  onClose: () => void;
  /** When true, render fixed-positioned popover; when false, inline. */
  popover?: boolean;
}

const PANEL_OFFSET_PX = 8;

function clampToViewport(
  rect: DOMRect | null | undefined,
): { left: number; top: number } | null {
  if (!rect || typeof window === 'undefined') {
    return null;
  }
  const panelW = 360;
  const margin = 8;
  let left = rect.left;
  let top = rect.bottom + PANEL_OFFSET_PX;
  if (left + panelW + margin > window.innerWidth) {
    left = Math.max(margin, window.innerWidth - panelW - margin);
  }
  if (top + 40 > window.innerHeight) {
    top = Math.max(margin, rect.top - PANEL_OFFSET_PX - 40);
  }
  return { left, top };
}

export function AskPanel({
  context,
  tools,
  anchorRect,
  onClose,
  popover = true,
}: AskPanelProps): ReactElement {
  const ctx = useContext(AegisAgentContext);
  const runtime = ctx?.runtime ?? null;
  const rootRef = useRef<HTMLDivElement>(null);

  const resolvedTools = useMemo<AegisActionDescriptor[]>(() => {
    if (tools) {
      return tools;
    }
    if (!runtime) {
      return [];
    }
    if (context.entity) {
      const r = runtime.inspect({
        kind: 'entity',
        entityId: context.entity.id,
      });
      if (r) {
        return r.actions;
      }
    }
    if (context.surface) {
      const r = runtime.inspect({
        kind: 'surface',
        surfaceId: context.surface.id,
      });
      if (r) {
        return r.actions;
      }
    }
    return runtime.listActions();
  }, [runtime, tools, context]);

  const onSend = useCallback(() => {
    if (!runtime) {
      return;
    }
    const req: AskRequest = {
      prompt: '',
      context,
      tools: resolvedTools,
      history: [],
    };
    runtime.emitAskSubmit(req);
  }, [runtime, context, resolvedTools]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    const onDown = (e: MouseEvent): void => {
      const el = rootRef.current;
      if (!el) {
        return;
      }
      if (e.target instanceof Node && el.contains(e.target)) {
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('mousedown', onDown, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('mousedown', onDown, true);
    };
  }, [onClose]);

  const positioned = popover ? clampToViewport(anchorRect) : null;
  const style: CSSProperties = positioned
    ? { position: 'fixed', left: positioned.left, top: positioned.top }
    : {};

  const headerLabel = context.entity?.label ?? context.entity?.id;
  const surfaceLabel = context.surface?.label ?? context.surface?.id;

  return (
    <div
      ref={rootRef}
      className="aegis-ask-panel"
      role="dialog"
      aria-label="Ask AI"
      data-aegis-ask-panel="open"
      data-ask-origin={context.origin}
      style={style}
    >
      <header className="aegis-ask-panel__header">
        <div className="aegis-ask-panel__title">Ask AI</div>
        <button
          type="button"
          className="aegis-ask-panel__close"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div className="aegis-ask-panel__meta">
        {surfaceLabel && (
          <div className="aegis-ask-panel__meta-row">
            <span className="aegis-ask-panel__meta-label">Surface</span>
            <span className="aegis-ask-panel__meta-value">{surfaceLabel}</span>
          </div>
        )}
        {headerLabel && (
          <div className="aegis-ask-panel__meta-row">
            <span className="aegis-ask-panel__meta-label">Entity</span>
            <span className="aegis-ask-panel__meta-value">{headerLabel}</span>
          </div>
        )}
      </div>
      {context.suggestions.length > 0 && (
        <div className="aegis-ask-panel__section">
          <div className="aegis-ask-panel__section-label">Suggestions</div>
          <div className="aegis-ask-panel__chips">
            {context.suggestions.map((s) => (
              <Chip key={s} tone="ghost">
                {s}
              </Chip>
            ))}
          </div>
        </div>
      )}
      <div className="aegis-ask-panel__section">
        <div className="aegis-ask-panel__section-label">
          Tools available ({resolvedTools.length})
        </div>
        {resolvedTools.length === 0 ? (
          <div className="aegis-ask-panel__empty">No tools in scope.</div>
        ) : (
          <ul className="aegis-ask-panel__tools">
            {resolvedTools.slice(0, 8).map((t) => (
              <li key={t.id} className="aegis-ask-panel__tool">
                <span className="aegis-ask-panel__tool-id">{t.id}</span>
                <span className="aegis-ask-panel__tool-label">{t.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <footer className="aegis-ask-panel__footer">
        <Button
          tone="primary"
          disabled
          onClick={onSend}
          title="No transport configured"
        >
          Send to agent
        </Button>
        <span className="aegis-ask-panel__note">no transport configured</span>
      </footer>
    </div>
  );
}

export default AskPanel;
