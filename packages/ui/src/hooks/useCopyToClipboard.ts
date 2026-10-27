import { useCallback, useEffect, useRef, useState } from 'react';

import copyText from 'copy-to-clipboard';

export interface UseCopyToClipboardResult {
  /** True for `resetMs` after a successful copy. */
  copied: boolean;
  /** Resolves false when the browser refuses the copy. */
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

  // copy-to-clipboard falls back to execCommand, so copying also works on
  // plain-HTTP pages where navigator.clipboard is unavailable.
  const copy = useCallback(
    (text: string): Promise<boolean> => {
      if (!copyText(text)) {
        return Promise.resolve(false);
      }
      window.clearTimeout(timerRef.current);
      setCopied(true);
      timerRef.current = window.setTimeout(() => {
        setCopied(false);
      }, resetMs);
      return Promise.resolve(true);
    },
    [resetMs],
  );

  const reset = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setCopied(false);
  }, []);

  return { copied, copy, reset };
}
