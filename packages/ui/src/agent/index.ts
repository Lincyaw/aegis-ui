export { AgentProvider } from './AgentProvider';
export { useAgent } from './useAgent';
export { AgentmChannelProvider } from './AgentmChannelProvider';
export {
  AgentmChannelClient,
  WIRE_VERSION as AGENTM_WIRE_VERSION,
} from './agentmChannelClient';
export type {
  AgentmChannelClientOptions,
  ConnectionStatus as AgentmConnectionStatus,
  Envelope as AgentmEnvelope,
  EnvelopeKind as AgentmEnvelopeKind,
} from './agentmChannelClient';
export type {
  AgentContextValue,
  AgentMessage,
  AgentMessageRole,
  AgentCommandInvocation,
} from './agentContext';

// Agent-native UI substrate (docs/agent-native-ui.md).
export { AegisAgentProvider } from './AegisAgentProvider';
export {
  useAegisAction,
  useAegisSearchProvider,
  useAegisSurface,
} from './hooks';
export type {
  UseAegisActionResult,
  UseAegisSurfaceOptions,
  UseAegisSurfaceResult,
} from './hooks';
export { AskOverlay } from './AskOverlay';
export { AskPanel } from './AskPanel';
export type { AskPanelProps } from './AskPanel';
export { buildAskContext } from './buildAskContext';
export type { AskTrigger } from './buildAskContext';
export { createAegisRuntime } from './runtime';
export type {
  AegisRuntime,
  ListActionsFilter,
  RegisteredAction,
  RegisteredSurface,
  RuntimeDeps,
  SearchOptions,
} from './runtime';
export type {
  ActionContext,
  ActionPreview,
  ActionSource,
  AegisAction,
  AegisActionDescriptor,
  AegisError,
  AegisErrorCode,
  AegisEvent,
  AegisInspectResult,
  AegisRef,
  AegisSearchResult,
  AegisSnapshot,
  AskContext,
  AskMessage,
  AskOrigin,
  AskRequest,
  DispatchResult,
  EntityProjection,
  EntityRef,
  FieldProjection,
  InvocationSource,
  McpToolDefinition,
  SearchProvider,
  ShellSnapshot,
  SnapshotDiff,
  SurfaceKind,
  SurfaceSnapshot,
} from './types';
