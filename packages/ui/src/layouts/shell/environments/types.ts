/**
 * Backend-declared environments — public types.
 *
 * An AegisApp opts in by setting `environments`. When the app becomes
 * active the shell calls `environments.load()` and surfaces the result
 * through the `<EnvironmentSwitcher>` in the top header. Apps read the
 * choice with `useCurrentEnvironment()` or listen for the
 * `app.environmentChanged` window event.
 */

export type EnvironmentBadge = 'default' | 'info' | 'warning' | 'danger';

export interface EnvironmentDescriptor {
  id: string;
  label: string;
  baseUrl: string;
  badge?: EnvironmentBadge;
}

export interface EnvironmentManifest {
  /** Id of the environment chosen until the user picks another. */
  default: string;
  environments: EnvironmentDescriptor[];
}

export interface AegisAppEnvironmentsConfig {
  /**
   * Loads the app's manifest. Called once a session when the app first
   * becomes active, and again on retry. Resolve `null` when the backend
   * declares no environments; reject when loading fails, and the header
   * reports the failure.
   */
  load: (signal: AbortSignal) => Promise<EnvironmentManifest | null>;
  /**
   * The environment reported while the backend declares none. Omitted,
   * `useCurrentEnvironment()` returns null then.
   */
  fallback?: EnvironmentDescriptor;
  /** localStorage key of the user's choice. Default `aegis.env.${app.id}`. */
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
    }
  | {
      status: 'error';
      error: Error;
      retry: () => void;
    };

export interface EnvironmentChangedEventDetail {
  appId: string;
  fromEnvId: string;
  toEnvId: string;
  env: EnvironmentDescriptor;
}

/** Window-level event name for env switch broadcasts. */
export const ENVIRONMENT_CHANGED_EVENT = 'app.environmentChanged';
