import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react';

import { AgentContext, type AgentContextValue } from './agentContext';

interface AgentProviderProps {
  value: AgentContextValue;
  children: ReactNode;
}

/**
 * Thin context wrapper. The library deliberately holds no agent state —
 * the host owns the LLM round-trip, tool-call dispatch, and message
 * history, and feeds the resulting value in.
 *
 * The one piece of UI state it can hold is `panelOpen`: when the host
 * leaves it undefined, the provider keeps it (starting closed) and still
 * forwards changes to the host's `setPanelOpen`, if any.
 */
export function AgentProvider({
  value,
  children,
}: AgentProviderProps): ReactElement {
  const [ownPanelOpen, setOwnPanelOpen] = useState(false);
  const { panelOpen, setPanelOpen } = value;

  const setUncontrolledPanelOpen = useCallback(
    (open: boolean) => {
      setOwnPanelOpen(open);
      setPanelOpen?.(open);
    },
    [setPanelOpen],
  );

  const resolved = useMemo<AgentContextValue>(
    () =>
      panelOpen === undefined
        ? {
            ...value,
            panelOpen: ownPanelOpen,
            setPanelOpen: setUncontrolledPanelOpen,
          }
        : value,
    [value, panelOpen, ownPanelOpen, setUncontrolledPanelOpen],
  );

  return (
    <AgentContext.Provider value={resolved}>{children}</AgentContext.Provider>
  );
}
