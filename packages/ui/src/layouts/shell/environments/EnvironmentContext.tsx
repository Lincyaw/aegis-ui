import {
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { AegisApp } from '../types';
import {
  AppEnvironmentContext,
  type AppEnvironmentContextValue,
} from './context';
import { fetchManifest } from './manifest';
import {
  ENVIRONMENT_CHANGED_EVENT,
  type EnvironmentChangedEventDetail,
  type EnvironmentDescriptor,
  type EnvironmentManifest,
  type EnvironmentManifestStatus,
} from './types';

const DEFAULT_DISCOVERY_PATH = '/.well-known/aegis-environments.json';

function storageKeyFor(app: AegisApp): string {
  return app.environments?.storageKey ?? `aegis.env.${app.id}`;
}

function readStored(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage may be disabled — selection becomes session-local only.
  }
}

function syntheticProd(app: AegisApp): EnvironmentDescriptor {
  return {
    id: 'prod',
    label: 'Production',
    baseUrl: app.apiBaseUrl ?? '',
    badge: 'default',
  };
}

interface ProviderProps {
  app: AegisApp | undefined;
  children: ReactNode;
}

/**
 * Mounts environment-discovery state for the active app. Internal — the
 * shell wires it; consumers read state via `useCurrentEnvironment()`.
 */
export function ActiveAppEnvironmentProvider({
  app,
  children,
}: ProviderProps): ReactElement {
  const [manifest, setManifest] = useState<EnvironmentManifest | null>(null);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(true);
  const [currentEnvId, setCurrentEnvIdState] = useState<string | null>(null);
  const previousIdRef = useRef<string | null>(null);

  const apiBaseUrl = app?.apiBaseUrl;
  const discoveryPath =
    app?.environments?.discoveryPath ?? DEFAULT_DISCOVERY_PATH;
  const storageKey = app ? storageKeyFor(app) : null;
  const fallbackMode = app?.environments?.fallback ?? 'production';

  useEffect(() => {
    if (!app || !apiBaseUrl) {
      setManifest(null);
      setSupported(true);
      setCurrentEnvIdState(null);
      previousIdRef.current = null;
      return;
    }

    let cancelled = false;
    setLoading(true);
    setSupported(true);

    void fetchManifest({
      apiBaseUrl,
      discoveryPath,
    }).then((result) => {
      if (cancelled) {
        return;
      }
      setLoading(false);
      if (!result) {
        setManifest(null);
        setSupported(false);
        setCurrentEnvIdState(null);
        previousIdRef.current = null;
        return;
      }
      setManifest(result);
      setSupported(true);
      const stored = storageKey ? readStored(storageKey) : null;
      const initial =
        stored && result.environments.some((e) => e.id === stored)
          ? stored
          : result.default;
      setCurrentEnvIdState(initial);
      previousIdRef.current = initial;
    });

    return () => {
      cancelled = true;
    };
  }, [app, apiBaseUrl, discoveryPath, storageKey]);

  const setCurrentEnv = useMemo(() => {
    return (id: string): void => {
      if (!manifest || !app) {
        return;
      }
      const next = manifest.environments.find((e) => e.id === id);
      if (!next) {
        return;
      }
      const from = previousIdRef.current;
      if (from === id) {
        return;
      }
      previousIdRef.current = id;
      setCurrentEnvIdState(id);
      if (storageKey) {
        writeStored(storageKey, id);
      }
      if (typeof window !== 'undefined') {
        const detail: EnvironmentChangedEventDetail = {
          appId: app.id,
          fromEnvId: from,
          toEnvId: id,
          env: next,
        };
        window.dispatchEvent(
          new CustomEvent(ENVIRONMENT_CHANGED_EVENT, { detail }),
        );
      }
    };
  }, [manifest, app, storageKey]);

  const state = useMemo<EnvironmentManifestStatus>(() => {
    if (!app) {
      return { status: 'idle' };
    }
    if (loading) {
      return { status: 'loading' };
    }
    if (!supported || !manifest || !currentEnvId) {
      if (fallbackMode === 'hidden') {
        return { status: 'idle' };
      }
      return { status: 'unsupported', currentEnv: syntheticProd(app) };
    }
    const currentEnv =
      manifest.environments.find((e) => e.id === currentEnvId) ??
      manifest.environments[0];
    return {
      status: 'ready',
      manifest,
      currentEnvId,
      currentEnv,
      setCurrentEnv,
    };
  }, [
    app,
    loading,
    supported,
    manifest,
    currentEnvId,
    setCurrentEnv,
    fallbackMode,
  ]);

  const value = useMemo<AppEnvironmentContextValue | null>(() => {
    if (!app) {
      return null;
    }
    return { appId: app.id, state };
  }, [app, state]);

  return (
    <AppEnvironmentContext.Provider value={value}>
      {children}
    </AppEnvironmentContext.Provider>
  );
}
