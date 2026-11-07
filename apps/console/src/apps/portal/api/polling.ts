/**
 * `auto` polls while the watched resource is still active and stops once it
 * is finished; any other choice is the user's and applies regardless.
 */
export type RefreshInterval = 'auto' | 'manual' | 2 | 5 | 10 | 30 | 60;

export const ACTIVE_POLL_MS = 3_000;

export function pollMs(
  choice: RefreshInterval,
  active: boolean
): number | false {
  if (choice === 'auto') {
    return active ? ACTIVE_POLL_MS : false;
  }
  return choice === 'manual' ? false : choice * 1000;
}

/** A `refetchInterval` that stops polling once a fetch has failed. */
export function unlessFailed(
  ms: number | false
): (query: { state: { status: string } }) => number | false {
  return (query) => (query.state.status === 'error' ? false : ms);
}
