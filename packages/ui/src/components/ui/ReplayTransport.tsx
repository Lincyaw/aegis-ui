import type { KeyboardEvent, ReactElement, ReactNode } from 'react';

import {
  CaretRightOutlined,
  PauseOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
} from '@ant-design/icons';

import { useStrings } from '../../locale';
import './ReplayTransport.css';

export interface ReplayTransportProps {
  playing: boolean;
  onPlayToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
  /** False at the first step. Defaults to true. */
  canPrevious?: boolean;
  /** False at the last step. Defaults to true. */
  canNext?: boolean;
  /** Where the replay is, e.g. `T42 / 80 · 06:12`. */
  position?: ReactNode;
  /** The current speed; with `speeds` and `onSpeedChange`, a speed switch. */
  speed?: number;
  speeds?: number[];
  onSpeedChange?: (speed: number) => void;
  /** Further controls at the end, e.g. a switch between players' views. */
  extra?: ReactNode;
  className?: string;
}

/**
 * The replay's controls: step back, play or pause, step forward, where
 * the replay is, and optionally its speed and further controls.
 */
export function ReplayTransport({
  playing,
  onPlayToggle,
  onPrevious,
  onNext,
  canPrevious = true,
  canNext = true,
  position,
  speed,
  speeds,
  onSpeedChange,
  extra,
  className,
}: ReplayTransportProps): ReactElement {
  const strings = useStrings();
  const speedTabs =
    speed !== undefined && speeds !== undefined && onSpeedChange !== undefined;
  // Arrow keys move the choice within the group, which is one tab stop.
  const onSpeedKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (!speedTabs) {
      return;
    }
    const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[
      event.key
    ];
    if (step === undefined) {
      return;
    }
    event.preventDefault();
    const at = speeds.indexOf(speed);
    const next = speeds[(at + step + speeds.length) % speeds.length];
    onSpeedChange(next);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      .item(speeds.indexOf(next))
      .focus();
  };
  return (
    <div
      className={['aegis-replay-transport', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="aegis-replay-transport__buttons">
        {/* aria-disabled rather than disabled keeps focus on the button
         * when stepping reaches an end. */}
        <button
          type="button"
          className="aegis-replay-transport__button"
          aria-label={strings.replayPreviousStep}
          aria-disabled={!canPrevious}
          onClick={canPrevious ? onPrevious : undefined}
        >
          <StepBackwardOutlined aria-hidden />
        </button>
        <button
          type="button"
          className="aegis-replay-transport__button aegis-replay-transport__button--play"
          aria-label={playing ? strings.replayPause : strings.replayPlay}
          onClick={onPlayToggle}
        >
          {playing ? (
            <PauseOutlined aria-hidden />
          ) : (
            <CaretRightOutlined aria-hidden />
          )}
        </button>
        <button
          type="button"
          className="aegis-replay-transport__button"
          aria-label={strings.replayNextStep}
          aria-disabled={!canNext}
          onClick={canNext ? onNext : undefined}
        >
          <StepForwardOutlined aria-hidden />
        </button>
        {position !== undefined && (
          <span className="aegis-replay-transport__position">{position}</span>
        )}
      </div>
      {(speedTabs || extra !== undefined) && (
        <div className="aegis-replay-transport__end">
          {speedTabs && (
            <div
              className="aegis-replay-transport__speeds"
              role="radiogroup"
              aria-label={strings.replaySpeed}
            >
              {speeds.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={value === speed}
                  tabIndex={value === speed ? 0 : -1}
                  onKeyDown={onSpeedKeyDown}
                  className="aegis-replay-transport__speed"
                  onClick={() => {
                    onSpeedChange(value);
                  }}
                >
                  {`${String(value)}×`}
                </button>
              ))}
            </div>
          )}
          {extra}
        </div>
      )}
    </div>
  );
}
