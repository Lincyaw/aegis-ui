import { createContext } from 'react';

import { type AegisStrings, enStrings } from './strings';

export const LocaleContext = createContext<AegisStrings>(enStrings);
