import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { AegisRuntimeContext } from './aegisRuntimeContext';
import {
  type AegisRuntime,
  createAegisRuntime,
  defaultShellSnapshot,
} from './runtime';
import type { ShellSnapshot } from './types';

interface AgentRuntimeProviderProps {
  children: ReactNode;
  /**
   * A runtime the host created, for instance to connect it to the MCP
   * bridge with `connectAegisBridge` from `@lincyaw/aegis-ui/transports`.
   * Omitted, the provider creates its own.
   */
  runtime?: AegisRuntime;
  /** Current app id from the shell. Threaded into ActionSource for hooks. */
  appId?: string | null;
  /** Live shell snapshot getter — called on every snapshot() invocation. */
  shellSnapshot?: () => ShellSnapshot;
  /** Router navigate fn — wired into ActionContext.navigate + aegis.navigate. */
  navigate?: (to: string) => void;
  /** When true (default), mount the runtime on `window.__aegis`. */
  exposeOnWindow?: boolean;
}

declare global {
  interface Window {
    __aegis?: AegisRuntime;
  }
}

/**
 * Holds the agent runtime that primitives register their actions and
 * surfaces with. It does no I/O: transports that let an agent outside the
 * page reach the runtime live in `@lincyaw/aegis-ui/transports`.
 */
export function AegisRuntimeProvider({
  children,
  runtime: externalRuntime,
  appId = null,
  shellSnapshot,
  navigate,
  exposeOnWindow = true,
}: AgentRuntimeProviderProps) {
  const [runtime] = useState<AegisRuntime>(
    () => externalRuntime ?? createAegisRuntime(),
  );

  const shellSnapshotRef = useRef(shellSnapshot);
  shellSnapshotRef.current = shellSnapshot;

  useEffect(() => {
    runtime._setShellSnapshot(() => {
      const getter = shellSnapshotRef.current;
      return getter?.() ?? defaultShellSnapshot(appId);
    });
  }, [runtime, appId]);

  useEffect(() => {
    if (navigate) {
      runtime._setNavigate(navigate);
    }
  }, [runtime, navigate]);

  useEffect(() => {
    if (!exposeOnWindow || typeof window === 'undefined') {
      return;
    }
    window.__aegis = runtime;
    return () => {
      if (window.__aegis === runtime) {
        delete window.__aegis;
      }
    };
  }, [runtime, exposeOnWindow]);

  const value = useMemo(() => ({ runtime, appId }), [runtime, appId]);

  return (
    <AegisRuntimeContext.Provider value={value}>
      {children}
    </AegisRuntimeContext.Provider>
  );
}
