/**
 * Backend-declared environment discovery — public types.
 *
 * Each AegisApp may opt-in to environment discovery by setting `apiBaseUrl`
 * + (optionally) `environments`. The shell fetches a manifest from
 * `<apiBaseUrl><discoveryPath>` (default `/.well-known/aegis-environments.json`)
 * and surfaces the env list through the `<EnvironmentSwitcher>` mounted in
 * the top header. Apps subscribe to the `app.environmentChanged` runtime
 * event (or read `useCurrentEnvironment()`) to react to switches.
 */

export type EnvironmentBadge = 'default' | 'info' | 'warning' | 'danger';

export interface EnvironmentDescriptor {
  id: string;
  label: string;
  baseUrl: string;
  badge?: EnvironmentBadge;
}

export interface EnvironmentManifest {
  default: string;
  environments: EnvironmentDescriptor[];
}

export interface AegisAppEnvironmentsConfig {
  /** Path appended to `apiBaseUrl`. Default `/.well-known/aegis-environments.json`. */
  discoveryPath?: string;
  /**
   * What to do when the manifest is missing / 404 / schema invalid.
   * - `production` (default) — show a single synthetic prod env, hide the switcher.
   * - `hidden` — render nothing.
   */
  fallback?: 'production' | 'hidden';
  /** localStorage key. Default `aegis.env.${app.id}`. */
  storageKey?: string;
}

export type EnvironmentManifestStatus =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'ready';
      manifest: EnvironmentManifest;
      currentEnvId: string;
      currentEnv: EnvironmentDescriptor;
      setCurrentEnv: (id: string) => void;
    }
  | {
      status: 'unsupported';
      currentEnv: EnvironmentDescriptor;
    };

export interface EnvironmentChangedEventDetail {
  appId: string;
  fromEnvId: string | null;
  toEnvId: string;
  env: EnvironmentDescriptor;
}

/** Window-level event name for env switch broadcasts. */
export const ENVIRONMENT_CHANGED_EVENT = 'app.environmentChanged';
