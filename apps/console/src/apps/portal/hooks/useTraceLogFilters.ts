import { useEffect, useState } from 'react';

import type { TraceLogsOptions } from '../api/traces';

export type LogLevelFilter = 'all' | 'error' | 'warn' | 'info';

export interface TraceLogFilters {
  level: LogLevelFilter;
  setLevel: (level: LogLevelFilter) => void;
  search: string;
  setSearch: (search: string) => void;
  limit: number;
  setLimit: (limit: number) => void;
  /** True when a level or (debounced) search filter narrows the result. */
  active: boolean;
  query: TraceLogsOptions;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      clearTimeout(handle);
    };
  }, [value, delayMs]);
  return debounced;
}

export function useTraceLogFilters(): TraceLogFilters {
  const [level, setLevel] = useState<LogLevelFilter>('all');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(200);
  const q = useDebouncedValue(search.trim(), 300);
  return {
    level,
    setLevel,
    search,
    setSearch,
    limit,
    setLimit,
    active: level !== 'all' || q.length > 0,
    query: {
      limit,
      level: level === 'all' ? undefined : level,
      q: q.length > 0 ? q : undefined,
    },
  };
}
