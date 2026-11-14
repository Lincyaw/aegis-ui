import type { ComponentProps } from 'react';

import type { StatusDot } from './StatusDot';

/**
 * The state of a unit of work, drawn as a dot. `active` is work in progress,
 * e.g. a running task: the ink dot pulses. `warn` is the caution ink, `error`
 * the anomaly red.
 */
export type WorkStatus = 'ok' | 'active' | 'warn' | 'error' | 'muted';

type DotTone = NonNullable<ComponentProps<typeof StatusDot>['tone']>;

const DOT_TONE: Record<WorkStatus, DotTone> = {
  ok: 'ink',
  active: 'ink',
  warn: 'caution',
  error: 'warning',
  muted: 'muted',
};

/** The StatusDot props for a status, on an inverted surface when selected. */
export function workStatusDot(
  status: WorkStatus,
  selected: boolean,
): { tone: DotTone; pulse: boolean } {
  const tone = DOT_TONE[status];
  return {
    tone: selected && tone === 'ink' ? 'inverted' : tone,
    pulse: status === 'active',
  };
}
