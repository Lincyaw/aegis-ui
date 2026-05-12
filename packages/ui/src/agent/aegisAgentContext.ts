import { createContext } from 'react';

import type { AegisRuntime } from './runtime';

export interface AegisAgentContextValue {
  runtime: AegisRuntime;
  appId: string | null;
}

export const AegisAgentContext = createContext<AegisAgentContextValue | null>(
  null,
);
