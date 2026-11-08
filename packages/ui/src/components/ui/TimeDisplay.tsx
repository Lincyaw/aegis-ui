import { useEffect, useMemo, useState } from 'react';

import { formatDuration } from '../../lib/format';
import { useStrings } from '../../locale';
import './TimeDisplay.css';
import { relativeTime } from './relativeTime';

interface TimeDisplayProps {
  /**
   * ISO string, timestamp ms, or Date object. An empty or unreadable value
   * shows an em dash, read out as the locale's `noValue`.
   */
  value: string | number | Date | null | undefined;
  /**
   * 'absolute' = full timestamp, 'relative' = "2m ago" with the timestamp as
   * its tooltip, 'duration' = elapsed time with the exact milliseconds as its
   * tooltip.
   */
  mode?: 'absolute' | 'relative' | 'duration';
  /** For relative mode: refresh interval in ms (default 60 000). */
  refreshMs?: number;
  className?: string;
}

function formatAbsolute(d: Date): string {
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const pad = (n: number) => String(n).padStart(2, '0');
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  if (sameDay) {
    return time;
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`;
}

export function TimeDisplay({
  value,
  mode = 'absolute',
  refreshMs = 60_000,
  className,
}: TimeDisplayProps) {
  const strings = useStrings();
  const d = useMemo(() => {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [value]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (mode !== 'relative') {
      return;
    }
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, refreshMs);
    return () => {
      window.clearInterval(id);
    };
  }, [mode, refreshMs]);

  const durationMs = typeof value === 'number' ? value : d?.getTime();
  const hasDuration = durationMs !== undefined && Number.isFinite(durationMs);

  const display = useMemo(() => {
    if (mode === 'duration') {
      return hasDuration ? formatDuration(durationMs) : null;
    }
    if (d === null) {
      return null;
    }
    if (mode === 'relative') {
      return relativeTime(d, now);
    }
    return formatAbsolute(d);
  }, [d, mode, durationMs, hasDuration, now]);

  const tooltip = useMemo(() => {
    if (mode === 'duration') {
      return hasDuration ? `${String(durationMs)} ms` : undefined;
    }
    if (mode === 'absolute' || d === null) {
      return undefined;
    }
    return formatAbsolute(d);
  }, [d, mode, durationMs, hasDuration]);

  const cls = ['aegis-time-display', className ?? ''].filter(Boolean).join(' ');

  if (display === null) {
    return (
      <span className={cls}>
        <span aria-hidden="true">—</span>
        <span className="aegis-time-display__no-value">{strings.noValue}</span>
      </span>
    );
  }

  return (
    <span className={cls} title={tooltip}>
      {display}
    </span>
  );
}
