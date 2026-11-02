import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useRef,
  useState,
} from 'react';

import { type ChartColor, chartColorValue } from '../../lib/chart';
import { useStrings } from '../../locale';
import './ReplayStepStrip.css';

export interface ReplayStepStripItem {
  key: string;
  /** The step kind's colour, e.g. thinking, tool call, failure. */
  color: ChartColor;
  /** Names the step for screen readers and its tooltip, e.g. "#12 · 验证". */
  label: string;
  /** A step that changes the course (a check, a failure, the goal): taller. */
  emphasis?: boolean;
  /**
   * The bar's height as a share of the strip, 0 to 1, for a host that
   * grades its kinds more finely than `emphasis`; it wins over `emphasis`.
   */
  weight?: number;
}

export interface ReplayStepStripProps {
  steps: ReplayStepStripItem[];
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
  /** `sm` is a shorter strip without ticks, for a card or a list row. Defaults to `md`. */
  size?: 'md' | 'sm';
  /**
   * Draws a playhead this share of the way along the strip, 0 to 1, and
   * dims the steps past it, e.g. for a strip that plays as the page scrolls.
   */
  playhead?: number;
  className?: string;
}

/**
 * The steps that get a tick: the first, the last, and every `every`
 * steps between, leaving out one that would crowd the last.
 */
function tickedSteps(count: number, every: number): Set<number> {
  const last = count - 1;
  const ticks = new Set<number>(count > 0 ? [0, last] : []);
  for (let index = every - 1; index < last; index += every) {
    if (last - index >= every / 2) {
      ticks.add(index);
    }
  }
  return ticks;
}

/**
 * Every step of a run as a bar coloured by its kind, with the key
 * moments numbered above it and step ticks below. With `onSelect`, a bar
 * selects its step; arrow keys move between steps with one tab stop.
 * The gap between bars narrows as steps are added, so a long run still
 * draws every step.
 */
export function ReplayStepStrip({
  steps,
  currentIndex,
  onSelect,
  keyMoments = [],
  formatStep = (index) => `#${String(index + 1)}`,
  tickEvery,
  size = 'md',
  playhead,
  className,
}: ReplayStepStripProps): ReactElement {
  const strings = useStrings();
  const barsRef = useRef<HTMLDivElement>(null);
  const count = steps.length;
  const every = tickEvery ?? Math.max(1, Math.ceil(count / 20) * 5);
  const ticks = tickedSteps(count, every);
  const momentNumber = new Map(keyMoments.map((step, n) => [step, n + 1]));

  // The roving tab stop follows the current step, or the last step the
  // keyboard reached when the host does not mark one.
  const [ownFocus, setOwnFocus] = useState(0);
  const focusIndex = Math.min(currentIndex ?? ownFocus, Math.max(count - 1, 0));

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
    setOwnFocus(next);
    onSelect(next);
    barsRef.current
      ?.querySelectorAll<HTMLButtonElement>('.aegis-replay-step-strip__step')
      .item(next)
      .focus();
  };

  const style = {
    '--aegis-replay-step-strip-count': Math.max(count, 1),
    ...(playhead === undefined
      ? {}
      : {
          '--aegis-replay-step-strip-head': playhead,
          '--aegis-replay-step-strip-head-step': playhead * count,
        }),
  } as CSSProperties;
  return (
    <div
      className={[
        'aegis-replay-step-strip',
        `aegis-replay-step-strip--${size}`,
        playhead === undefined ? '' : 'aegis-replay-step-strip--playhead',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {keyMoments.length > 0 && (
        <div className="aegis-replay-step-strip__moments" aria-hidden="true">
          {steps.map((step, index) => {
            const n = momentNumber.get(index);
            return n === undefined ? (
              <span key={step.key} />
            ) : (
              <span
                key={step.key}
                className={[
                  'aegis-replay-step-strip__moment',
                  index === currentIndex
                    ? 'aegis-replay-step-strip__moment--current'
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
      )}
      <div
        ref={barsRef}
        className="aegis-replay-step-strip__bars"
        role={onSelect ? 'toolbar' : 'list'}
        aria-label={strings.replaySteps}
        onKeyDown={onKeyDown}
      >
        {steps.map((step, index) => {
          const n = momentNumber.get(index);
          const label =
            n === undefined
              ? step.label
              : `${step.label} · ${strings.replayKeyMoment(n)}`;
          const barStyle = {
            '--aegis-replay-step-strip-color': chartColorValue(step.color),
            '--aegis-replay-step-strip-index': index,
            ...(step.weight === undefined
              ? {}
              : { height: `${(step.weight * 100).toString()}%` }),
          } as CSSProperties;
          const cls = [
            'aegis-replay-step-strip__step',
            step.emphasis ? 'aegis-replay-step-strip__step--emphasis' : '',
            index === currentIndex
              ? 'aegis-replay-step-strip__step--current'
              : '',
          ]
            .filter(Boolean)
            .join(' ');
          return onSelect ? (
            <button
              key={step.key}
              type="button"
              className={cls}
              style={barStyle}
              title={label}
              aria-label={label}
              aria-current={index === currentIndex ? 'step' : undefined}
              tabIndex={index === focusIndex ? 0 : -1}
              onClick={() => {
                setOwnFocus(index);
                onSelect(index);
              }}
            />
          ) : (
            <span
              key={step.key}
              role="listitem"
              className={cls}
              style={barStyle}
              title={label}
              aria-label={label}
              aria-current={index === currentIndex ? 'step' : undefined}
            />
          );
        })}
        {playhead !== undefined && (
          <span className="aegis-replay-step-strip__head" aria-hidden="true" />
        )}
      </div>
      {size === 'md' && (
        <div className="aegis-replay-step-strip__ticks" aria-hidden="true">
          {steps.map((step, index) => (
            <span
              key={step.key}
              className={
                index === count - 1 && count > 1
                  ? 'aegis-replay-step-strip__tick aegis-replay-step-strip__tick--last'
                  : 'aegis-replay-step-strip__tick'
              }
            >
              {ticks.has(index) ? formatStep(index) : null}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
