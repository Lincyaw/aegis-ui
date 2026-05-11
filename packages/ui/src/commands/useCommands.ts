import { useContext } from 'react';

import { CommandContext, type CommandContextValue } from './commandContext';

/**
 * Read the command registry context. Returns the default no-op value
 * when no <CommandProvider> is mounted above the caller.
 */
export function useCommands(): CommandContextValue {
  return useContext(CommandContext);
}
