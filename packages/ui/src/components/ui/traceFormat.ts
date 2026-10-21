import type { ReactNode } from 'react';

import type { TraceSpan } from './TraceTree';

export function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}µs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(ms < 10 ? 1 : 0)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

export function statusTone(
  status?: TraceSpan['status'],
): 'warning' | 'ink' | 'muted' {
  if (status === 'error') {
    return 'warning';
  }
  if (status === 'ok') {
    return 'ink';
  }
  return 'muted';
}

export function nodeToString(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  return '';
}
