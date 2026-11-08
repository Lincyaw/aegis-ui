import { useEffect, useState } from 'react';

/** True while something is being dragged over the window. */
export function useWindowDragActive(): boolean {
  const [depth, setDepth] = useState(0);

  useEffect(() => {
    let current = 0;
    const set = (next: number): void => {
      current = next;
      setDepth(next);
    };
    const onDragEnter = (): void => {
      set(current + 1);
    };
    const onDragLeave = (e: DragEvent): void => {
      set(e.relatedTarget === null ? 0 : Math.max(0, current - 1));
    };
    const onDrop = (): void => {
      set(0);
    };
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  return depth > 0;
}
