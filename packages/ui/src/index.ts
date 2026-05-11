/**
 * @OperationsPAI/aegis-ui — public API.
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
  useActiveApp,
  useAppHref,
  useAppNavigate,
} from './layouts/shell';
export type {
  ActiveAppContextValue,
  AegisApp,
  AegisAppNavGroup,
  AegisAppNavItem,
  AegisBrand,
  AegisShellProps,
  AegisUser,
  AegisUserMenuItem,
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
export { AgentProvider, useAgent } from './agent';
export type {
  AgentContextValue,
  AgentMessage,
  AgentMessageRole,
  AgentCommandInvocation,
} from './agent';
