import { type ReactNode, createContext } from 'react';

import type { AegisAction } from '../agent/types';

/**
 * A single executable action surfaced through the command palette and,
 * eventually, agent tool-calls. Commands are presentational contracts —
 * the host owns the side-effect inside `handler`.
 */
export interface Command<TArgs = unknown> {
  /** Globally unique id. Convention: 'app.action' e.g. 'projects.create'. */
  id: string;
  /** Human label shown in the palette. */
  label: string;
  /** Longer description — also shown to agents as tool description. */
  description?: string;
  /** Search keywords (lowercase). */
  keywords?: string[];
  /** Icon node shown in the palette row. */
  icon?: ReactNode;
  /** UI grouping (e.g. 'Quick actions', 'Navigate'). Default: 'Other'. */
  group?: string;
  /** Keybinding using 'mod' for Cmd/Ctrl, e.g. 'mod+shift+p'. */
  shortcut?: string;
  /** When set, command is only available while this AegisApp is active. */
  scope?: string;
  /** Hide from palette UI; still callable via execute() (used by agents). */
  agentOnly?: boolean;
  /** JSON-schema-ish param description for agents. Library doesn't parse it. */
  schema?: Record<string, unknown>;
  /** The actual side-effect. */
  handler: (args?: TArgs) => void | Promise<void>;
  /** Optional undo callback — UI will surface an Undo affordance. */
  undo?: () => void | Promise<void>;
  /** Optional aegis-ui agent action — fired alongside handler from the palette. */
  action?: AegisAction<void, unknown>;
}

/**
 * Contract exposed by the CommandProvider. Unlike auth/notifications,
 * the library owns this state — the registry only makes sense as a
 * library-managed runtime.
 */
export interface CommandContextValue {
  /** All registered commands, scope-filtered for the current active app. */
  commands: Command[];
  /** All registered commands regardless of scope (for agents). */
  allCommands: Command[];
  /** Register a batch of commands. Returns an unregister function. */
  register: (cmds: Command[]) => () => void;
  /** Set the active scope (called by AegisShell — apps don't touch this). */
  setActiveScope: (scope: string | undefined) => void;
  /** Execute by id. Throws if no command with that id. */
  execute: (id: string, args?: unknown) => Promise<void>;
  /** Open or close the palette. */
  setPaletteOpen: (open: boolean) => void;
  paletteOpen: boolean;
}

export const defaultCommandContextValue: CommandContextValue = {
  commands: [],
  allCommands: [],
  register: () => () => undefined,
  setActiveScope: () => undefined,
  execute: () =>
    Promise.reject(new Error('No <CommandProvider> mounted above caller.')),
  setPaletteOpen: () => undefined,
  paletteOpen: false,
};

export const CommandContext = createContext<CommandContextValue>(
  defaultCommandContextValue,
);
