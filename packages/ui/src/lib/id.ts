/** Returns `<prefix>-<time>-<random>`, unique enough for client-side ids. */
export function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
