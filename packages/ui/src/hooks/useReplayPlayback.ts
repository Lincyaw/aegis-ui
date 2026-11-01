import { useCallback, useEffect, useRef, useState } from 'react';

import { usePageHidden } from './usePageHidden';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const DEFAULT_STEP_MS = 1000;

export interface UseReplayPlaybackOptions {
  /** How many steps the replay has. */
  count: number;
  /** The current step, controlled; omit to let the hook hold it. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Starts playing on mount, unless the reader prefers reduced motion. */
  autoPlay?: boolean;
  /** How fast steps advance; 2 plays twice as fast. Defaults to 1. */
  speed?: number;
  /**
   * How long step `index` stays on screen at speed 1, e.g. the time to the
   * next recorded event. Defaults to a second per step.
   */
  stepDurationMs?: (index: number) => number;
}

export interface UseReplayPlaybackResult {
  index: number;
  playing: boolean;
  /** Moves to `index`, clamped to the replay. */
  seek: (index: number) => void;
  previous: () => void;
  next: () => void;
  /** Plays from the current step, or from the start when it is at the end. */
  play: () => void;
  pause: () => void;
  toggle: () => void;
}

/**
 * Plays a replay of `count` steps: it advances the index one step at a
 * time, at `speed`, and stops at the last step. Playback pauses while the
 * page is hidden. Seeking, stepping or reaching the end leave the index
 * where the reader put it.
 */
export function useReplayPlayback({
  count,
  index: controlledIndex,
  defaultIndex = 0,
  onIndexChange,
  autoPlay = false,
  speed = 1,
  stepDurationMs,
}: UseReplayPlaybackOptions): UseReplayPlaybackResult {
  const pageHidden = usePageHidden();
  const last = Math.max(count - 1, 0);
  const [ownIndex, setOwnIndex] = useState(defaultIndex);
  const index = Math.min(Math.max(controlledIndex ?? ownIndex, 0), last);
  const [playing, setPlaying] = useState(false);
  const onIndexChangeRef = useRef(onIndexChange);
  onIndexChangeRef.current = onIndexChange;
  const durationRef = useRef(stepDurationMs);
  durationRef.current = stepDurationMs;

  const seek = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(Math.round(next), 0), last);
      if (controlledIndex === undefined) {
        setOwnIndex(clamped);
      }
      onIndexChangeRef.current?.(clamped);
    },
    [controlledIndex, last],
  );

  // Autoplay starts once, when there is more than one step; it reads the
  // media query itself because a hydrating render sees the server's answer.
  const autoPlayedRef = useRef(false);
  useEffect(() => {
    if (autoPlayedRef.current || !autoPlay || count < 2) {
      return;
    }
    autoPlayedRef.current = true;
    if (!window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      setPlaying(true);
    }
  }, [autoPlay, count]);

  // A replay that reaches its last step stops there.
  const atEnd = index >= last;
  if (playing && atEnd) {
    setPlaying(false);
  }

  useEffect(() => {
    if (!playing || pageHidden || atEnd) {
      return undefined;
    }
    const base = durationRef.current?.(index) ?? DEFAULT_STEP_MS;
    const delay = Math.max(base, 0) / Math.max(speed, 0.01);
    const timer = window.setTimeout(() => {
      seek(index + 1);
    }, delay);
    return () => {
      window.clearTimeout(timer);
    };
  }, [playing, pageHidden, atEnd, index, speed, seek]);

  const play = useCallback(() => {
    if (index >= last) {
      seek(0);
    }
    setPlaying(count > 1);
  }, [count, index, last, seek]);
  const pause = useCallback(() => {
    setPlaying(false);
  }, []);
  const toggle = useCallback(() => {
    if (playing) {
      pause();
    } else {
      play();
    }
  }, [pause, play, playing]);
  const previous = useCallback(() => {
    seek(index - 1);
  }, [index, seek]);
  const next = useCallback(() => {
    seek(index + 1);
  }, [index, seek]);

  return { index, playing, seek, previous, next, play, pause, toggle };
}
