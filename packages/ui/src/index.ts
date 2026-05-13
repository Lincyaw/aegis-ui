/**
 * @lincyaw/aegis-ui — public API.
 *
 * Add a new primitive ⇒ export it here AND add a specimen to
 * `src/playground/Gallery.tsx`. The gallery is the live spec.
 */
import './index.css';

// Primitives
export * from './components/ui';

// Layouts
export { PageWrapper } from './layouts/PageWrapper';
export type { PageWrapperProps } from './layouts/PageWrapper';

// Shell (router-aware)
export {
  AegisShell,
  ENVIRONMENT_CHANGED_EVENT,
  clearManifestCache,
  fetchManifest,
  manifestUrl,
  useActiveApp,
  useAppHref,
  useAppNavigate,
  useCurrentEnvironment,
  useEnvironmentManifest,
  validateManifest,
} from './layouts/shell';
export type {
  ActiveAppContextValue,
  AegisApp,
  AegisAppEnvironmentsConfig,
  AegisAppNavGroup,
  AegisAppNavItem,
  AegisBrand,
  AegisShellProps,
  AegisUser,
  AegisUserMenuItem,
  EnvironmentBadge,
  EnvironmentChangedEventDetail,
  EnvironmentDescriptor,
  EnvironmentManifest,
  EnvironmentManifestStatus,
} from './layouts/shell';

// AntD ConfigProvider theme mapped to aegis-ui tokens.
export { aegisTheme, getAegisTheme } from './theme/antdTheme';

// Theme system (light + dark + system, persisted to localStorage).
export { ThemeProvider } from './theme/ThemeProvider';
export type { ThemeProviderProps } from './theme/ThemeProvider';
export { useTheme } from './theme/useTheme';
export type { ThemeMode, ThemePreference } from './theme/themeContext';

// Auth context contract (presentational — host wires the implementation).
export { AuthProvider, RequireAuth, useAuth } from './auth';
export type { AegisAuthUser, AuthContextValue, AuthStatus } from './auth';

// Notification context contract (presentational — host wires the implementation).
export { NotificationProvider, useNotifications } from './notifications';
export type {
  AegisNotification,
  NotificationContextValue,
} from './notifications';

// Command registry (library-owned state — host registers commands).
export {
  CommandProvider,
  formatShortcut,
  useCommands,
  useRegisterCommands,
} from './commands';
export type { Command, CommandContextValue } from './commands';

// Agent context contract (presentational — host wires the LLM round-trip).
export {
  AgentmChannelClient,
  AgentmChannelProvider,
  AgentProvider,
  AGENTM_WIRE_VERSION,
  useAgent,
} from './agent';
export type {
  AgentContextValue,
  AgentCommandInvocation,
  AgentmChannelClientOptions,
  AgentmConnectionStatus,
  AgentmEnvelope,
  AgentmEnvelopeKind,
  AgentMessage,
  AgentMessageRole,
} from './agent';

// Agent-native UI substrate — runtime + hooks + provider.
export {
  AegisAgentProvider,
  AskOverlay,
  AskPanel,
  buildAskContext,
  createAegisRuntime,
  useAegisAction,
  useAegisSearchProvider,
  useAegisSurface,
} from './agent';
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
  AegisRuntime,
  AegisSearchResult,
  AegisSnapshot,
  AskContext,
  AskMessage,
  AskOrigin,
  AskPanelProps,
  AskRequest,
  AskTrigger,
  DispatchResult,
  EntityProjection,
  EntityRef,
  FieldProjection,
  InvocationSource,
  ListActionsFilter,
  McpToolDefinition,
  RegisteredAction,
  RuntimeDeps,
  SearchOptions,
  SearchProvider,
  ShellSnapshot,
  SnapshotDiff,
  SurfaceKind,
  SurfaceSnapshot,
  UseAegisActionResult,
  UseAegisSurfaceOptions,
  UseAegisSurfaceResult,
} from './agent';
