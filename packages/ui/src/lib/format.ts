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

const SUB_MINUTE_UNITS: ReadonlyArray<{ symbol: string; ms: number }> = [
  { symbol: 'ns', ms: 1e-6 },
  { symbol: 'µs', ms: 1e-3 },
  { symbol: 'ms', ms: 1 },
  { symbol: 's', ms: 1000 },
];

/** Three significant digits, decided after rounding: `9.996` gives `10.0`. */
function threeDigits(value: number): string {
  return value.toFixed(value >= 99.95 ? 0 : value >= 9.995 ? 1 : 2);
}

/**
 * Formats a duration in milliseconds with three significant digits in the
 * largest unit that holds it: `512 ns`, `500 µs`, `12.3 ms`, `1.50 s`; from a
 * minute on, whole units: `2 min 3 s`, `1 h 5 min`. The micro sign is U+00B5,
 * which the UI face draws (it has no Greek mu).
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms)) {
    return '—';
  }
  if (ms < 0) {
    return `-${formatDuration(-ms)}`;
  }
  if (ms === 0) {
    return '0 ms';
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
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) {
    return `${minutes.toString()} min ${(totalSeconds % 60).toString()} s`;
  }
  return `${hours.toString()} h ${minutes.toString()} min`;
}
