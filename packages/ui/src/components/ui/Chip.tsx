import { type KeyboardEvent, type ReactNode, useRef } from 'react';

import { CloseOutlined } from '@ant-design/icons';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/core/usePrimitiveSurface';
import { useStrings } from '../../locale';
import './Chip.css';

export type ChipSurface = PrimitiveSurface<ReactNode>;

interface ChipProps {
  children: ReactNode;
  /**
   * Visual treatment. `warning` is the anomaly tone — a failed check or a
   * rejected run belongs there, not on decorative labels.
   */
  tone?:
    | 'default'
    | 'ink'
    | 'warning'
    | 'success'
    | 'info'
    | 'caution'
    | 'ghost';
  /**
   * `sm` is 20 high with the micro type role; `md` and `lg` are 28 high
   * with the label role, `lg` without vertical padding.
   */
  size?: 'sm' | 'md' | 'lg';
  /** Optional leading dot or icon; icons render at `--size-icon-sm`. */
  leading?: ReactNode;
  className?: string;
  onClick?: () => void;
  /** Renders a trailing dismiss control, e.g. for removable filter chips. */
  onClose?: () => void;
  surface?: ChipSurface;
}

export function Chip({
  children,
  tone = 'default',
  size = 'sm',
  leading,
  className,
  onClick,
  onClose,
  surface,
}: ChipProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const strings = useStrings();
  const agentAttrs = usePrimitiveSurface(surface, children, 'tag', wrapRef);
  const cls = [
    'aegis-chip',
    `aegis-chip--${tone}`,
    `aegis-chip--size-${size}`,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const interactive = Boolean(onClick);
  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>): void => {
    if (!onClick) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };
  return (
    <span
      ref={wrapRef}
      className={cls}
      onClick={onClick}
      onKeyDown={interactive ? handleKeyDown : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      {...agentAttrs}
    >
      {leading && <span className="aegis-chip__leading">{leading}</span>}
      <span className="aegis-chip__label">{children}</span>
      {onClose && (
        <button
          type="button"
          className="aegis-chip__close"
          aria-label={strings.remove}
          onClick={onClose}
        >
          <CloseOutlined />
        </button>
      )}
    </span>
  );
}
