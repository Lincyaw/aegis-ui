import { useEffect, useState } from 'react';

const COUNT_UP_MS = 600;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Counts from 0 to `target` once, on mount, easing out over about 600 ms.
 * Returns `target` itself when disabled, after the count, and at once
 * under prefers-reduced-motion.
 */
export function useCountUp(target: number, enabled: boolean): number {
  const [counting, setCounting] = useState(
    () => enabled && !window.matchMedia(REDUCED_MOTION).matches,
  );
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!counting) {
      return undefined;
    }
    const start = performance.now();
    let frame = 0;
    const step = (now: number): void => {
      const t = Math.min((now - start) / COUNT_UP_MS, 1);
      setProgress(1 - (1 - t) ** 3);
      if (t < 1) {
        frame = requestAnimationFrame(step);
      } else {
        setCounting(false);
      }
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [counting]);

  return counting ? target * progress : target;
}
