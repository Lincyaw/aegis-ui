import { useContext } from 'react';

import { EnvironmentContext } from './environmentContext';
import type { EnvironmentDescriptor, EnvironmentManifestStatus } from './types';

/**
 * Read the active app's current environment selection. Returns `null`
 * when no app is active, while the manifest loads, when loading failed,
 * and when the backend declares none and the app gives no fallback.
 */
export function useCurrentEnvironment(): EnvironmentDescriptor | null {
  const ctx = useContext(EnvironmentContext);
  if (!ctx) {
    return null;
  }
  switch (ctx.state.status) {
    case 'ready':
    case 'unsupported':
      return ctx.state.currentEnv;
    case 'idle':
    case 'loading':
    case 'error':
      return null;
  }
}

/** Read the full status object — useful for the switcher itself. */
export function useEnvironmentManifest(): EnvironmentManifestStatus {
  const ctx = useContext(EnvironmentContext);
  if (!ctx) {
    return { status: 'idle' };
  }
  return ctx.state;
}
