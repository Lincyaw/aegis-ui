/**
 * Runs `worker` over `items` with at most `concurrency` calls in flight and
 * settles once every call has, keeping each outcome in input order.
 */
export async function runPool<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<Array<PromiseSettledResult<R>>> {
  const results: Array<PromiseSettledResult<R>> = new Array<
    PromiseSettledResult<R>
  >(items.length);
  let next = 0;

  async function lane(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      try {
        results[index] = {
          status: 'fulfilled',
          value: await worker(items[index] as T),
        };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  const lanes = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: lanes }, lane));
  return results;
}
