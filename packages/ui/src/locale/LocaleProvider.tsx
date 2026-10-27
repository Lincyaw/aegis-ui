import { type ReactNode } from 'react';

import { LocaleContext } from './localeContext';
import { type AegisStrings } from './strings';

interface LocaleProviderProps {
  strings: AegisStrings;
  children: ReactNode;
}

/** Supplies the strings primitives render; without it they render English. */
export function LocaleProvider({ strings, children }: LocaleProviderProps) {
  return (
    <LocaleContext.Provider value={strings}>{children}</LocaleContext.Provider>
  );
}
