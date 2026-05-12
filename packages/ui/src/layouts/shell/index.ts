export { AegisShell } from './AegisShell';
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
  clearManifestCache,
  fetchManifest,
  manifestUrl,
  useCurrentEnvironment,
  useEnvironmentManifest,
  validateManifest,
} from './environments';
export type {
  AegisAppEnvironmentsConfig,
  EnvironmentBadge,
  EnvironmentChangedEventDetail,
  EnvironmentDescriptor,
  EnvironmentManifest,
  EnvironmentManifestStatus,
} from './environments';
