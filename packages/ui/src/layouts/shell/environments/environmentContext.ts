import { createContext } from 'react';

import type { EnvironmentManifestStatus } from './types';

export interface EnvironmentContextValue {
  appId: string;
  state: EnvironmentManifestStatus;
}

export const EnvironmentContext = createContext<EnvironmentContextValue | null>(
  null,
);
