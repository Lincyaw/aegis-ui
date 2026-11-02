/** Colours of the data palette in theme.css. */
export type ChartPaletteColor =
  | 'seq'
  | 'cat-1'
  | 'cat-2'
  | 'cat-3'
  | 'cat-4'
  | 'cat-5'
  | 'cat-6'
  | 'unknown';

/**
 * How a chart colours a series: a palette colour (`seq` for one
 * magnitude, `cat-1`…`cat-6` to tell series apart, `unknown` a neutral
 * fill for a share not classified yet), or a `var(…)` reference to a host
 * token, so one vendor keeps its colour on every chart.
 */
export type ChartColor = ChartPaletteColor | `var(--${string})`;

const PALETTE_VALUES: Record<ChartPaletteColor, string> = {
  seq: 'var(--data-seq)',
  'cat-1': 'var(--data-cat-1)',
  'cat-2': 'var(--data-cat-2)',
  'cat-3': 'var(--data-cat-3)',
  'cat-4': 'var(--data-cat-4)',
  'cat-5': 'var(--data-cat-5)',
  'cat-6': 'var(--data-cat-6)',
  unknown: 'var(--bg-muted)',
};

/** The CSS colour of a chart colour. */
export function chartColorValue(color: ChartColor): string {
  return color.startsWith('var(')
    ? color
    : PALETTE_VALUES[color as ChartPaletteColor];
}

/**
 * The span an axis covers: from 0 (or the smallest value, when negative)
 * to `max` when given, else to the largest value. A span of all zeros
 * becomes [0, 1] so the scale still divides.
 */
export function zeroAnchoredDomain(
  values: number[],
  max?: number,
): [number, number] {
  const lo = Math.min(0, ...values);
  const hi = max ?? Math.max(0, ...values);
  return hi <= lo ? [lo, lo + 1] : [lo, hi];
}

/** The smallest 1, 2 or 5 × 10ⁿ step not below `raw`. */
export function niceStep(raw: number): number {
  if (!(raw > 0) || !Number.isFinite(raw)) {
    return 1;
  }
  const base = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / base;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * base;
}

const MAX_TICKS = 50;

/**
 * Round values from `lo` to `hi`, about `count` of them. Ticks are
 * computed by index rather than by repeated addition, so a span far from
 * zero (nanosecond timestamps) neither drifts nor stalls, and each is
 * rounded to the step's decimals, so 0.6 stays 0.6 and an end that is a
 * multiple of the step is a tick.
 */
export function niceTicks(lo: number, hi: number, count = 5): number[] {
  if (!(hi > lo)) {
    return [];
  }
  const step = niceStep((hi - lo) / count);
  // Absorbs division error such as 0.6 / 0.2 = 2.9999999999999996.
  const epsilon = 1e-9;
  const first = Math.ceil(lo / step - epsilon);
  const last = Math.floor(hi / step + epsilon);
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const ticks: number[] = [];
  for (let i = first; i <= last && ticks.length < MAX_TICKS; i += 1) {
    const tick = Number((i * step).toFixed(decimals));
    ticks.push(tick === 0 ? 0 : tick);
  }
  return ticks;
}

/** How far later rows lag behind the first, as a share of the draw. */
const STAGGER = 0.12;

/**
 * The share of row `index` (of `count`) that is drawn when the chart as a
 * whole is `progress` of the way in: rows start one after another and
 * all finish at 1.
 */
export function staggeredProgress(
  progress: number,
  index: number,
  count: number,
): number {
  const span = 1 + STAGGER * Math.max(count - 1, 0);
  return Math.min(1, Math.max(0, progress * span - STAGGER * index));
}

/**
 * Where `progress` is within one stage, `from` to `to`, of a chart's draw:
 * 0 before the stage, 1 after it.
 */
export function stageProgress(
  progress: number,
  from: number,
  to: number,
): number {
  return Math.min(1, Math.max(0, (progress - from) / (to - from)));
}
