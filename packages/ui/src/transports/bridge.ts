import type { AegisRuntime } from '../agent/core/runtime';
import { uniqueId } from '../lib/id';
import { getOrCreateStored } from '../lib/storage';
import { RECONNECT_BACKOFF_MS } from './agentm/agentmChannelClient';

/**
 * Where the MCP bridge listens. The console's Go server serves it as
 * `window.__AEGIS_BRIDGE__` from `/config.js` when started with `--bridge`.
 */
export interface AegisBridgeConfig {
  /** WebSocket URL, e.g. `ws://127.0.0.1:3323/aegis-bridge/ws`. */
  url: string;
  /** The bridge's browser token; omit when it runs with `--bridge-no-auth`. */
  authToken?: string;
}

const SESSION_ID_KEY = 'aegis.bridge.sessionId';

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

/**
 * Connects the runtime to the MCP bridge so an agent outside the page
 * (through `aegis-console mcp`) can snapshot, search and invoke it.
 * Reconnects with backoff until the returned function is called.
 */
export function connectAegisBridge(
  runtime: AegisRuntime,
  config: AegisBridgeConfig,
): () => void {
  const sessionId = getOrCreateStored(
    SESSION_ID_KEY,
    () => uniqueId('sess'),
    'session',
  );
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
        // The app open when the socket connected; the session list shows
        // it, tool calls read the live snapshot.
        currentAppId: snap.shell.currentAppId,
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
      RECONNECT_BACKOFF_MS[Math.min(attempt, RECONNECT_BACKOFF_MS.length - 1)];
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
}
