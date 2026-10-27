import { useContext } from 'react';

import { LocaleContext } from './localeContext';
import { type AegisStrings } from './strings';

export function useStrings(): AegisStrings {
  return useContext(LocaleContext);
}
