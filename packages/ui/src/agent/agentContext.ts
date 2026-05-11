import { createContext } from 'react';

export type AgentMessageRole = 'user' | 'assistant' | 'system';

export interface AgentCommandInvocation {
  /** The command id the agent called, e.g. 'projects.create'. */
  commandId: string;
  /** Arguments passed. Library does not validate. */
  args?: unknown;
  status: 'pending' | 'success' | 'error';
  /** Set when status is 'error'. */
  error?: string;
}

export interface AgentMessage {
  id: string;
  role: AgentMessageRole;
  content: string;
  /** Command calls the assistant attempted in this message. */
  invocations?: AgentCommandInvocation[];
  /** ISO timestamp. */
  timestamp: string;
}

/**
 * Contract every agent-chat integration implements. The library does
 * not own state — callers wire their own LLM / tool-calling adapter and
 * pass the resulting value through `<AgentProvider value={...}>`.
 */
export interface AgentContextValue {
  messages: AgentMessage[];
  /** True while the assistant is generating a response. */
  sending: boolean;
  /** Send a user message. Host handles the LLM round-trip and state updates. */
  send: (content: string) => Promise<void> | void;
  /** Optional: clear the current thread. */
  clear?: () => void;
  /** Optional: panel open/closed (panel controls). Persisted by host. */
  panelOpen?: boolean;
  /** Optional: toggle panel. */
  setPanelOpen?: (open: boolean) => void;
}

export const defaultAgentContextValue: AgentContextValue = {
  messages: [],
  sending: false,
  send: () => undefined,
};

export const AgentContext = createContext<AgentContextValue>(
  defaultAgentContextValue,
);
