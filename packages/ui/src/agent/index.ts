export { AgentChatProvider } from './chat/AgentChatProvider';
export { useAgentChat } from './chat/useAgentChat';
export type {
  AgentChatValue,
  AgentMessage,
  AgentMessageRole,
  AgentCommandInvocation,
  AgentToolCallRecord,
} from './chat/chat';

// Agent-native UI substrate (docs/agent-native-ui.md).
export { AegisRuntimeProvider } from './core/AegisRuntimeProvider';
export {
  useAegisAction,
  useAegisSearchProvider,
  useAegisSurface,
} from './core/hooks';
export type {
  UseAegisActionResult,
  UseAegisSurfaceOptions,
  UseAegisSurfaceResult,
} from './core/hooks';
export { AskOverlay } from './ask/AskOverlay';
export { AskPanel } from './ask/AskPanel';
export type { AskPanelProps } from './ask/AskPanel';
export { buildAskContext } from './ask/buildAskContext';
export type { AskTrigger } from './ask/buildAskContext';
export { createAegisRuntime } from './core/runtime';
export type {
  AegisRuntime,
  ListActionsFilter,
  RuntimeDeps,
  SearchOptions,
} from './core/runtime';
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
} from './core/types';
