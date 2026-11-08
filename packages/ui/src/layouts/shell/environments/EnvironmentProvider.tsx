import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { readStorage, writeStorage } from '../../../lib/storage';
import type { AegisApp } from '../types';
import {
  EnvironmentContext,
  type EnvironmentContextValue,
} from './environmentContext';
import {
  ENVIRONMENT_CHANGED_EVENT,
  type EnvironmentChangedEventDetail,
  type EnvironmentManifest,
  type EnvironmentManifestStatus,
} from './types';

type LoadResult =
  | {
      status: 'loaded';
      manifest: EnvironmentManifest | null;
      /** The stored choice when it is still listed, else the default. */
      initialEnvId: string | null;
    }
  | { status: 'error'; error: Error };

function storageKeyFor(app: AegisApp): string {
  return app.environments?.storageKey ?? `aegis.env.${app.id}`;
}

interface EnvironmentProviderProps {
  app: AegisApp | undefined;
  children: ReactNode;
}

/**
 * Loads and holds the environments of the active app. The shell mounts
 * it; consumers read it with `useCurrentEnvironment()`. Each app's
 * manifest loads once a session, the first time the app is active.
 */
export function EnvironmentProvider({
  app,
  children,
}: EnvironmentProviderProps): ReactElement {
  const [results, setResults] = useState<ReadonlyMap<string, LoadResult>>(
    () => new Map(),
  );
  const [chosen, setChosen] = useState<ReadonlyMap<string, string>>(
    () => new Map(),
  );

  const appId = app?.id;
  const config = app?.environments;
  const storageKey = app ? storageKeyFor(app) : null;
  const result = appId === undefined ? undefined : results.get(appId);
  const needsLoad = config !== undefined && result === undefined;

  useEffect(() => {
    if (!needsLoad || appId === undefined || storageKey === null) {
      return undefined;
    }
    const controller = new AbortController();
    const settle = (next: LoadResult): void => {
      if (!controller.signal.aborted) {
        setResults((prev) => new Map(prev).set(appId, next));
      }
    };
    config.load(controller.signal).then(
      (manifest) => {
        const stored = readStorage(storageKey);
        settle({
          status: 'loaded',
          manifest,
          initialEnvId:
            manifest === null
              ? null
              : manifest.environments.some((e) => e.id === stored)
                ? stored
                : manifest.default,
        });
      },
      (reason: unknown) => {
        const error =
          reason instanceof Error ? reason : new Error(String(reason));
        if (!controller.signal.aborted) {
          console.error(
            `AegisShell: loading the environments of app "${appId}" failed.`,
            error,
          );
        }
        settle({ status: 'error', error });
      },
    );
    return () => {
      controller.abort();
    };
  }, [needsLoad, config, appId, storageKey]);

  const retry = useCallback(() => {
    if (appId === undefined) {
      return;
    }
    setResults((prev) => {
      const next = new Map(prev);
      next.delete(appId);
      return next;
    });
  }, [appId]);

  const state = useMemo<EnvironmentManifestStatus>(() => {
    if (appId === undefined || storageKey === null || !config) {
      return { status: 'idle' };
    }
    if (!result) {
      return { status: 'loading' };
    }
    if (result.status === 'error') {
      return { status: 'error', error: result.error, retry };
    }
    const { manifest } = result;
    if (!manifest) {
      return config.fallback
        ? { status: 'unsupported', currentEnv: config.fallback }
        : { status: 'idle' };
    }
    const wanted = chosen.get(appId) ?? result.initialEnvId;
    const currentEnv =
      manifest.environments.find((e) => e.id === wanted) ??
      manifest.environments[0];
    const setCurrentEnv = (id: string): void => {
      const env = manifest.environments.find((e) => e.id === id);
      if (!env || id === currentEnv.id) {
        return;
      }
      setChosen((prev) => new Map(prev).set(appId, id));
      writeStorage(storageKey, id);
      const detail: EnvironmentChangedEventDetail = {
        appId,
        fromEnvId: currentEnv.id,
        toEnvId: id,
        env,
      };
      window.dispatchEvent(
        new CustomEvent(ENVIRONMENT_CHANGED_EVENT, { detail }),
      );
    };
    return {
      status: 'ready',
      manifest,
      currentEnvId: currentEnv.id,
      currentEnv,
      setCurrentEnv,
    };
  }, [appId, storageKey, config, result, chosen, retry]);

  const value = useMemo<EnvironmentContextValue | null>(
    () => (appId === undefined ? null : { appId, state }),
    [appId, state],
  );

  return (
    <EnvironmentContext.Provider value={value}>
      {children}
    </EnvironmentContext.Provider>
  );
}
