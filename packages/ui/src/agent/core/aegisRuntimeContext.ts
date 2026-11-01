import { createContext } from 'react';

import type { AegisRuntime } from './runtime';

export interface AegisRuntimeContextValue {
  runtime: AegisRuntime;
  appId: string | null;
}

export const AegisRuntimeContext =
  createContext<AegisRuntimeContextValue | null>(null);
