import type { CircuitTone, CircuitWirePattern } from '@lincyaw/aegis-ui';
import type { StatsPair, WindowStats } from '@lincyaw/review-api';

import type { ReviewStrings } from '../locale/context';

import { fmtPp, fmtRatio } from './format';

/**
 * The thresholds behind the colours, the same ones the review guide uses.
 * They colour the evidence; they never decide a verdict.
 */
export const THRESHOLDS = {
  /** Error rate up by at least this share (5 percentage points). */
  errorRise: 0.05,
  /** p50 or p95 at least this many times the normal window's. */
  latencyRatio: 1.5,
} as const;

/** The thresholds in words, under the legend. */
export function thresholdNote(s: ReviewStrings): string {
  return s.thresholdNote(THRESHOLDS.errorRise * 100, THRESHOLDS.latencyRatio);
}

export type Change =
  | 'none'
  | 'vanished'
  | 'new'
  | 'errors'
  | 'slower'
  | 'steady';

export interface Classified {
  change: Change;
  errorDelta: number;
  /** The larger of the p50 and p95 ratios, when both windows have them. */
  latencyRatio?: number;
  p95Ratio?: number;
  callRatio?: number;
}

function ratio(
  a: number | undefined,
  b: number | undefined
): number | undefined {
  return a === undefined || b === undefined || a <= 0 ? undefined : b / a;
}

export function classify(stats: StatsPair): Classified {
  const { normal, abnormal } = stats;
  const errorDelta = abnormal.errorRate - normal.errorRate;
  const p50 = ratio(normal.p50Ms, abnormal.p50Ms);
  const p95 = ratio(normal.p95Ms, abnormal.p95Ms);
  const latencyRatio =
    p50 === undefined && p95 === undefined
      ? undefined
      : Math.max(p50 ?? 0, p95 ?? 0);
  const callRatio =
    normal.calls > 0 ? abnormal.calls / normal.calls : undefined;
  const base = { errorDelta, latencyRatio, p95Ratio: p95, callRatio };
  if (normal.calls === 0 && abnormal.calls === 0) {
    return { ...base, change: 'none' };
  }
  if (abnormal.calls === 0) {
    return { ...base, change: 'vanished' };
  }
  if (normal.calls === 0) {
    return { ...base, change: 'new' };
  }
  if (errorDelta >= THRESHOLDS.errorRise) {
    return { ...base, change: 'errors' };
  }
  if (latencyRatio !== undefined && latencyRatio >= THRESHOLDS.latencyRatio) {
    return { ...base, change: 'slower' };
  }
  return { ...base, change: 'steady' };
}

export function toneOf(change: Change): CircuitTone {
  switch (change) {
    case 'errors':
      return 'alarm';
    case 'slower':
      return 'caution';
    case 'none':
      return 'faint';
    case 'vanished':
    case 'new':
    case 'steady':
      return 'neutral';
  }
}

export function patternOf(change: Change): CircuitWirePattern {
  return change === 'vanished'
    ? 'dashed'
    : change === 'new'
      ? 'dotted'
      : 'solid';
}

/** How much the change matters when choosing which neighbours to draw. */
export function changeRank(c: Classified): number {
  switch (c.change) {
    case 'errors':
      return 4;
    case 'vanished':
      return 3;
    case 'slower':
      return 2;
    case 'new':
      return 1;
    case 'steady':
    case 'none':
      return 0;
  }
}

/** The change in a few characters, e.g. "×3.40" or "+41 pp". */
export function changeShort(c: Classified, s: ReviewStrings): string {
  switch (c.change) {
    case 'errors':
      return s.changeErr(fmtPp(c.errorDelta));
    case 'slower':
      return fmtRatio(c.latencyRatio ?? 1);
    case 'vanished':
      return s.changeGone;
    case 'new':
      return s.changeNew;
    case 'none':
      return '';
    case 'steady':
      return c.p95Ratio === undefined ? '' : fmtRatio(c.p95Ratio);
  }
}

export function emptyStats(): WindowStats {
  return { calls: 0, errorRate: 0 };
}
