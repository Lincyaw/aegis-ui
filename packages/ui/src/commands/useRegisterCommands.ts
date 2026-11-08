import { useEffect, useRef } from 'react';

import { useIsomorphicLayoutEffect } from '../hooks/useIsomorphicLayoutEffect';
import type { Command } from './commandContext';
import { useCommands } from './useCommands';

/** Every field the palette, the shortcuts and agents read, except the icon and the functions' identity. */
function describe(cmd: Command): string {
  return JSON.stringify([
    cmd.id,
    cmd.label,
    cmd.description,
    cmd.keywords,
    cmd.group,
    cmd.shortcut,
    cmd.scope,
    cmd.agentOnly,
    cmd.schema,
    cmd.undo !== undefined,
  ]);
}

/**
 * Register a batch of commands while the calling component is mounted.
 * A new array literal every render does not thrash the registry: the
 * commands re-register only when a described field changes, and `handler`
 * and `undo` always run the latest render's functions.
 */
export function useRegisterCommands(cmds: Command[]): void {
  const { register } = useCommands();
  const cmdsRef = useRef(cmds);
  useIsomorphicLayoutEffect(() => {
    cmdsRef.current = cmds;
  });

  const key = cmds.map(describe).join('\n');

  useEffect(() => {
    const latest = (id: string): Command | undefined =>
      cmdsRef.current.find((c) => c.id === id);
    const registered = cmdsRef.current.map(
      (cmd): Command => ({
        ...cmd,
        handler: (args) => (latest(cmd.id) ?? cmd).handler(args),
        undo: cmd.undo && (() => (latest(cmd.id) ?? cmd).undo?.()),
      }),
    );
    return register(registered);
  }, [register, key]);
}
