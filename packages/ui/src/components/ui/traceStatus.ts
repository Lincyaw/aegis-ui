import type { TraceSpan } from './TraceTree';

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
