// Time-range parsing logic adapted from HyperDX (MIT, DeploySentinel Inc. 2023):
// https://github.com/hyperdxio/hyperdx/blob/main/packages/app/src/components/TimePicker/utils.ts
//
// Adaptations for aegis-ui:
//   - Canonical value model: `now-<duration>` (e.g. `now-15m`, `now-1h`,
//     `now-30d`) for relative ranges. Absolute ranges use the natural
//     `chrono-node` syntax (e.g. "Apr 12 10:00 to Apr 12 11:30").
//   - The parser returns a single `TimeRange | null` object instead of a
//     `[from, to]` tuple, and carries a `label` for UI display.
//   - `RELATIVE_TIME_PRESETS` is the curated shortlist surfaced in the
//     picker UI (compact labels like `15m`, `1h`).
import * as chrono from 'chrono-node';
import ms from 'ms';

type MsStringValue = Parameters<typeof ms>[0];

export interface TimeRange {
  from: Date;
  to: Date;
  /** Canonical human-readable label (e.g. "Last 15m"). */
  label?: string;
}

export interface RelativeTimePreset {
  label: string;
  value: string;
}

const NOW_RELATIVE_RE = /^now-([0-9]+(?:\.[0-9]+)?(?:ms|s|m|h|d|w|y))$/i;

/** Compact presets shown in the picker. Override via the `presets` prop. */
export const RELATIVE_TIME_PRESETS: RelativeTimePreset[] = [
  { label: '5m', value: 'now-5m' },
  { label: '15m', value: 'now-15m' },
  { label: '30m', value: 'now-30m' },
  { label: '1h', value: 'now-1h' },
  { label: '3h', value: 'now-3h' },
  { label: '6h', value: 'now-6h' },
  { label: '12h', value: 'now-12h' },
  { label: '1d', value: 'now-1d' },
  { label: '2d', value: 'now-2d' },
  { label: '7d', value: 'now-7d' },
  { label: '14d', value: 'now-14d' },
  { label: '30d', value: 'now-30d' },
];

function normalizeParsedDate(
  parsed: chrono.ParsedComponents | undefined,
  now: Date,
): Date | null {
  if (!parsed) {
    return null;
  }

  const reference = new Date(now);
  const parsedDate = parsed.date();

  if (
    !(
      parsed.isCertain('hour') ||
      parsed.isCertain('minute') ||
      parsed.isCertain('second') ||
      parsed.isCertain('millisecond')
    )
  ) {
    reference.setHours(parsed.get('hour') ?? 0);
    reference.setMinutes(parsed.get('minute') ?? 0);
    reference.setSeconds(parsed.get('second') ?? 0);
    reference.setMilliseconds(parsed.get('millisecond') ?? 0);
  }

  if (parsedDate > reference) {
    const oneDayFromNow = reference.getTime() + ms('1d');
    if (parsedDate.getTime() <= oneDayFromNow) {
      return reference;
    } else if (!parsed.isCertain('year')) {
      parsedDate.setFullYear(parsedDate.getFullYear() - 1);
    }
  }

  return parsedDate;
}

/**
 * Parse a `now-<duration>` relative expression. Returns `null` if the
 * input is not in that form or the duration is unrecognised.
 */
export function parseRelativeTime(
  input: string,
  now: Date = new Date(),
): TimeRange | null {
  const match = NOW_RELATIVE_RE.exec(input.trim());
  if (!match) {
    return null;
  }
  const duration = ms(match[1] as MsStringValue);
  if (typeof duration !== 'number' || !Number.isFinite(duration)) {
    return null;
  }
  return {
    from: new Date(now.getTime() - duration),
    to: new Date(now.getTime()),
    label: `Last ${match[1]}`,
  };
}

function formatAbsoluteLabel(from: Date, to: Date): string {
  const fmt = (d: Date): string =>
    d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  return `${fmt(from)} → ${fmt(to)}`;
}

/**
 * Parse an arbitrary string into a `TimeRange`. Accepts:
 *   - `now-15m` style relative expressions (preferred canonical form)
 *   - any natural-language expression chrono-node understands
 *     (e.g. "yesterday 10am to today 11am", "last 30 minutes")
 * Returns `null` when the input cannot be parsed.
 */
export function parseTimeRangeInput(
  input: string,
  now: Date = new Date(),
): TimeRange | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const relative = parseRelativeTime(trimmed, now);
  if (relative) {
    return relative;
  }

  const results = chrono.parse(trimmed, now);
  if (results.length === 0) {
    return null;
  }
  const result = results.length === 1 ? results[0] : results[1];
  const start = normalizeParsedDate(result.start, now);
  const end = normalizeParsedDate(result.end, now) ?? new Date(now);
  if (!start) {
    return null;
  }
  const [from, to] = end < start ? [end, start] : [start, end];
  return { from, to, label: formatAbsoluteLabel(from, to) };
}
