/**
 * One reading of every state string the backend sends — injections, traces,
 * tasks, executions, pedestals and cluster checks. The SDK capitalises some
 * (`Failed`, `Success`, `Initial`) and not others, so everything is compared
 * lower-cased with separators dropped (`inject_failed` → `injectfailed`).
 */
export type StatusTone =
  | 'failure'
  | 'caution'
  | 'active'
  | 'success'
  | 'neutral';

const FAILURE = new Set([
  'fail',
  'failed',
  'failure',
  'error',
  'errored',
  'crashed',
  'timeout',
  'timedout',
]);
const CAUTION = new Set(['warn', 'warning', 'degraded']);
const ACTIVE = new Set([
  'initial',
  'pending',
  'queued',
  'scheduled',
  'rescheduled',
  'running',
  'restarting',
  'installing',
]);
const SUCCESS = new Set([
  'ok',
  'pass',
  'passed',
  'success',
  'succeeded',
  'complete',
  'completed',
  'done',
]);
const STOPPED = new Set(['cancelled', 'canceled', 'stopped', 'uninstalled']);

function normalize(status: string | undefined): string {
  return (status ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

export function toneFor(status: string | undefined): StatusTone {
  const s = normalize(status);
  if (FAILURE.has(s) || s.endsWith('failed')) {
    return 'failure';
  }
  if (CAUTION.has(s)) {
    return 'caution';
  }
  if (ACTIVE.has(s)) {
    return 'active';
  }
  if (SUCCESS.has(s) || s.endsWith('success')) {
    return 'success';
  }
  return 'neutral';
}

/** Still moving: worth polling, cancellable. */
export function isActive(status: string | undefined): boolean {
  return toneFor(status) === 'active';
}

/** Finished for good: succeeded, failed or stopped. */
export function isTerminal(status: string | undefined): boolean {
  const tone = toneFor(status);
  return (
    tone === 'failure' || tone === 'success' || STOPPED.has(normalize(status))
  );
}
