import type { ReactElement, ReactNode } from 'react';

import { AgentContext, type AgentContextValue } from './agentContext';

interface AgentProviderProps {
  value: AgentContextValue;
  children: ReactNode;
}

/**
 * Thin context wrapper. The library deliberately holds no agent state —
 * the host owns the LLM round-trip, tool-call dispatch, and message
 * history, and feeds the resulting value in.
 */
export function AgentProvider({
  value,
  children,
}: AgentProviderProps): ReactElement {
  return (
    <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
  );
}
