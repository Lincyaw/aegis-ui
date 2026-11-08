import { useContext } from 'react';

import {
  AgentChatContext,
  type AgentChatValue,
  defaultAgentChatValue,
} from './chat';

/**
 * Read the current agent context. Returns the default empty state when
 * no `<AgentChatProvider>` is mounted, so render code does not have to
 * special-case "agent not wired yet".
 */
export function useAgentChat(): AgentChatValue {
  return useContext(AgentChatContext) ?? defaultAgentChatValue;
}

/** True when an `<AgentChatProvider>` is mounted above the caller. */
export function useHasAgentChatProvider(): boolean {
  return useContext(AgentChatContext) !== null;
}
