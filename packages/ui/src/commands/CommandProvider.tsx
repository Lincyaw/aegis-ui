import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  type Command,
  CommandContext,
  type CommandContextValue,
} from './commandContext';
import { matchShortcut } from './shortcut';

interface CommandProviderProps {
  children: ReactNode;
}

/**
 * Owns the command registry, the palette open-state, and the global
 * `mod+k` opener. Apps inside register commands via
 * `useRegisterCommands`; AegisShell flips the active scope as the user
 * navigates between sub-apps.
 */
export function CommandProvider({
  children,
}: CommandProviderProps): ReactElement {
  const [registry, setRegistry] = useState<Map<string, Command>>(
    () => new Map(),
  );
  const [activeScope, setActiveScope] = useState<string | undefined>(undefined);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const registryRef = useRef(registry);
  registryRef.current = registry;

  const register = useCallback((cmds: Command[]) => {
    setRegistry((prev) => {
      const next = new Map(prev);
      for (const cmd of cmds) {
        next.set(cmd.id, cmd);
      }
      return next;
    });
    return () => {
      setRegistry((prev) => {
        const next = new Map(prev);
        for (const cmd of cmds) {
          next.delete(cmd.id);
        }
        return next;
      });
    };
  }, []);

  const execute = useCallback(
    async (id: string, args?: unknown): Promise<void> => {
      const cmd = registryRef.current.get(id);
      if (!cmd) {
        throw new Error(`Command not found: ${id}`);
      }
      await cmd.handler(args);
    },
    [],
  );

  const allCommands = useMemo<Command[]>(
    () => Array.from(registry.values()),
    [registry],
  );

  const commands = useMemo<Command[]>(
    () =>
      allCommands.filter((c) => {
        if (c.agentOnly) {
          return false;
        }
        if (c.scope && c.scope !== activeScope) {
          return false;
        }
        return true;
      }),
    [allCommands, activeScope],
  );

  // mod+k toggles the palette globally. We add it once at the provider
  // level so consumers don't have to register their own opener.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (matchShortcut(event, 'mod+k')) {
        event.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (event.key === 'Escape' && paletteOpen) {
        setPaletteOpen(false);
        return;
      }
      // App-defined shortcuts. Only fire when palette is closed —
      // arrows / Enter while the palette is open belong to it.
      if (paletteOpen) {
        return;
      }
      for (const cmd of registryRef.current.values()) {
        if (!cmd.shortcut) {
          continue;
        }
        if (cmd.agentOnly) {
          continue;
        }
        if (cmd.scope && cmd.scope !== activeScope) {
          continue;
        }
        if (matchShortcut(event, cmd.shortcut)) {
          event.preventDefault();
          void cmd.handler();
          return;
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeScope, paletteOpen]);

  const value = useMemo<CommandContextValue>(
    () => ({
      commands,
      allCommands,
      register,
      setActiveScope,
      execute,
      setPaletteOpen,
      paletteOpen,
    }),
    [commands, allCommands, register, execute, paletteOpen],
  );

  return (
    <CommandContext.Provider value={value}>{children}</CommandContext.Provider>
  );
}
