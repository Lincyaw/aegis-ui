import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  useRef,
} from 'react';

import { type ChartColor, chartColorValue } from '../../lib/chart';
import { useStrings } from '../../locale';
import './ReplayScrubber.css';

export interface ReplayScrubberMarker {
  /** The step the marker sits over. */
  index: number;
  color: ChartColor;
  /** Names the event, e.g. "T17 · 夺取 C4"; shown as the marker's tooltip. */
  label: string;
}

export interface ReplayScrubberProps {
  /** How many steps the replay has. */
  count: number;
  index: number;
  onIndexChange: (index: number) => void;
  /** Events above the track, each a dot in its colour. */
  markers?: ReplayScrubberMarker[];
  /** The label of a step under the track, e.g. `T42`. Defaults to its number. */
  formatStep?: (index: number) => ReactNode;
  /** Names the slider; defaults to "Replay position". */
  ariaLabel?: string;
  /**
   * A pointer drag starts and ends: hold playback in between, e.g. with
   * `useReplayPlayback`'s `hold` and `release`.
   */
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
  className?: string;
}

/** A label within this share of the track from an end hides that end's label. */
const END_CLEARANCE = 0.08;

/**
 * The replay's position: a track from the first step to the last with a
 * thumb at the current one and event markers above it. Drag or click to
 * seek; arrow keys step by one, Page Up / Down by a tenth, Home / End to
 * the ends.
 */
export function ReplayScrubber({
  count,
  index,
  onIndexChange,
  markers = [],
  formatStep = (step) => step + 1,
  ariaLabel,
  onScrubStart,
  onScrubEnd,
  className,
}: ReplayScrubberProps): ReactElement {
  const strings = useStrings();
  const trackRef = useRef<HTMLDivElement>(null);
  const last = Math.max(count - 1, 0);
  const share = (step: number): number =>
    last === 0 ? 0 : Math.min(Math.max(step / last, 0), 1);

  const seekToPointer = (clientX: number): void => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    const rect = track.getBoundingClientRect();
    const ratio = (clientX - rect.left) / Math.max(rect.width, 1);
    onIndexChange(Math.round(Math.min(Math.max(ratio, 0), 1) * last));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    onScrubStart?.();
    seekToPointer(event.clientX);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      seekToPointer(event.clientX);
    }
  };
  const onPointerEnd = (): void => {
    onScrubEnd?.();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const page = Math.max(Math.round(count / 10), 1);
    const target: Record<string, number> = {
      ArrowLeft: index - 1,
      ArrowDown: index - 1,
      ArrowRight: index + 1,
      ArrowUp: index + 1,
      PageDown: index - page,
      PageUp: index + page,
      Home: 0,
      End: last,
    };
    if (event.key in target) {
      event.preventDefault();
      onIndexChange(Math.min(Math.max(target[event.key], 0), last));
    }
  };

  const position = { '--aegis-replay-scrubber-position': share(index) };
  const total = Math.max(count, 0);
  const here = markers
    .filter((marker) => marker.index === index)
    .map((marker) => marker.label);
  const valueText = [
    strings.replayStepOf(total === 0 ? 0 : index + 1, total),
    ...here,
  ].join(' · ');
  const nearStart = index > 0 && share(index) < END_CLEARANCE;
  const nearEnd = index < last && share(index) > 1 - END_CLEARANCE;
  return (
    <div
      className={['aegis-replay-scrubber', className ?? '']
        .filter(Boolean)
        .join(' ')}
      style={position as CSSProperties}
    >
      <div className="aegis-replay-scrubber__markers" aria-hidden="true">
        {markers.map((marker, position) => (
          <span
            key={position}
            className="aegis-replay-scrubber__marker"
            title={marker.label}
            style={
              {
                left: `${(share(marker.index) * 100).toString()}%`,
                background: chartColorValue(marker.color),
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div
        ref={trackRef}
        className="aegis-replay-scrubber__track"
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel ?? strings.replayPosition}
        aria-valuemin={total === 0 ? 0 : 1}
        aria-valuemax={total}
        aria-valuenow={total === 0 ? 0 : index + 1}
        aria-valuetext={valueText}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
      >
        <span className="aegis-replay-scrubber__played" />
        <span className="aegis-replay-scrubber__thumb" />
      </div>
      <div className="aegis-replay-scrubber__labels" aria-hidden="true">
        <span
          className={[
            'aegis-replay-scrubber__end',
            index === 0 ? 'aegis-replay-scrubber__label--current' : '',
            nearStart ? 'aegis-replay-scrubber__end--hidden' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {total === 0 ? null : formatStep(0)}
        </span>
        {index > 0 && index < last && (
          <span className="aegis-replay-scrubber__at aegis-replay-scrubber__label--current">
            {formatStep(index)}
          </span>
        )}
        {last > 0 && (
          <span
            className={[
              'aegis-replay-scrubber__end aegis-replay-scrubber__end--last',
              index === last ? 'aegis-replay-scrubber__label--current' : '',
              nearEnd ? 'aegis-replay-scrubber__end--hidden' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {formatStep(last)}
          </span>
        )}
      </div>
    </div>
  );
}
