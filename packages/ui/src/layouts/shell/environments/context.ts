import { createContext } from 'react';

import type { EnvironmentManifestStatus } from './types';

export interface AppEnvironmentContextValue {
  appId: string;
  state: EnvironmentManifestStatus;
}

export const AppEnvironmentContext =
  createContext<AppEnvironmentContextValue | null>(null);
