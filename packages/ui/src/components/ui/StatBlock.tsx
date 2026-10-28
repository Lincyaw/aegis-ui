import {
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/usePrimitiveSurface';
import { MetricLabel } from './MetricLabel';
import './StatBlock.css';

export type StatBlockSurface = PrimitiveSurface<{
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
}>;

interface StatBlockProps {
  label: ReactNode;
  value: ReactNode;
  /** Optional unit displayed after the value. */
  unit?: ReactNode;
  /** Layout direction. Default: horizontal (label · value, baseline). */
  direction?: 'horizontal' | 'vertical';
  /** Value in the number type role instead of the numeric role. */
  emphasized?: boolean;
  /**
   * When `value` is a number, counts it up from 0 once on mount over
   * `--motion-chart`, keeping its decimal places. Shows the final value at
   * once under prefers-reduced-motion.
   */
  animateValue?: boolean;
  inverted?: boolean;
  className?: string;
  surface?: StatBlockSurface;
}

const COUNT_PROGRESS = '--aegis-stat-count-progress';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Counts from 0 to `target` once, on mount. The pace comes from the CSS
 * animation of COUNT_PROGRESS on `valueRef` (timed by `--motion-chart`
 * while `counting` is true); the count ends when that progress reads 1.
 */
function useStatCountUp(
  target: number,
  enabled: boolean,
  valueRef: RefObject<HTMLSpanElement | null>,
): { counting: boolean; current: number } {
  const [counting, setCounting] = useState(
    () => enabled && !window.matchMedia(REDUCED_MOTION).matches,
  );
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const node = valueRef.current;
    if (!counting || node === null) {
      return undefined;
    }
    let frame = 0;
    const step = (): void => {
      const next = Number.parseFloat(
        getComputedStyle(node).getPropertyValue(COUNT_PROGRESS),
      );
      if (next < 1) {
        setProgress(next);
        frame = requestAnimationFrame(step);
      } else {
        setCounting(false);
      }
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [counting, valueRef]);

  return { counting, current: counting ? target * progress : target };
}

export function StatBlock({
  label,
  value,
  unit,
  direction = 'horizontal',
  emphasized = false,
  animateValue = false,
  inverted = false,
  className,
  surface,
}: StatBlockProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const agentAttrs = usePrimitiveSurface(
    surface,
    { label, value, unit },
    'metric',
    wrapRef,
  );
  const numeric = typeof value === 'number';
  const { counting, current } = useStatCountUp(
    numeric ? value : 0,
    animateValue && numeric,
    valueRef,
  );
  const shown = counting
    ? current.toFixed((String(value).split('.')[1] ?? '').length)
    : value;
  const cls = [
    'aegis-stat',
    `aegis-stat--${direction}`,
    emphasized ? 'aegis-stat--emphasized' : '',
    counting ? 'aegis-stat--counting' : '',
    inverted ? 'aegis-stat--inverted' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div ref={wrapRef} className={cls} {...agentAttrs}>
      <MetricLabel inverted={inverted} className="aegis-stat__label">
        {label}
      </MetricLabel>
      <span className="aegis-stat__measure">
        <span ref={valueRef} className="aegis-stat__value">
          {shown}
        </span>
        {unit && (
          <MetricLabel inverted={inverted} className="aegis-stat__unit">
            {unit}
          </MetricLabel>
        )}
      </span>
    </div>
  );
}
