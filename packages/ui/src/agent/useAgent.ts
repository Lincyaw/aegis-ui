import { useContext } from 'react';

import { AgentContext, type AgentContextValue } from './agentContext';

/**
 * Read the current agent context. Returns the default empty state when
 * no `<AgentProvider>` is mounted, so render code does not have to
 * special-case "agent not wired yet".
 */
export function useAgent(): AgentContextValue {
  return useContext(AgentContext);
}
