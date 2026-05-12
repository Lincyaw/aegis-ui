import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { AegisAgentContext } from './aegisAgentContext';
import { type AegisRuntime, createAegisRuntime } from './runtime';
import type { ShellSnapshot } from './types';

interface BridgeConfig {
  url: string;
  authToken?: string;
  autoConnect?: boolean;
}

interface AegisAgentProviderProps {
  children: ReactNode;
  /** Externally-provided runtime — pass when the host wants control. */
  runtime?: AegisRuntime;
  /** Current app id from the shell. Threaded into ActionSource for hooks. */
  appId?: string | null;
  /** Live shell snapshot getter — called on every snapshot() invocation. */
  shellSnapshot?: () => ShellSnapshot;
  /** Router navigate fn — wired into ActionContext.navigate + aegis.navigate. */
  navigate?: (to: string) => void;
  /** When true (default), mount the runtime on `window.__aegis`. */
  exposeOnWindow?: boolean;
  /** MCP bridge WebSocket URL (e.g. ws://127.0.0.1:3323/aegis-bridge/ws). */
  bridgeUrl?: string;
  /** Bearer token for bridge auth. Omit when bridge runs --bridge-no-auth. */
  bridgeAuthToken?: string;
  /** Default false. Set true to open the WS on mount and reconnect. */
  bridgeAutoConnect?: boolean;
}

declare global {
  interface Window {
    __aegis?: AegisRuntime;
    __AEGIS_BRIDGE__?: BridgeConfig;
  }
}

const RECONNECT_BACKOFF_MS = [1000, 2000, 5000, 10000];

interface ToolCallMessage {
  type: 'tool.call';
  id: string;
  tool: string;
  params?: Record<string, unknown> | null;
}

function isToolCallMessage(value: unknown): value is ToolCallMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    v.type === 'tool.call' &&
    typeof v.id === 'string' &&
    typeof v.tool === 'string'
  );
}

function readSessionId(): string {
  if (typeof window === 'undefined') {
    return `srv-${Math.random().toString(36).slice(2, 10)}`;
  }
  const KEY = 'aegis.bridge.sessionId';
  try {
    const existing = window.sessionStorage.getItem(KEY);
    if (existing) {
      return existing;
    }
    const fresh = `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return `sess-${Math.random().toString(36).slice(2, 10)}`;
  }
}

async function runToolCall(
  runtime: AegisRuntime,
  tool: string,
  params: Record<string, unknown> | null | undefined,
): Promise<unknown> {
  const p = params ?? {};
  switch (tool) {
    case 'aegis_snapshot':
      return runtime.snapshot();
    case 'aegis_inspect': {
      const ref = p.ref;
      if (typeof ref !== 'object' || ref === null) {
        throw new Error('aegis_inspect requires { ref }');
      }
      const r = runtime.inspect(ref as Parameters<AegisRuntime['inspect']>[0]);
      if (!r) {
        const err: { code: string; message: string } = {
          code: 'not_found',
          message: 'inspect: target not found',
        };
        throw err;
      }
      return r;
    }
    case 'aegis_search': {
      const query = typeof p.query === 'string' ? p.query : '';
      return runtime.search(query, {
        kinds: Array.isArray(p.kinds)
          ? (p.kinds as Parameters<AegisRuntime['search']>[1] extends infer O
              ? O extends { kinds?: infer K }
                ? K
                : never
              : never)
          : undefined,
        appId: typeof p.appId === 'string' ? p.appId : undefined,
        limit: typeof p.limit === 'number' ? p.limit : undefined,
      });
    }
    case 'aegis_invoke': {
      const id = typeof p.id === 'string' ? p.id : '';
      if (!id) {
        throw new Error('aegis_invoke requires { id }');
      }
      const result = await runtime.dispatch(id, p.params, {
        force: typeof p.force === 'boolean' ? p.force : undefined,
        by: 'agent',
      });
      return result;
    }
    case 'aegis_navigate': {
      const to = typeof p.to === 'string' ? p.to : '';
      return runtime.dispatch('aegis.navigate', { to }, { by: 'agent' });
    }
    case 'aegis_highlight': {
      const ref = p.ref;
      if (typeof ref !== 'object' || ref === null) {
        throw new Error('aegis_highlight requires { ref }');
      }
      return runtime.highlight(ref as Parameters<AegisRuntime['highlight']>[0]);
    }
    case 'aegis_wait_for': {
      const predicate = typeof p.predicate === 'string' ? p.predicate : '';
      if (!predicate) {
        throw new Error('aegis_wait_for requires { predicate }');
      }
      return runtime.waitFor(predicate, {
        timeoutMs: typeof p.timeoutMs === 'number' ? p.timeoutMs : undefined,
      });
    }
    default:
      throw new Error(`unknown tool: ${tool}`);
  }
}

function useBridge(
  runtime: AegisRuntime,
  appId: string | null,
  config: BridgeConfig | null,
): void {
  useEffect(() => {
    if (!config?.url || config.autoConnect === false) {
      return;
    }
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
      return;
    }

    const sessionId = readSessionId();
    let ws: WebSocket | null = null;
    let attempt = 0;
    let reconnectTimer: number | null = null;
    let closed = false;

    const sendHello = (): void => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }
      const snap = runtime.snapshot();
      ws.send(
        JSON.stringify({
          type: 'session.hello',
          sessionId,
          url: typeof location === 'undefined' ? '' : location.href,
          currentAppId: snap.shell.currentAppId ?? appId ?? null,
          title: typeof document === 'undefined' ? '' : document.title,
          authToken: config.authToken ?? null,
        }),
      );
    };

    const connect = (): void => {
      if (closed) {
        return;
      }
      try {
        ws = new WebSocket(config.url);
      } catch (err) {
        console.warn('[aegis] bridge ws ctor threw', err);
        scheduleReconnect();
        return;
      }
      ws.addEventListener('open', () => {
        attempt = 0;
        sendHello();
      });
      ws.addEventListener('message', (ev: MessageEvent<string>) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (!isToolCallMessage(parsed)) {
          return;
        }
        const { id, tool, params } = parsed;
        runToolCall(runtime, tool, params).then(
          (result) => {
            ws?.send(JSON.stringify({ type: 'tool.result', id, result }));
          },
          (err: unknown) => {
            const errObj =
              err && typeof err === 'object'
                ? (err as Record<string, unknown>)
                : null;
            const code =
              typeof errObj?.code === 'string' ? errObj.code : 'thrown';
            const message =
              typeof errObj?.message === 'string'
                ? errObj.message
                : err instanceof Error
                  ? err.message
                  : String(err);
            ws?.send(
              JSON.stringify({
                type: 'tool.error',
                id,
                error: { code, message },
              }),
            );
          },
        );
      });
      ws.addEventListener('close', () => {
        scheduleReconnect();
      });
      ws.addEventListener('error', () => {
        // close handler does the reconnect — error fires before close.
      });
    };

    const scheduleReconnect = (): void => {
      if (closed) {
        return;
      }
      const delay =
        RECONNECT_BACKOFF_MS[
          Math.min(attempt, RECONNECT_BACKOFF_MS.length - 1)
        ];
      attempt += 1;
      reconnectTimer = window.setTimeout(connect, delay);
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [runtime, appId, config?.url, config?.authToken, config?.autoConnect]);
}

export function AegisAgentProvider({
  children,
  runtime: externalRuntime,
  appId = null,
  shellSnapshot,
  navigate,
  exposeOnWindow = true,
  bridgeUrl,
  bridgeAuthToken,
  bridgeAutoConnect,
}: AegisAgentProviderProps) {
  const [runtime] = useState<AegisRuntime>(
    () => externalRuntime ?? createAegisRuntime(),
  );

  const shellSnapshotRef = useRef(shellSnapshot);
  shellSnapshotRef.current = shellSnapshot;

  useEffect(() => {
    runtime._setShellSnapshot(() => {
      const getter = shellSnapshotRef.current;
      return (
        getter?.() ?? {
          currentAppId: appId,
          route: { pathname: '/', search: '', params: {} },
          breadcrumbs: [],
          theme: 'light',
          viewport: { width: 0, height: 0 },
        }
      );
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

  const bridgeConfig = useMemo<BridgeConfig | null>(() => {
    if (bridgeUrl) {
      return {
        url: bridgeUrl,
        authToken: bridgeAuthToken,
        autoConnect: bridgeAutoConnect ?? true,
      };
    }
    if (typeof window !== 'undefined' && window.__AEGIS_BRIDGE__?.url) {
      const w = window.__AEGIS_BRIDGE__;
      return {
        url: w.url,
        authToken: w.authToken,
        autoConnect: w.autoConnect ?? true,
      };
    }
    return null;
  }, [bridgeUrl, bridgeAuthToken, bridgeAutoConnect]);

  useBridge(runtime, appId, bridgeConfig);

  const value = useMemo(() => ({ runtime, appId }), [runtime, appId]);

  return (
    <AegisAgentContext.Provider value={value}>
      {children}
    </AegisAgentContext.Provider>
  );
}
