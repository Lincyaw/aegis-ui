import { useContext } from 'react';

import { CommandContext, type CommandContextValue } from './commandContext';

const noProviderValue: CommandContextValue = {
  commands: [],
  allCommands: [],
  register: () => () => undefined,
  setActiveScope: () => undefined,
  execute: () =>
    Promise.reject(new Error('No <CommandProvider> mounted above caller.')),
  setPaletteOpen: () => undefined,
  paletteOpen: false,
};

/**
 * Read the command registry context. Returns a no-op value when no
 * <CommandProvider> is mounted above the caller.
 */
export function useCommands(): CommandContextValue {
  return useContext(CommandContext) ?? noProviderValue;
}

/** Whether a <CommandProvider> is mounted above the caller. */
export function useHasCommandProvider(): boolean {
  return useContext(CommandContext) !== null;
}
