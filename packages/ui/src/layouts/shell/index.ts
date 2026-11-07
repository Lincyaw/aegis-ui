export { AegisShell } from './AegisShell';
export { NotificationInboxPage } from './NotificationInboxPage';
export { isAppVisible } from './apps';
export { useActiveApp } from './activeAppContext';
export type { ActiveAppContextValue } from './activeAppContext';
export { useAppHref, useAppNavigate } from './useAppNavigate';
export type {
  AegisApp,
  AegisAppNavGroup,
  AegisAppNavItem,
  AegisBrand,
  AegisShellProps,
  AegisUser,
  AegisUserMenuItem,
} from './types';
export {
  ENVIRONMENT_CHANGED_EVENT,
  useCurrentEnvironment,
  useEnvironmentManifest,
} from './environments';
export type {
  AegisAppEnvironmentsConfig,
  EnvironmentBadge,
  EnvironmentChangedEventDetail,
  EnvironmentDescriptor,
  EnvironmentManifest,
  EnvironmentManifestStatus,
} from './environments';
