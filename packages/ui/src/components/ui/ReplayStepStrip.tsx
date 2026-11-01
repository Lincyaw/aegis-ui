import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useRef,
} from 'react';

import { type ChartColor, chartColorValue } from '../../lib/chart';
import { useStrings } from '../../locale';
import './ReplayStepStrip.css';

export interface ReplayStripStep {
  key: string;
  /** The step kind's colour, e.g. thinking, tool call, failure. */
  color: ChartColor;
  /** Names the step for screen readers and its tooltip, e.g. "#12 · 验证". */
  label: string;
  /** A step that changes the course (a check, a failure, the goal): taller. */
  emphasis?: boolean;
}

export interface ReplayStepStripProps {
  steps: ReplayStripStep[];
  /** The step shown elsewhere on the page; outlined. */
  currentIndex?: number;
  /** Makes each step a button that selects it. */
  onSelect?: (index: number) => void;
  /** Step indices of the key moments, numbered above the strip in order. */
  keyMoments?: number[];
  /** The tick label of a step under the strip. Defaults to `#n`. */
  formatStep?: (index: number) => ReactNode;
  /** A tick every this many steps; defaults to about five ticks. */
  tickEvery?: number;
  className?: string;
}

/**
 * Every step of a run as a bar coloured by its kind, with the key
 * moments numbered above it and step ticks below. With `onSelect`, a bar
 * selects its step; arrow keys move between steps.
 */
export function ReplayStepStrip({
  steps,
  currentIndex,
  onSelect,
  keyMoments = [],
  formatStep = (index) => `#${String(index + 1)}`,
  tickEvery,
  className,
}: ReplayStepStripProps): ReactElement {
  const strings = useStrings();
  const barsRef = useRef<HTMLDivElement>(null);
  const count = steps.length;
  const every = tickEvery ?? Math.max(1, Math.ceil(count / 4 / 5) * 5 || 1);
  const ticks = new Set<number>([0, Math.max(count - 1, 0)]);
  for (let index = every - 1; index < count - 1; index += every) {
    ticks.add(index);
  }
  const momentNumber = new Map(keyMoments.map((step, n) => [step, n + 1]));
  const focusIndex = currentIndex ?? 0;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!onSelect || count === 0) {
      return;
    }
    const target: Record<string, number> = {
      ArrowLeft: focusIndex - 1,
      ArrowRight: focusIndex + 1,
      Home: 0,
      End: count - 1,
    };
    if (!(event.key in target)) {
      return;
    }
    event.preventDefault();
    const next = Math.min(Math.max(target[event.key], 0), count - 1);
    onSelect(next);
    barsRef.current
      ?.querySelectorAll<HTMLButtonElement>('.aegis-replay-strip__step')
      [next]?.focus();
  };

  const columns = {
    gridTemplateColumns: `repeat(${String(Math.max(count, 1))}, minmax(0, 1fr))`,
  };
  return (
    <div
      className={['aegis-replay-strip', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className="aegis-replay-strip__moments"
        style={columns}
        aria-hidden="true"
      >
        {steps.map((step, index) => {
          const n = momentNumber.get(index);
          return n === undefined ? (
            <span key={step.key} />
          ) : (
            <span
              key={step.key}
              className={[
                'aegis-replay-strip__moment',
                index === currentIndex
                  ? 'aegis-replay-strip__moment--current'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {n}
            </span>
          );
        })}
      </div>
      <div
        ref={barsRef}
        className="aegis-replay-strip__bars"
        style={columns}
        role={onSelect ? 'toolbar' : 'img'}
        aria-label={strings.replaySteps}
        onKeyDown={onKeyDown}
      >
        {steps.map((step, index) => {
          const n = momentNumber.get(index);
          const label =
            n === undefined
              ? step.label
              : `${step.label} · ${strings.replayKeyMoment(n)}`;
          const style = {
            '--aegis-replay-strip-color': chartColorValue(step.color),
          } as CSSProperties;
          const cls = [
            'aegis-replay-strip__step',
            step.emphasis ? 'aegis-replay-strip__step--emphasis' : '',
            index === currentIndex ? 'aegis-replay-strip__step--current' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return onSelect ? (
            <button
              key={step.key}
              type="button"
              className={cls}
              style={style}
              title={label}
              aria-label={label}
              aria-current={index === currentIndex ? 'step' : undefined}
              tabIndex={index === focusIndex ? 0 : -1}
              onClick={() => {
                onSelect(index);
              }}
            />
          ) : (
            <span key={step.key} className={cls} style={style} title={label} />
          );
        })}
      </div>
      <div
        className="aegis-replay-strip__ticks"
        style={columns}
        aria-hidden="true"
      >
        {steps.map((step, index) => (
          <span key={step.key} className="aegis-replay-strip__tick">
            {ticks.has(index) ? formatStep(index) : null}
          </span>
        ))}
      </div>
    </div>
  );
}
