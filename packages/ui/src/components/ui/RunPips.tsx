import { useStrings } from '../../locale';
import './RunPips.css';

export interface RunPipsCounts {
  passed: number;
  /** Ran and was graded as failing. */
  failed: number;
  /** The run itself failed (no gradable answer). */
  errored: number;
  /** Not finished yet. */
  pending?: number;
}

interface RunPipsProps {
  counts: RunPipsCounts;
  /** Above this many runs the dots collapse into a proportional bar. */
  maxDots?: number;
  /** Accessible name; defaults to a localized count summary. */
  ariaLabel?: string;
  className?: string;
}

type RunKind = 'passed' | 'failed' | 'errored' | 'pending';

/**
 * Per-run outcome strip: "passed/total" in the numeric type role, then one
 * dot per run (passed, failed, execution failed as a hollow ring, pending).
 * The text and the accessible name always carry the counts, so colour is
 * never the only signal.
 */
export function RunPips({
  counts,
  maxDots = 10,
  ariaLabel,
  className,
}: RunPipsProps) {
  const strings = useStrings();
  const pending = counts.pending ?? 0;
  const total = counts.passed + counts.failed + counts.errored + pending;
  const parts: Array<[RunKind, number]> = [
    ['passed', counts.passed],
    ['failed', counts.failed],
    ['errored', counts.errored],
    ['pending', pending],
  ];
  const cls = ['aegis-run-pips', className ?? ''].filter(Boolean).join(' ');
  return (
    <span
      className={cls}
      role="img"
      aria-label={
        ariaLabel ??
        strings.runPipsLabel({
          passed: counts.passed,
          failed: counts.failed,
          errored: counts.errored,
          pending,
          total,
        })
      }
    >
      <span className="aegis-run-pips__count">
        {`${String(counts.passed)}/${String(total)}`}
      </span>
      {total <= maxDots ? (
        <span className="aegis-run-pips__dots">
          {parts.flatMap(([kind, count]) =>
            Array.from({ length: count }, (_, i) => (
              <span
                key={`${kind}-${String(i)}`}
                className={`aegis-run-pips__dot aegis-run-pips__dot--${kind}`}
              />
            )),
          )}
        </span>
      ) : (
        <span className="aegis-run-pips__bar">
          {parts
            .filter(([, count]) => count > 0)
            .map(([kind, count]) => (
              <span
                key={kind}
                className={`aegis-run-pips__segment aegis-run-pips__segment--${kind}`}
                style={{ flexGrow: count }}
              />
            ))}
        </span>
      )}
    </span>
  );
}
