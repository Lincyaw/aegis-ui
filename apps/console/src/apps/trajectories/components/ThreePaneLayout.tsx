import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import './ThreePaneLayout.css';

interface ThreePaneLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  leftWidth: number;
  rightWidth: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  onLeftWidthChange: (w: number) => void;
  onRightWidthChange: (w: number) => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  leftLabel: string;
  rightLabel: string;
}

const COLLAPSED = 32;
const MIN = 200;
const MAX = 600;

function clamp(n: number): number {
  return Math.min(MAX, Math.max(MIN, n));
}

export function ThreePaneLayout({
  left,
  center,
  right,
  leftWidth,
  rightWidth,
  leftCollapsed,
  rightCollapsed,
  onLeftWidthChange,
  onRightWidthChange,
  onToggleLeft,
  onToggleRight,
  leftLabel,
  rightLabel,
}: ThreePaneLayoutProps) {
  const lWidth = leftCollapsed ? COLLAPSED : leftWidth;
  const rWidth = rightCollapsed ? COLLAPSED : rightWidth;
  return (
    <div
      className='aegis-three-pane'
      style={{
        gridTemplateColumns: `${lWidth.toString()}px 4px 1fr 4px ${rWidth.toString()}px`,
      }}
    >
      <aside className='aegis-three-pane__side aegis-three-pane__side--left'>
        <PaneHeader
          collapsed={leftCollapsed}
          label={leftLabel}
          onToggle={onToggleLeft}
          side='left'
        />
        {!leftCollapsed && (
          <div className='aegis-three-pane__side-body'>{left}</div>
        )}
      </aside>
      <ResizeHandle
        disabled={leftCollapsed}
        onResize={(dx) => onLeftWidthChange(clamp(leftWidth + dx))}
      />
      <main className='aegis-three-pane__center'>{center}</main>
      <ResizeHandle
        disabled={rightCollapsed}
        onResize={(dx) => onRightWidthChange(clamp(rightWidth - dx))}
      />
      <aside className='aegis-three-pane__side aegis-three-pane__side--right'>
        <PaneHeader
          collapsed={rightCollapsed}
          label={rightLabel}
          onToggle={onToggleRight}
          side='right'
        />
        {!rightCollapsed && (
          <div className='aegis-three-pane__side-body'>{right}</div>
        )}
      </aside>
    </div>
  );
}

function PaneHeader({
  collapsed,
  label,
  onToggle,
  side,
}: {
  collapsed: boolean;
  label: string;
  onToggle: () => void;
  side: 'left' | 'right';
}) {
  const arrow = collapsed
    ? side === 'left'
      ? '›'
      : '‹'
    : side === 'left'
      ? '‹'
      : '›';
  return (
    <header className='aegis-three-pane__pane-header'>
      {collapsed ? (
        <span className='aegis-three-pane__rotated-label'>{label}</span>
      ) : (
        <span className='aegis-three-pane__pane-label'>{label}</span>
      )}
      <button
        type='button'
        className='aegis-three-pane__toggle'
        onClick={onToggle}
        aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
      >
        {arrow}
      </button>
    </header>
  );
}

function ResizeHandle({
  onResize,
  disabled,
}: {
  onResize: (dx: number) => void;
  disabled: boolean;
}) {
  const startX = useRef<number>(0);
  const [dragging, setDragging] = useState(false);

  const handleMove = useCallback(
    (e: PointerEvent) => {
      onResize(e.clientX - startX.current);
      startX.current = e.clientX;
    },
    [onResize],
  );

  const handleUp = useCallback(() => {
    setDragging(false);
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', handleUp);
  }, [handleMove]);

  useEffect(() => {
    if (!dragging) {
      return;
    }
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragging, handleMove, handleUp]);

  if (disabled) {
    return <div className='aegis-three-pane__handle aegis-three-pane__handle--disabled' />;
  }
  return (
    <div
      className='aegis-three-pane__handle'
      onPointerDown={(e) => {
        startX.current = e.clientX;
        setDragging(true);
      }}
      role='separator'
      aria-orientation='vertical'
    />
  );
}

export default ThreePaneLayout;
