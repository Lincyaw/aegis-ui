import { useEffect, useRef } from 'react';

export function useWarnOnce(shouldWarn: boolean, message: string): void {
  const warnedRef = useRef(false);
  useEffect(() => {
    if (shouldWarn && !warnedRef.current) {
      warnedRef.current = true;
      console.warn(message);
    }
  }, [shouldWarn, message]);
}
