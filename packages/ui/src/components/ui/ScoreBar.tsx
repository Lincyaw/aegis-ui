import { useStrings } from '../../locale';
import './ScoreBar.css';

interface ScoreBarProps {
  /**
   * `null` is a missing value: an em dash over an empty track, distinct
   * from a real 0, which keeps a visible endpoint.
   */
  value: number | null;
  /** Value of a full track. */
  max?: number;
  format?: (value: number) => string;
  /** Accessible name; defaults to "<value> of <max>". */
  ariaLabel?: string;
  className?: string;
}

/** Inline score: a right-aligned tabular value and a short bar, for table cells. */
export function ScoreBar({
  value,
  max = 1,
  format = (score) => score.toFixed(2),
  ariaLabel,
  className,
}: ScoreBarProps) {
  const strings = useStrings();
  const cls = ['aegis-score-bar', className ?? ''].filter(Boolean).join(' ');
  const ratio =
    value === null || max <= 0 ? 0 : Math.min(Math.max(value / max, 0), 1);
  return (
    <span
      className={cls}
      role="img"
      aria-label={
        ariaLabel ??
        (value === null
          ? strings.noValue
          : strings.barValue(format(value), format(max)))
      }
    >
      <span
        className={
          value === null
            ? 'aegis-score-bar__value aegis-score-bar__value--empty'
            : 'aegis-score-bar__value'
        }
      >
        {value === null ? '—' : format(value)}
      </span>
      <span className="aegis-score-bar__track">
        {value !== null && (
          <span
            className={
              value === 0
                ? 'aegis-score-bar__fill aegis-score-bar__fill--zero'
                : 'aegis-score-bar__fill'
            }
            style={{ width: `${(ratio * 100).toString()}%` }}
          />
        )}
      </span>
    </span>
  );
}
