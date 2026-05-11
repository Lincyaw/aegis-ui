import { useEffect, useRef } from 'react';

import type { Command } from './commandContext';
import { useCommands } from './useCommands';

/**
 * Register a batch of commands while the calling component is mounted.
 * The effect re-runs only when the set of command ids changes — passing
 * a new array literal every render does not thrash the registry.
 */
export function useRegisterCommands(cmds: Command[]): void {
  const { register } = useCommands();
  const cmdsRef = useRef(cmds);
  cmdsRef.current = cmds;

  const idsKey = cmds.map((c) => c.id).join('|');

  useEffect(() => {
    const unregister = register(cmdsRef.current);
    return unregister;
  }, [register, idsKey]);
}
