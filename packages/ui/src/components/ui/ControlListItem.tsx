import type { CSSProperties, ReactNode } from 'react';

import { useAegisAction } from '../../agent/hooks';
import type { AegisAction } from '../../agent/types';
import './ControlListItem.css';

interface ControlListItemProps {
  /** Left-side content (e.g. dot + label). */
  left: ReactNode;
  /** Right-side content (e.g. status text or action button). */
  right?: ReactNode;
  /** Inverts the row to ink — used for the currently-active item. */
  active?: boolean;
  /** Click target — when present, row becomes a button. */
  onClick?: () => void;
  /** Optional aegis-ui agent action — fired after onClick if not prevented. */
  action?: AegisAction<void, unknown>;
  className?: string;
  style?: CSSProperties;
}

export function ControlListItem({
  left,
  right,
  active = false,
  onClick,
  action,
  className,
  style,
}: ControlListItemProps) {
  const bound = useAegisAction<void, unknown>(action);
  const isUnavailable = action ? !bound.available : false;

  const cls = [
    'aegis-control-item',
    active ? 'aegis-control-item--active' : '',
    (onClick ?? action) ? 'aegis-control-item--interactive' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  if (onClick ?? action) {
    const handleClick = (): void => {
      onClick?.();
      if (action) {
        void bound.invoke();
      }
    };
    return (
      <button
        type="button"
        className={cls}
        style={style}
        onClick={handleClick}
        disabled={isUnavailable}
        title={isUnavailable ? bound.unavailableReason : undefined}
        data-agent-action-id={action?.id}
      >
        <span className="aegis-control-item__left">{left}</span>
        {right && <span className="aegis-control-item__right">{right}</span>}
      </button>
    );
  }

  return (
    <div className={cls} style={style}>
      <span className="aegis-control-item__left">{left}</span>
      {right && <span className="aegis-control-item__right">{right}</span>}
    </div>
  );
}

export default ControlListItem;
