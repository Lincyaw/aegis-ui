import type { AegisStrings } from '../../locale';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/**
 * Short, human-friendly relative time in the strings' language, as
 * inbox-style UIs show it: "just now", "5m ago", "yesterday", "3d ago",
 * then the date, "Mar 4".
 */
export function relativeTime(
  value: string | number | Date,
  strings: AegisStrings,
  now: number = Date.now(),
): string {
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) {
    return '';
  }
  const diff = now - t;
  if (diff < MIN) {
    return strings.relativeTime({ unit: 'now' });
  }
  if (diff < HOUR) {
    return strings.relativeTime({
      unit: 'minutes',
      count: Math.floor(diff / MIN),
    });
  }
  if (diff < DAY) {
    return strings.relativeTime({
      unit: 'hours',
      count: Math.floor(diff / HOUR),
    });
  }
  if (diff < 2 * DAY) {
    return strings.relativeTime({ unit: 'yesterday' });
  }
  if (diff < 7 * DAY) {
    return strings.relativeTime({
      unit: 'days',
      count: Math.floor(diff / DAY),
    });
  }
  return strings.relativeTime({ unit: 'date', date: new Date(t) });
}
