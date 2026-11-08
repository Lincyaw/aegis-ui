const BYTE_UNITS = ['KB', 'MB', 'GB', 'TB'];

/** Formats a byte count in binary units: `512 B`, `1.5 KB`, `12 MB`. */
export function formatBytes(n: number): string {
  if (n < 1024) {
    return `${n.toString()} B`;
  }
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < BYTE_UNITS.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${BYTE_UNITS[i] ?? ''}`;
}

interface DurationUnit {
  symbol: string;
  ms: number;
}

const SUB_MINUTE_UNITS: readonly DurationUnit[] = [
  { symbol: 'ns', ms: 1e-6 },
  { symbol: 'µs', ms: 1e-3 },
  { symbol: 'ms', ms: 1 },
  { symbol: 's', ms: 1000 },
];

/** Below this a duration reads `<1 ns`: 0.9995 ns already rounds to `1.00 ns`. */
const SUB_NANOSECOND_MS = 0.9995e-6;

/** Three significant digits, decided after rounding: `9.996` gives `10.0`. */
function threeDigits(value: number): string {
  return value.toFixed(value >= 99.95 ? 0 : value >= 9.995 ? 1 : 2);
}

/** A whole number of seconds from a minute on: `2 min 3 s`, `1 h 5 min`. */
function wholeMinutes(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) {
    return `${minutes.toString()} min ${(totalSeconds % 60).toString()} s`;
  }
  return `${hours.toString()} h ${minutes.toString()} min`;
}

/**
 * Formats a duration in milliseconds with three significant digits in the
 * largest unit that holds it: `512 ns`, `500 µs`, `12.3 ms`, `1.50 s`; from a
 * minute on, whole units: `2 min 3 s`, `1 h 5 min`. Anything shorter than a
 * nanosecond, either side of zero, reads `<1 ns`; other negative durations
 * take a minus sign. The micro sign is U+00B5, which the UI face draws (it
 * has no Greek mu).
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms)) {
    return '—';
  }
  if (ms === 0) {
    return '0 ms';
  }
  if (Math.abs(ms) < SUB_NANOSECOND_MS) {
    return '<1 ns';
  }
  if (ms < 0) {
    return `-${formatDuration(-ms)}`;
  }
  if (ms < 59_950) {
    let index = 0;
    SUB_MINUTE_UNITS.forEach((unit, i) => {
      if (ms >= unit.ms) {
        index = i;
      }
    });
    if (
      ms / SUB_MINUTE_UNITS[index].ms >= 999.5 &&
      index < SUB_MINUTE_UNITS.length - 1
    ) {
      index += 1;
    }
    const unit = SUB_MINUTE_UNITS[index];
    return `${threeDigits(ms / unit.ms)} ${unit.symbol}`;
  }
  return wholeMinutes(Math.round(ms / 1000));
}

/**
 * Formats an estimate, such as the time left on an upload, in whole seconds
 * rounded up, since tenths of a second are noise there: `45 s`, `2 min 3 s`,
 * `1 h 5 min`.
 */
export function formatDurationEstimate(ms: number): string {
  if (!Number.isFinite(ms)) {
    return '—';
  }
  const totalSeconds = Math.max(Math.ceil(ms / 1000), 0);
  return totalSeconds < 60
    ? `${totalSeconds.toString()} s`
    : wholeMinutes(totalSeconds);
}

/**
 * The units a duration axis labels its ticks in, each from the range at
 * which it takes over. Minutes and hours wait until the range holds five, so
 * a range of a few minutes reads in round seconds.
 */
const AXIS_UNITS: ReadonlyArray<DurationUnit & { fromMs: number }> = [
  { symbol: 'ns', ms: 1e-6, fromMs: 0 },
  { symbol: 'µs', ms: 1e-3, fromMs: 1e-3 },
  { symbol: 'ms', ms: 1, fromMs: 1 },
  { symbol: 's', ms: 1000, fromMs: 1000 },
  { symbol: 'min', ms: 60_000, fromMs: 300_000 },
  { symbol: 'h', ms: 3_600_000, fromMs: 18_000_000 },
];

export interface DurationTick {
  /** Offset from the start of the axis, in ms. */
  ms: number;
  label: string;
}

const MAX_DURATION_TICKS = 50;
const NICE_MANTISSAS = [1, 2, 5];
/** Absorbs the rounding of a tick computed as index × step. */
const RANGE_TOLERANCE = 1e-12;

function axisUnit(rangeMs: number): DurationUnit {
  let unit = AXIS_UNITS[0];
  for (const candidate of AXIS_UNITS) {
    if (rangeMs >= candidate.fromMs) {
      unit = candidate;
    }
  }
  return unit;
}

/**
 * The steps a duration axis over `rangeMs` can tick at, densest first: the
 * 1, 2 and 5 × 10ⁿ values of the unit the range calls for that give between
 * two and `maxTicks` ticks. The last always gives at least two, so the list
 * has an entry for any positive range.
 */
export function durationTickSteps(rangeMs: number, maxTicks: number): number[] {
  if (!(rangeMs > 0) || !Number.isFinite(rangeMs)) {
    return [];
  }
  const limit = (rangeMs / axisUnit(rangeMs).ms) * (1 + RANGE_TOLERANCE);
  // Start from the largest step that still reaches a second tick.
  // Math.log10 can land a hair below a power of ten.
  let exponent = Math.floor(Math.log10(limit));
  if (10 ** (exponent + 1) <= limit) {
    exponent += 1;
  }
  let mantissa = NICE_MANTISSAS.length - 1;
  while (NICE_MANTISSAS[mantissa] * 10 ** exponent > limit) {
    mantissa -= 1;
    if (mantissa < 0) {
      mantissa = NICE_MANTISSAS.length - 1;
      exponent -= 1;
    }
  }
  const steps: number[] = [];
  while (steps.length < MAX_DURATION_TICKS) {
    const step = NICE_MANTISSAS[mantissa] * 10 ** exponent;
    if (steps.length > 0 && Math.floor(limit / step) + 1 > maxTicks) {
      break;
    }
    steps.push(step);
    mantissa -= 1;
    if (mantissa < 0) {
      mantissa = NICE_MANTISSAS.length - 1;
      exponent -= 1;
    }
  }
  return steps.reverse();
}

/**
 * The ticks from 0 to `rangeMs` every `step`, one of
 * `durationTickSteps(rangeMs, …)`, never one past `rangeMs`. Every tick is
 * labelled in the one unit the range calls for, with the decimals the step
 * needs: `0.0 s | 0.5 s | 1.0 s`, never a mix such as `500 ms | 1.00 s`.
 */
export function durationTicks(rangeMs: number, step: number): DurationTick[] {
  if (!(rangeMs > 0) || !Number.isFinite(rangeMs) || !(step > 0)) {
    return [];
  }
  const unit = axisUnit(rangeMs);
  const limit = (rangeMs / unit.ms) * (1 + RANGE_TOLERANCE);
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  const ticks: DurationTick[] = [];
  for (let i = 0; ticks.length < MAX_DURATION_TICKS; i += 1) {
    const value = Number((i * step).toFixed(decimals));
    if (value > limit) {
      break;
    }
    ticks.push({
      ms: Math.min(value * unit.ms, rangeMs),
      label: `${value.toFixed(decimals)} ${unit.symbol}`,
    });
  }
  return ticks;
}
