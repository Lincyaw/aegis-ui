/**
 * One reading of every lifecycle state the backend sends — injections,
 * traces, tasks, executions, pedestals and cluster checks. A resource's
 * lifecycle is its `state`; its `status` is the record's enabled / disabled /
 * deleted flag and never says whether work is running. The SDK capitalises
 * some states (`Failed`, `Running`) and not others (`inject_failed`), so
 * everything is compared lower-cased with separators dropped.
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
/**
 * An injection's datapack goes inject → build → detector, and only the
 * detector ends it: `inject_success` and `build_success` hand on to the next
 * stage, so the injection is still in progress.
 */
const DATAPACK_IN_PROGRESS = new Set(['injectsuccess', 'buildsuccess']);
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

function normalize(state: string | undefined): string {
  return (state ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

export function toneFor(state: string | undefined): StatusTone {
  const s = normalize(state);
  if (FAILURE.has(s) || s.endsWith('failed')) {
    return 'failure';
  }
  if (CAUTION.has(s)) {
    return 'caution';
  }
  if (ACTIVE.has(s) || DATAPACK_IN_PROGRESS.has(s)) {
    return 'active';
  }
  if (SUCCESS.has(s) || s.endsWith('success')) {
    return 'success';
  }
  return 'neutral';
}

/** Still moving: worth polling, cancellable. */
export function isActive(state: string | undefined): boolean {
  return toneFor(state) === 'active';
}

/** Finished for good: succeeded, failed or stopped. */
export function isTerminal(state: string | undefined): boolean {
  const tone = toneFor(state);
  return (
    tone === 'failure' || tone === 'success' || STOPPED.has(normalize(state))
  );
}
