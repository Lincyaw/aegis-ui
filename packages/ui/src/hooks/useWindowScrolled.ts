import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('scroll', onChange, { passive: true });
  return () => {
    window.removeEventListener('scroll', onChange);
  };
}

function isScrolled(): boolean {
  return window.scrollY > 0;
}

function isScrolledOnServer(): boolean {
  return false;
}

/** Whether the window has scrolled away from its top. */
export function useWindowScrolled(): boolean {
  return useSyncExternalStore(subscribe, isScrolled, isScrolledOnServer);
}
