import { useEffect, useLayoutEffect } from 'react';

/**
 * `useLayoutEffect` in the browser and `useEffect` on the server, where
 * layout effects never run and React 18 warns about them, so a page can
 * be prerendered.
 */
export const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;
