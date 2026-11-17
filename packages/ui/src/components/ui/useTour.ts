import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { useStorageItem } from '../../hooks/useStorageItem';
import type { TourCloseReason, TourProps, TourStep } from './Tour';

export interface UseTourOptions {
  /** Opens the tour on the first visit, until it is finished or skipped. Default true. */
  autoStart?: boolean;
}

export interface UseTourResult {
  /** Spread onto `<Tour>`. */
  tourProps: TourProps;
  /** Opens the tour at its first step, whether or not it was seen. */
  start: () => void;
  /** How the tour last ended, remembered across visits; null before that. */
  ended: TourCloseReason | null;
}

export interface TourLauncher {
  /** False while no mounted `useTour` is there to start. */
  available: boolean;
  start: () => void;
}

/** The `start` of every mounted `useTour`, most recently mounted last. */
const mounted: Array<() => void> = [];
const launcherListeners = new Set<() => void>();

function notifyLaunchers(): void {
  for (const listener of launcherListeners) {
    listener();
  }
}

function subscribeLaunchers(onChange: () => void): () => void {
  launcherListeners.add(onChange);
  return () => {
    launcherListeners.delete(onChange);
  };
}

function latestStart(): (() => void) | null {
  return mounted.length > 0 ? mounted[mounted.length - 1] : null;
}

function serverStart(): null {
  return null;
}

function storageKey(key: string): string {
  return `aegis-ui:tour:${key}`;
}

function readEnded(value: string | null): TourCloseReason | null {
  return value === 'finish' || value === 'skip' ? value : null;
}

/**
 * Runs one page's tour. It opens by itself on the first visit and
 * remembers in localStorage (`aegis-ui:tour:<key>`) that it was finished
 * or skipped, so it does not open again; `start()` replays it. While
 * mounted, its `start` is what `useTourLauncher` starts, so a control in
 * the shell can replay the current page's tour.
 */
export function useTour(
  key: string,
  steps: readonly TourStep[],
  { autoStart = true }: UseTourOptions = {},
): UseTourResult {
  const [stored, setStored] = useStorageItem(storageKey(key));
  const ended = readEnded(stored);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (autoStart && ended === null) {
      setCurrent(0);
      setOpen(true);
    }
  }, [autoStart, ended]);

  const start = useCallback(() => {
    setCurrent(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    mounted.push(start);
    notifyLaunchers();
    return () => {
      mounted.splice(mounted.lastIndexOf(start), 1);
      notifyLaunchers();
    };
  }, [start]);

  const onClose = useCallback(
    (reason: TourCloseReason) => {
      setOpen(false);
      setStored(reason);
    },
    [setStored],
  );

  return {
    tourProps: { open, steps, current, onChange: setCurrent, onClose },
    start,
    ended,
  };
}

/** Starts the tour of the most recently mounted `useTour`, e.g. from a shell's 引导 button. */
export function useTourLauncher(): TourLauncher {
  const latest = useSyncExternalStore(
    subscribeLaunchers,
    latestStart,
    serverStart,
  );
  const start = useCallback(() => {
    latest?.();
  }, [latest]);
  return { available: latest !== null, start };
}
