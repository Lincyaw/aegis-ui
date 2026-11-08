/** Formatting shared by the evidence board and the detail panels. */

export function fmtCount(n: number): string {
  if (n >= 10_000) {
    return `${(n / 1000).toFixed(0)}k`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return n.toFixed(0);
}

export function fmtMs(ms: number | undefined | null): string {
  if (ms === undefined || ms === null) {
    return '–';
  }
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(ms >= 10_000 ? 1 : 2)} s`;
  }
  if (ms >= 100) {
    return `${ms.toFixed(0)} ms`;
  }
  if (ms >= 10) {
    return `${ms.toFixed(1)} ms`;
  }
  return `${ms.toFixed(ms >= 1 ? 2 : 3)} ms`;
}

/** A latency without its unit, for "9.1 → 31 ms". */
export function fmtMsBare(ms: number | undefined | null): string {
  if (ms === undefined || ms === null) {
    return '–';
  }
  if (ms >= 100) {
    return ms.toFixed(0);
  }
  if (ms >= 10) {
    return ms.toFixed(1);
  }
  return ms.toFixed(ms >= 1 ? 2 : 3);
}

export function fmtPct(rate: number | undefined | null): string {
  if (rate === undefined || rate === null) {
    return '–';
  }
  const pct = rate * 100;
  if (pct === 0) {
    return '0%';
  }
  if (pct < 10) {
    return `${pct.toFixed(1)}%`;
  }
  return `${pct.toFixed(0)}%`;
}

export function fmtRatio(ratio: number): string {
  if (ratio >= 100) {
    return `×${ratio.toFixed(0)}`;
  }
  if (ratio >= 10) {
    return `×${ratio.toFixed(1)}`;
  }
  return `×${ratio.toFixed(2)}`;
}

export function fmtPp(delta: number): string {
  const pp = delta * 100;
  const sign = pp > 0 ? '+' : pp < 0 ? '−' : '±';
  const abs = Math.abs(pp);
  return `${sign}${abs.toFixed(abs < 10 ? 1 : 0)} pp`;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** UTC clock time of a Unix-seconds value: the guide and the facts use UTC. */
export function fmtClock(t: number, precision: 'minute' | 'second'): string {
  const d = new Date(t * 1000);
  const hm = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
  return precision === 'minute' ? hm : `${hm}:${pad2(d.getUTCSeconds())}`;
}

export function fmtDateTime(t: number): string {
  const d = new Date(t * 1000);
  return `${String(d.getUTCFullYear())}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${fmtClock(t, 'second')} UTC`;
}

/** A metric value in its unit; bytes scale to KiB / MiB / GiB. */
export function fmtMetric(value: number, unit: string | undefined): string {
  const bytes = unit === 'By' || unit === 'By/s';
  if (bytes) {
    const steps = ['B', 'KiB', 'MiB', 'GiB'];
    let v = value;
    let i = 0;
    while (Math.abs(v) >= 1024 && i < steps.length - 1) {
      v /= 1024;
      i += 1;
    }
    const n = Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1);
    return `${n} ${steps[i]}${unit === 'By/s' ? '/s' : ''}`;
  }
  if (unit === '1') {
    return fmtPct(value);
  }
  const abs = Math.abs(value);
  const n =
    abs === 0
      ? '0'
      : abs >= 1000
        ? fmtCount(value)
        : abs >= 10
          ? value.toFixed(0)
          : abs >= 0.1
            ? value.toFixed(2)
            : value.toPrecision(2);
  return unit === undefined || unit === '' ? n : `${n} ${unit}`;
}
