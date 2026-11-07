import { type ReactNode, useCallback } from 'react';

import { useAgentChat } from '../../agent';
import { useWarnOnce } from './useWarnOnce';

interface AgentPanelState {
  open: boolean;
  /** Set while the panel can be shown and the agent context can toggle it. */
  toggle: (() => void) | undefined;
}

/**
 * The shell's agent panel, driven by the agent context's `panelOpen`.
 * `<AgentChatProvider>` always reports `panelOpen`, so without one the
 * panel stays closed and a warning is logged.
 */
export function useAgentPanel(agentPanel: ReactNode): AgentPanelState {
  const { panelOpen, setPanelOpen } = useAgentChat();
  const hasPanel = agentPanel !== undefined && agentPanel !== null;
  const hasPanelState = panelOpen !== undefined;
  useWarnOnce(
    hasPanel && !hasPanelState,
    'AegisShell: agentPanel needs an <AgentChatProvider> above the shell; the agent panel is not rendered.',
  );
  const open = hasPanel && panelOpen === true;
  const toggle = useCallback(() => {
    setPanelOpen?.(!open);
  }, [setPanelOpen, open]);
  return {
    open,
    toggle: hasPanel && hasPanelState && setPanelOpen ? toggle : undefined,
  };
}
