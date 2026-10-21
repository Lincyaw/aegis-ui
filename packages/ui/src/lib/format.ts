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
