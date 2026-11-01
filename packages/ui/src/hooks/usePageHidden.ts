import { useSyncExternalStore } from 'react';

function subscribeToVisibility(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  return () => {
    document.removeEventListener('visibilitychange', onChange);
  };
}

function isDocumentHidden(): boolean {
  return document.hidden;
}

function isHiddenOnServer(): boolean {
  return false;
}

/** Tracks whether the document is hidden (a background tab or minimised). */
export function usePageHidden(): boolean {
  return useSyncExternalStore(
    subscribeToVisibility,
    isDocumentHidden,
    isHiddenOnServer,
  );
}
