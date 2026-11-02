import type { CSSProperties, ReactElement, ReactNode } from 'react';

import { type ChartColor, chartColorValue } from '../../lib/chart';
import './ThoughtCard.css';

export interface ThoughtCardProps {
  /** The turn or step, e.g. "T42". */
  turn: ReactNode;
  /** When in the replay it happened, e.g. "06:12". */
  clock?: ReactNode;
  /** What the agent reasoned. */
  thought: ReactNode;
  /** What it did, as recorded, e.g. `move(unit=7, to="E5")`. */
  action?: ReactNode;
  /** What came of it, e.g. "占领 E5 · +12 分". */
  outcome?: ReactNode;
  /** The outcome's colour, the same as its kind on the replay's strip. */
  outcomeColor?: ChartColor;
  /** The turn the replay is on; earlier turns read quieter. */
  current?: boolean;
  /** Makes the card a button, e.g. one that moves the replay to the turn. */
  onSelect?: () => void;
  className?: string;
}

/** One turn of an agent's reasoning beside a replay: its thought, action and outcome. */
export function ThoughtCard({
  turn,
  clock,
  thought,
  action,
  outcome,
  outcomeColor = 'var(--text-muted)',
  current = false,
  onSelect,
  className,
}: ThoughtCardProps): ReactElement {
  const cls = [
    'aegis-thought-card',
    current ? 'aegis-thought-card--current' : '',
    onSelect ? 'aegis-thought-card--interactive' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const body = (
    <>
      <span className="aegis-thought-card__head">
        <span className="aegis-thought-card__turn">{turn}</span>
        {clock !== undefined && (
          <span className="aegis-thought-card__clock">{clock}</span>
        )}
      </span>
      <span className="aegis-thought-card__thought">{thought}</span>
      {action !== undefined && (
        <code className="aegis-thought-card__action">{action}</code>
      )}
      {outcome !== undefined && (
        <span className="aegis-thought-card__outcome">
          <span
            className="aegis-thought-card__dot"
            style={
              {
                '--aegis-thought-card-color': chartColorValue(outcomeColor),
              } as CSSProperties
            }
            aria-hidden="true"
          />
          {outcome}
        </span>
      )}
    </>
  );
  return onSelect ? (
    <button
      type="button"
      className={cls}
      aria-current={current ? 'step' : undefined}
      onClick={onSelect}
    >
      {body}
    </button>
  ) : (
    <div className={cls} aria-current={current ? 'step' : undefined}>
      {body}
    </div>
  );
}
