/** ISO time of a nanosecond epoch timestamp; null when the timestamp is unset (0). */
export function nsToIso(ns: number): string | null {
  return ns ? new Date(Math.round(ns / 1_000_000)).toISOString() : null;
}
