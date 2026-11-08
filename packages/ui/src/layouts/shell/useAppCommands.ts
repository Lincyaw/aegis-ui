import { useEffect, useMemo } from 'react';

import { type Command, useCommands } from '../../commands';
import type { AegisApp } from './types';

/**
 * Registers each visible app's `commands`, scoped to that app, and points
 * the registry's active scope at the active app.
 */
export function useAppCommands(
  visibleApps: AegisApp[],
  activeAppId: string | undefined,
): void {
  const { register, setActiveScope } = useCommands();

  useEffect(() => {
    setActiveScope(activeAppId);
  }, [setActiveScope, activeAppId]);

  const appCommands = useMemo<Command[]>(
    () =>
      visibleApps.flatMap((app) =>
        (app.commands ?? []).map((cmd) => ({ ...cmd, scope: app.id })),
      ),
    [visibleApps],
  );
  useEffect(() => register(appCommands), [register, appCommands]);
}
