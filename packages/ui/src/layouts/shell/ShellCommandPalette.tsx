import { type ReactElement, useCallback } from 'react';

import { type Command, useCommands } from '../../commands';
import { CommandPalette } from '../../components/ui/CommandPalette';

interface ShellCommandPaletteProps {
  groupOrder?: string[];
}

/** The CommandPalette filled from `<CommandProvider>` and opened by its mod+k. */
export function ShellCommandPalette({
  groupOrder,
}: ShellCommandPaletteProps): ReactElement {
  const { commands, paletteOpen, setPaletteOpen, execute } = useCommands();
  const close = useCallback(() => {
    setPaletteOpen(false);
  }, [setPaletteOpen]);
  const run = useCallback(
    (cmd: Command) => {
      execute(cmd.id).catch((error: unknown) => {
        console.error(`Command "${cmd.id}" failed.`, error);
      });
    },
    [execute],
  );
  return (
    <CommandPalette
      open={paletteOpen}
      commands={commands}
      onSelect={run}
      onClose={close}
      groupOrder={groupOrder}
    />
  );
}
