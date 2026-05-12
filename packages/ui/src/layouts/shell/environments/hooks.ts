import { useContext } from 'react';

import { AppEnvironmentContext } from './context';
import type { EnvironmentDescriptor, EnvironmentManifestStatus } from './types';

/**
 * Read the active app's current environment selection. Returns `null` when
 * no app is active or the manifest is still loading without a fallback.
 */
export function useCurrentEnvironment(): EnvironmentDescriptor | null {
  const ctx = useContext(AppEnvironmentContext);
  if (!ctx) {
    return null;
  }
  switch (ctx.state.status) {
    case 'ready':
      return ctx.state.currentEnv;
    case 'unsupported':
      return ctx.state.currentEnv;
    default:
      return null;
  }
}

/** Read the full status object — useful for the switcher itself. */
export function useEnvironmentManifest(): EnvironmentManifestStatus {
  const ctx = useContext(AppEnvironmentContext);
  if (!ctx) {
    return { status: 'idle' };
  }
  return ctx.state;
}
