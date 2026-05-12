import {
  type CSSProperties,
  type ReactElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
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
  /** Preferred anchor point (e.g. mouse position). Wins over anchorRect. */
  anchorPoint?: { x: number; y: number } | null;
  onClose: () => void;
  /** When true, render fixed-positioned popover; when false, inline. */
  popover?: boolean;
}

const PANEL_OFFSET_PX = 8;
const VIEWPORT_MARGIN_PX = 8;
const PANEL_MIN_HEIGHT_PX = 160;

interface Placement {
  left: number;
  top: number;
  maxHeight: number;
}

function placeNear(
  point: { x: number; y: number } | null,
  rect: DOMRect | null | undefined,
  panelWidth: number,
  panelHeight: number,
): Placement | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = VIEWPORT_MARGIN_PX;
  const offset = PANEL_OFFSET_PX;

  // Anchor: prefer mouse point; fall back to rect's bottom-left corner.
  const ax = point?.x ?? rect?.left ?? margin;
  const ay = point?.y ?? rect?.bottom ?? margin;

  const spaceBelow = vh - ay - margin;
  const spaceAbove = ay - margin;
  const spaceRight = vw - ax - margin;
  const spaceLeft = ax - margin;

  // Pick vertical side with more room; allow shrinking max-height to fit.
  const placeBelow = spaceBelow >= spaceAbove;
  const verticalRoom = Math.max(
    placeBelow ? spaceBelow : spaceAbove,
    PANEL_MIN_HEIGHT_PX,
  );
  const maxHeight = Math.min(panelHeight, verticalRoom - offset);

  let top = placeBelow ? ay + offset : ay - offset - maxHeight;
  // Pick horizontal side with more room.
  const placeRight = spaceRight >= spaceLeft;
  let left = placeRight ? ax + offset : ax - offset - panelWidth;

  // Clamp into viewport.
  left = Math.max(margin, Math.min(left, vw - panelWidth - margin));
  top = Math.max(margin, Math.min(top, vh - maxHeight - margin));

  return { left, top, maxHeight };
}

export function AskPanel({
  context,
  tools,
  anchorRect,
  anchorPoint,
  onClose,
  popover = true,
}: AskPanelProps): ReactElement {
  const ctx = useContext(AegisAgentContext);
  const runtime = ctx?.runtime ?? null;
  const rootRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);

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

  useLayoutEffect(() => {
    if (!popover) {
      setPlacement(null);
      return;
    }
    const compute = (): void => {
      const el = rootRef.current;
      if (!el) {
        return;
      }
      // Use the natural (unconstrained) size as the desired height; the
      // placement function will clamp it to the larger viewport gap.
      const naturalHeight = el.scrollHeight || el.offsetHeight;
      const width = el.offsetWidth;
      const next = placeNear(
        anchorPoint ?? null,
        anchorRect ?? null,
        width,
        naturalHeight,
      );
      setPlacement(next);
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [popover, anchorPoint, anchorRect, resolvedTools, context]);

  const style: CSSProperties = popover
    ? placement
      ? {
          position: 'fixed',
          left: placement.left,
          top: placement.top,
          maxHeight: placement.maxHeight,
        }
      : // First paint before measurement: render off-screen to avoid flicker.
        {
          position: 'fixed',
          left: -9999,
          top: -9999,
          visibility: 'hidden',
        }
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
