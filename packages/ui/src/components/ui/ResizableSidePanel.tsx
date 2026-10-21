import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useState,
} from 'react';

import { DoubleLeftOutlined, DoubleRightOutlined } from '@ant-design/icons';

import { useResizable } from '../../hooks/useResizable';
import './ResizableSidePanel.css';

export interface ResizableSidePanelProps {
  children: ReactNode;
  /** Which edge of the parent the panel attaches to. */
  side: 'left' | 'right';
  /** Initial width in px. */
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  /** localStorage key to persist width across reloads. */
  persistKey?: string;
  /** Width change per arrow-key press on the handle, in px. */
  keyboardStep?: number;
  /**
   * Narrows a proposed width after the min/max clamp, e.g. to keep the
   * neighbouring content above its own minimum width.
   */
  constrainWidth?: (width: number) => number;
  /** Double-clicking the handle restores `defaultWidth`. */
  resetOnDoubleClick?: boolean;
  /** Whether the panel can be fully collapsed (rendered as a thin handle bar). */
  collapsible?: boolean;
  /** Controlled collapsed state. If omitted, internal state is used. */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /**
   * At ≤768 px, fill the parent's width with a bounded height and hide the
   * resize handle — for layouts that stack the panel above or below its
   * neighbour on narrow screens. The parent still owns the stacking
   * (e.g. `flex-direction: column`).
   */
  stackOnMobile?: boolean;
  /** Optional className appended to the root. */
  className?: string;
}

export function ResizableSidePanel({
  children,
  side,
  defaultWidth = 320,
  minWidth = 200,
  maxWidth = 800,
  persistKey,
  keyboardStep,
  constrainWidth,
  resetOnDoubleClick = false,
  collapsible = false,
  collapsed: collapsedProp,
  onCollapsedChange,
  stackOnMobile = false,
  className,
}: ResizableSidePanelProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = collapsedProp ?? internalCollapsed;

  const setCollapsed = useCallback(
    (next: boolean) => {
      if (collapsedProp === undefined) {
        setInternalCollapsed(next);
      }
      onCollapsedChange?.(next);
    },
    [collapsedProp, onCollapsedChange],
  );

  const handleCollapse = useCallback(() => {
    if (collapsible) {
      setCollapsed(true);
    }
  }, [collapsible, setCollapsed]);

  const { width, handleProps, isDragging, reset } = useResizable({
    initialWidth: defaultWidth,
    minWidth,
    maxWidth,
    side,
    persistKey,
    onCollapse: handleCollapse,
    keyboardStep,
    constrainWidth,
  });

  const rootClass = [
    'aegis-resizable-panel',
    `aegis-resizable-panel--${side}`,
    isDragging ? 'aegis-resizable-panel--dragging' : '',
    collapsed ? 'aegis-resizable-panel--collapsed' : '',
    stackOnMobile ? 'aegis-resizable-panel--stack-on-mobile' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  if (collapsed) {
    const expand = () => {
      setCollapsed(false);
    };
    return (
      <button
        type="button"
        className={rootClass}
        onClick={expand}
        aria-label="Expand panel"
      >
        <span className="aegis-resizable-panel__collapse-icon">
          {side === 'left' ? <DoubleRightOutlined /> : <DoubleLeftOutlined />}
        </span>
      </button>
    );
  }

  const handle = (
    <div
      {...handleProps}
      className="aegis-resizable-handle"
      aria-label="Resize panel"
      onDoubleClick={resetOnDoubleClick ? reset : undefined}
    />
  );

  // A custom property rather than an inline width, so the stacked mobile
  // layout can override it from the stylesheet.
  const style = {
    '--aegis-resizable-panel-width': `${String(width)}px`,
  } as CSSProperties;

  return (
    <aside className={rootClass} style={style}>
      {side === 'left' ? null : handle}
      <div className="aegis-resizable-panel__body">{children}</div>
      {side === 'left' ? handle : null}
    </aside>
  );
}
