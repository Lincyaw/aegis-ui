const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/**
 * Short, human-friendly relative time. Mirrors the conventions used in
 * inbox-style UIs ("just now", "5m", "2h", "yesterday", "Mon", "Mar 4").
 */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) {
    return '';
  }
  const diff = now - t;
  if (diff < MIN) {
    return 'just now';
  }
  if (diff < HOUR) {
    return `${String(Math.floor(diff / MIN))}m ago`;
  }
  if (diff < DAY) {
    return `${String(Math.floor(diff / HOUR))}h ago`;
  }
  if (diff < 2 * DAY) {
    return 'yesterday';
  }
  if (diff < 7 * DAY) {
    return `${String(Math.floor(diff / DAY))}d ago`;
  }
  const d = new Date(t);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
