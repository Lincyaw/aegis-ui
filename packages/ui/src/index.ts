/**
 * @lincyaw/aegis-ui — public API.
 *
 * Add a new primitive ⇒ export it here AND add a specimen to
 * `apps/console/src/apps/gallery/`. The gallery is the live spec.
 */
import './index.css';

// Primitives
export * from './components/ui';

// Hooks
export {
  useCopyToClipboard,
  useResizable,
  useReplayPlayback,
  useSavedQueries,
  useScrollProgress,
} from './hooks';
export type {
  SavedQuery,
  ScrollProgressRange,
  UseCopyToClipboardResult,
  UseResizableOptions,
  UseResizableReturn,
  UseSavedQueriesOptions,
  UseReplayPlaybackOptions,
  UseReplayPlaybackResult,
  UseSavedQueriesReturn,
  UseScrollProgressOptions,
  UseScrollProgressResult,
} from './hooks';

export { formatBytes } from './lib/format';

// Headless time-range parsing (consumers can use it without the picker).
export {
  RELATIVE_TIME_PRESETS,
  parseRelativeTime,
  parseTimeRangeInput,
} from './lib/timeRange';
export type { RelativeTimePreset, TimeRange } from './lib/timeRange';

// LuceneQL cursor helpers used by QueryAutocomplete; hosts compile the
// query into their own backend's language.
export { replaceTokenAtCursor, tokenizeAtCursor } from './lib/luceneQuery';
export type { CursorToken } from './lib/luceneQuery';
// Chart scale and colour helpers the chart primitives share.
export {
  chartColorValue,
  niceTicks,
  staggeredProgress,
  zeroAnchoredDomain,
} from './lib/chart';
export type { ChartColor, ChartPaletteColor } from './lib/chart';

// Layouts
export { PageWrapper } from './layouts/PageWrapper';
export type { PageWrapperProps } from './layouts/PageWrapper';
// Public site frame: nav, bands and footer (AegisShell is the console's).
export { SiteFooter, SiteLayout, SiteNav, SiteSection } from './layouts/site';
export type {
  SiteFooterColumn,
  SiteFooterLink,
  SiteFooterProps,
  SiteLayoutProps,
  SiteNavItem,
  SiteNavProps,
  SiteSectionProps,
} from './layouts/site';

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

// Strings primitives render on their own; English unless a LocaleProvider says otherwise.
export { LocaleProvider, enStrings, useStrings, zhCNStrings } from './locale';
export type { AegisStrings } from './locale';

// Theme system (light + dark + system, persisted to localStorage).
export { ThemeProvider } from './theme/ThemeProvider';
export { themeInitScript } from './theme/themeInitScript';
export type { ThemeProviderProps } from './theme/ThemeProvider';
export { useTheme } from './theme/useTheme';
export type {
  ThemeMode,
  ThemePreference,
  ThemeState,
} from './theme/themeContext';

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

// Agent chat contract (presentational — host wires the LLM round-trip;
// the AgentM transport is in `@lincyaw/aegis-ui/transports`).
export { AgentChatProvider, useAgentChat } from './agent';
export type {
  AgentChatValue,
  AgentCommandInvocation,
  AgentMessage,
  AgentMessageRole,
  AgentToolCallRecord,
} from './agent';

// Agent-native UI substrate — runtime + hooks + provider.
export {
  AegisRuntimeProvider,
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
