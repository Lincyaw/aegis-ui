---
'@lincyaw/aegis-ui': minor
---

Breaking: the agent code is split into layers, and the connections an outside agent uses move to a separate entry, so the main entry opens none.

- The AgentM chat channel and the MCP bridge client move to `@lincyaw/aegis-ui/transports`: import `AgentmChannelProvider`, `AgentmChannelClient`, `AGENTM_WIRE_VERSION`, their types and the new `connectAegisBridge` / `AegisBridgeConfig` from there.
- Renames: `AgentProvider` → `AgentChatProvider`, `useAgent` → `useAgentChat`, `AgentContextValue` → `AgentChatValue`, `AegisAgentProvider` → `AegisRuntimeProvider`.
- `AegisRuntimeProvider` no longer connects to the MCP bridge or reads `window.__AEGIS_BRIDGE__`, and drops `bridgeUrl`, `bridgeAuthToken` and `bridgeAutoConnect`. To keep the bridge, create the runtime yourself and pass it to the shell:

  ```ts
  const agentRuntime = createAegisRuntime();
  connectAegisBridge(agentRuntime, { url, authToken });
  <AegisShell agentRuntime={agentRuntime} … />
  ```

- `AegisRuntime` gains a public `setSelection(refs)` (it was `_setSelection`); the other `_`-prefixed methods are internal and no longer in the published types.
