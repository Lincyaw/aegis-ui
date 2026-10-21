import { useEffect, useMemo, useState } from 'react';

import './TimeDisplay.css';
import { relativeTime } from './relativeTime';

interface TimeDisplayProps {
  /** ISO string, timestamp ms, or Date object. */
  value: string | number | Date;
  /** 'absolute' = full timestamp, 'relative' = "2m ago", 'duration' = elapsed time. */
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

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }
  const sec = ms / 1000;
  if (sec < 60) {
    return `${sec.toFixed(2)} s`.replace(/\.00$/, ' s');
  }
  const min = Math.floor(sec / 60);
  const remSec = Math.round(sec % 60);
  if (min < 60) {
    return `${min} m ${remSec} s`;
  }
  const hour = Math.floor(min / 60);
  const remMin = min % 60;
  return `${hour} h ${remMin} m`;
}

export function TimeDisplay({
  value,
  mode = 'absolute',
  refreshMs = 60_000,
  className,
}: TimeDisplayProps) {
  const d = useMemo(
    () => (value instanceof Date ? value : new Date(value)),
    [value],
  );

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

  const display = useMemo(() => {
    if (mode === 'duration') {
      const ms = typeof value === 'number' ? value : d.getTime();
      return formatDuration(ms);
    }
    if (mode === 'relative') {
      return relativeTime(d, now);
    }
    return formatAbsolute(d);
  }, [d, mode, value, now]);

  const tooltip = useMemo(() => {
    if (mode === 'absolute') {
      return undefined;
    }
    return formatAbsolute(d);
  }, [d, mode]);

  const cls = ['aegis-time-display', className ?? ''].filter(Boolean).join(' ');

  return (
    <span className={cls} title={tooltip}>
      {display}
    </span>
  );
}
