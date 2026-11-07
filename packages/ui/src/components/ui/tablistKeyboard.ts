/**
 * Index of the tab that a key moves to from the tab at `index` in a row of
 * `count` tabs: ArrowLeft and ArrowRight step and wrap, Home and End jump
 * to the ends, each passing over the tabs `isDisabled` names. `null` for any
 * other key.
 */
export function tablistKeyTarget(
  key: string,
  index: number,
  count: number,
  isDisabled: (index: number) => boolean = () => false,
): number | null {
  const step = (from: number, delta: 1 | -1): number => {
    let at = from;
    for (let n = 0; n < count; n += 1) {
      at = (at + delta + count) % count;
      if (!isDisabled(at)) {
        return at;
      }
    }
    return index;
  };
  switch (key) {
    case 'ArrowRight':
      return step(index, 1);
    case 'ArrowLeft':
      return step(index, -1);
    case 'Home':
      return step(count - 1, 1);
    case 'End':
      return step(0, -1);
    default:
      return null;
  }
}
