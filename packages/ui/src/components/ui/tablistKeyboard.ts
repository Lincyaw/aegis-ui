/**
 * Index of the tab that a key moves to from the tab at `index` in a row of
 * `count` tabs: ArrowLeft and ArrowRight step and wrap, Home and End jump
 * to the ends. `null` for any other key.
 */
export function tablistKeyTarget(
  key: string,
  index: number,
  count: number,
): number | null {
  switch (key) {
    case 'ArrowRight':
      return (index + 1) % count;
    case 'ArrowLeft':
      return (index - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
