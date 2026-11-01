import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react';

import { AgentChatContext, type AgentChatValue } from './chat';

interface AgentChatProviderProps {
  value: AgentChatValue;
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
export function AgentChatProvider({
  value,
  children,
}: AgentChatProviderProps): ReactElement {
  const [ownPanelOpen, setOwnPanelOpen] = useState(false);
  const { panelOpen, setPanelOpen } = value;

  const setUncontrolledPanelOpen = useCallback(
    (open: boolean) => {
      setOwnPanelOpen(open);
      setPanelOpen?.(open);
    },
    [setPanelOpen],
  );

  const resolved = useMemo<AgentChatValue>(
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
    <AgentChatContext.Provider value={resolved}>
      {children}
    </AgentChatContext.Provider>
  );
}
