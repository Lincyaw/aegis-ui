import { type RefObject, createContext } from 'react';

export interface ShellNavContextValue {
  open: boolean;
  toggle: () => void;
  toggleRef: RefObject<HTMLButtonElement>;
}

/** The navigation drawer, offered to the page while the shell has no header. */
export const ShellNavContext = createContext<ShellNavContextValue | null>(null);
