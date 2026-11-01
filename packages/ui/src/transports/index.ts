// Ways an agent outside the page reaches the console: the AgentM chat
// channel and the MCP bridge. Published as `@lincyaw/aegis-ui/transports`
// so the main entry, which sites without an agent also load, opens no
// connections.
export { AgentmChannelProvider } from './agentm/AgentmChannelProvider';
export {
  AgentmChannelClient,
  WIRE_VERSION as AGENTM_WIRE_VERSION,
} from './agentm/agentmChannelClient';
export type {
  AgentmChannelClientOptions,
  ConnectionStatus as AgentmConnectionStatus,
  Envelope as AgentmEnvelope,
  EnvelopeKind as AgentmEnvelopeKind,
} from './agentm/agentmChannelClient';
export { connectAegisBridge } from './bridge';
export type { AegisBridgeConfig } from './bridge';
