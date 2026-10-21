import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseCopyToClipboardResult {
  /** True for `resetMs` after a successful copy. */
  copied: boolean;
  /** Resolves false when the clipboard is unavailable or denied. */
  copy: (text: string) => Promise<boolean>;
  reset: () => void;
}

export function useCopyToClipboard(resetMs: number): UseCopyToClipboardResult {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        return false;
      }
      window.clearTimeout(timerRef.current);
      setCopied(true);
      timerRef.current = window.setTimeout(() => {
        setCopied(false);
      }, resetMs);
      return true;
    },
    [resetMs],
  );

  const reset = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setCopied(false);
  }, []);

  return { copied, copy, reset };
}
