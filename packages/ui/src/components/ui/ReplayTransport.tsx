import type { ReactElement, ReactNode } from 'react';

import {
  CaretRightOutlined,
  PauseOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
} from '@ant-design/icons';

import { useStrings } from '../../locale';
import './ReplayTransport.css';
import { Tabs } from './Tabs';

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
  return (
    <div
      className={['aegis-replay-transport', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="aegis-replay-transport__buttons">
        <button
          type="button"
          className="aegis-replay-transport__button"
          aria-label={strings.replayPreviousStep}
          disabled={!canPrevious}
          onClick={onPrevious}
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
          disabled={!canNext}
          onClick={onNext}
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
            <div role="group" aria-label={strings.replaySpeed}>
              <Tabs
                listOnly
                size="sm"
                items={speeds.map((value) => ({
                  key: String(value),
                  label: `${String(value)}×`,
                }))}
                activeKey={String(speed)}
                onChange={(key) => {
                  onSpeedChange(Number(key));
                }}
              />
            </div>
          )}
          {extra}
        </div>
      )}
    </div>
  );
}
