import { type ReactNode, useCallback, useState } from 'react';

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
  /** Whether the panel can be fully collapsed (rendered as a thin handle bar). */
  collapsible?: boolean;
  /** Controlled collapsed state. If omitted, internal state is used. */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
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
  collapsible = false,
  collapsed: collapsedProp,
  onCollapsedChange,
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

  const { width, handleProps, isDragging } = useResizable({
    initialWidth: defaultWidth,
    minWidth,
    maxWidth,
    side,
    persistKey,
    onCollapse: handleCollapse,
  });

  const rootClass = [
    'aegis-resizable-panel',
    `aegis-resizable-panel--${side}`,
    isDragging ? 'aegis-resizable-panel--dragging' : '',
    collapsed ? 'aegis-resizable-panel--collapsed' : '',
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
    />
  );

  return (
    <aside className={rootClass} style={{ width }}>
      {side === 'left' ? null : handle}
      <div className="aegis-resizable-panel__body">{children}</div>
      {side === 'left' ? handle : null}
    </aside>
  );
}

export default ResizableSidePanel;
