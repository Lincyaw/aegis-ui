import { createContext, useContext } from 'react';

export interface SsoAuthHandle {
  complete: (code: string, state: string) => Promise<string>;
}

export const SsoCallbackContext = createContext<SsoAuthHandle | null>(null);

export function useSsoCallback(): SsoAuthHandle {
  const v = useContext(SsoCallbackContext);
  if (!v) {
    throw new Error('useSsoCallback must be used inside <SsoAuthProvider>');
  }
  return v;
}
