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
 * fill for a share not classified yet), or a `var(…)` reference to a
 * token, such as a `--series-*` vendor colour, so one vendor keeps its
 * colour on every chart.
 */
export type ChartColor = ChartPaletteColor | `var(--${string})`;

export type ChartLineStyle = 'solid' | 'dashed' | 'dotted';

export function chartLineDash(style: ChartLineStyle): string | undefined {
  return {
    solid: undefined,
    dashed: 'var(--space-2) var(--space-1)',
    dotted: 'var(--size-hairline) var(--space-1)',
  }[style];
}

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

/** The smallest 1, 2 or 5 × 10ⁿ step not below `raw`, as `digit × 10^exponent`. */
function niceStep(raw: number): { digit: number; exponent: number } {
  const exponent = Math.floor(Math.log10(raw));
  const normalized = raw / 10 ** exponent;
  return normalized <= 1
    ? { digit: 1, exponent }
    : normalized <= 2
      ? { digit: 2, exponent }
      : normalized <= 5
        ? { digit: 5, exponent }
        : { digit: 1, exponent: exponent + 1 };
}

const MAX_TICKS = 50;

/**
 * Round values from `lo` to `hi`, about `count` of them. Each tick is read
 * from its decimal, such as `3e-1`, so it is the double nearest that
 * decimal: 0.6 stays 0.6, a span far from zero (nanosecond timestamps)
 * neither drifts nor stalls, and an end that is a multiple of the step is
 * a tick however many steps it lies from zero.
 */
export function niceTicks(lo: number, hi: number, count = 5): number[] {
  if (!(hi > lo) || !Number.isFinite(lo) || !Number.isFinite(hi)) {
    return [];
  }
  // Halving first keeps a span such as ±1e308 from overflowing; the
  // halves are exact, so any other span gives the same quotient.
  const raw = ((hi / 2 - lo / 2) / count) * 2;
  if (!(raw > 0) || !Number.isFinite(raw)) {
    return [];
  }
  // A step finer than the doubles near the ends would round neighbouring
  // ticks onto one value.
  const resolution = Math.max(Math.abs(lo), Math.abs(hi)) * Number.EPSILON;
  const { digit, exponent } = niceStep(Math.max(raw, resolution));
  const tickAt = (index: number): number =>
    Number(`${String(BigInt(index) * BigInt(digit))}e${String(exponent)}`);
  const step = tickAt(1);
  if (!Number.isFinite(step)) {
    return [];
  }
  // How many steps from zero `value` lies, scaled through its decimal: a
  // division by a subnormal step would be off by millions of steps.
  const stepsTo = (value: number): number => {
    const [mantissa, power] = value.toExponential().split('e');
    return Number(`${mantissa}e${String(Number(power) - exponent)}`) / digit;
  };
  // Absorbs float error in an end, such as 0.1 * 3 = 0.30000000000000004.
  const slack = step * 1e-9;
  // The estimates can miss by a step or two when the step is an ulp or
  // two of the ends.
  let first = Math.floor(stepsTo(lo));
  while (tickAt(first - 1) >= lo - slack) {
    first -= 1;
  }
  while (tickAt(first) < lo - slack) {
    first += 1;
  }
  let last = Math.ceil(stepsTo(hi));
  while (tickAt(last + 1) <= hi + slack) {
    last += 1;
  }
  while (tickAt(last) > hi + slack) {
    last -= 1;
  }
  const ticks: number[] = [];
  for (let i = first; i <= last && ticks.length < MAX_TICKS; i += 1) {
    ticks.push(tickAt(i));
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
