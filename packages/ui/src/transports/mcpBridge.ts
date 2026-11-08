import type { AegisRuntime } from '../agent/core/runtime';
import { uniqueId } from '../lib/id';
import {
  getOrCreateStored,
  readStorage,
  removeStorage,
  writeStorage,
} from '../lib/storage';
import { MCP_TOOLS, McpToolError } from './mcpTools';

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
const SESSION_OPEN_KEY = 'aegis.bridge.sessionOpen';
const RECONNECT_BACKOFF_MS = [1000, 2000, 5000, 10000, 30000];
// The bridge refuses a hello by closing the socket right after it, so a
// socket still open after this long was accepted.
const ACCEPTED_AFTER_MS = 5000;
// The bridge's close code for a refused hello, such as a token from before
// it restarted. Only a reload, which fetches the new token, can recover.
const CLOSE_POLICY_VIOLATION = 1008;

const TOOLS_BY_NAME = new Map(MCP_TOOLS.map((tool) => [tool.name, tool]));

interface ToolCallMessage {
  type: 'tool.call';
  id: string;
  tool: string;
  params?: unknown;
}

interface ToolErrorBody {
  code: string;
  message: string;
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

function toolParams(params: unknown): Record<string, unknown> {
  if (params === undefined || params === null) {
    return {};
  }
  if (typeof params !== 'object' || Array.isArray(params)) {
    throw new McpToolError(
      'invalid_params',
      'tool arguments must be an object',
    );
  }
  return params as Record<string, unknown>;
}

function toToolError(err: unknown): ToolErrorBody {
  if (err instanceof McpToolError) {
    return { code: err.code, message: err.message };
  }
  if (err instanceof Error) {
    return { code: 'thrown', message: err.message };
  }
  if (typeof err === 'object' && err !== null) {
    // The runtime rejects with plain AegisError objects.
    const { code, message } = err as Record<string, unknown>;
    if (typeof code === 'string' && typeof message === 'string') {
      return { code, message };
    }
  }
  return { code: 'thrown', message: String(err) };
}

/**
 * The session id survives reloads through sessionStorage. A duplicated tab
 * copies sessionStorage, including the open marker of the tab it came
 * from, so a page that finds the marker takes a fresh id; two tabs sharing
 * one id would keep evicting each other from the bridge.
 */
function claimSession(): { id: string; release: () => void } {
  const duplicated = readStorage(SESSION_OPEN_KEY, 'session') !== null;
  const id = duplicated
    ? uniqueId('sess')
    : getOrCreateStored(SESSION_ID_KEY, () => uniqueId('sess'), 'session');
  writeStorage(SESSION_ID_KEY, id, 'session');
  const markOpen = (): void => {
    writeStorage(SESSION_OPEN_KEY, '1', 'session');
  };
  const markClosed = (): void => {
    removeStorage(SESSION_OPEN_KEY, 'session');
  };
  markOpen();
  window.addEventListener('pageshow', markOpen);
  window.addEventListener('pagehide', markClosed);
  return {
    id,
    release: () => {
      window.removeEventListener('pageshow', markOpen);
      window.removeEventListener('pagehide', markClosed);
      markClosed();
    },
  };
}

function reply(
  ws: WebSocket,
  message:
    | { type: 'tool.result'; id: string; result: unknown }
    | { type: 'tool.error'; id: string; error: ToolErrorBody },
): void {
  // A call whose socket has closed cannot be answered; the bridge fails
  // the calls of a session that goes away.
  if (ws.readyState !== WebSocket.OPEN) {
    return;
  }
  let text: string;
  try {
    text = JSON.stringify(message);
  } catch (err) {
    text = JSON.stringify({
      type: 'tool.error',
      id: message.id,
      error: {
        code: 'unserializable',
        message: `The reply cannot be sent as JSON: ${err instanceof Error ? err.message : String(err)}`,
      },
    });
  }
  ws.send(text);
}

/**
 * Connects the runtime to the MCP bridge so an agent outside the page
 * (through `aegis-console mcp`) can snapshot, search and invoke it.
 * Reconnects with backoff until the returned function is called, or until
 * the bridge refuses the page.
 */
export function connectAegisBridge(
  runtime: AegisRuntime,
  config: AegisBridgeConfig,
): () => void {
  const session = claimSession();
  let active: { ws: WebSocket; calls: AbortController } | null = null;
  let attempt = 0;
  let reconnectTimer: number | undefined;
  let stopped = false;

  const hello = (): string =>
    JSON.stringify({
      type: 'session.hello',
      sessionId: session.id,
      // Origin and path only: the bridge logs this, and a query string or
      // fragment can carry secrets such as an OAuth code.
      url: `${location.origin}${location.pathname}`,
      // The app open when the socket connected; the session list shows
      // it, tool calls read the live snapshot.
      currentAppId: runtime.snapshot().shell.currentAppId,
      title: document.title,
      authToken: config.authToken ?? null,
    });

  const handleMessage = (
    ws: WebSocket,
    signal: AbortSignal,
    data: unknown,
  ): void => {
    if (typeof data !== 'string') {
      return;
    }
    let message: unknown;
    try {
      message = JSON.parse(data);
    } catch {
      console.warn('[aegis] MCP bridge sent a frame that is not JSON');
      return;
    }
    if (!isToolCallMessage(message)) {
      return;
    }
    const { id, tool: name, params } = message;
    const tool = TOOLS_BY_NAME.get(name);
    Promise.resolve()
      .then(() => {
        if (!tool) {
          throw new McpToolError('unknown_tool', `Unknown tool: ${name}`);
        }
        return tool.run(runtime, toolParams(params), signal);
      })
      .then(
        (result: unknown) => {
          reply(ws, { type: 'tool.result', id, result });
        },
        (err: unknown) => {
          reply(ws, { type: 'tool.error', id, error: toToolError(err) });
        },
      );
  };

  const connect = (): void => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(config.url);
    } catch (err) {
      console.error('[aegis] MCP bridge: cannot open its WebSocket', err);
      return;
    }
    const calls = new AbortController();
    active = { ws, calls };
    let acceptedTimer: number | undefined;
    ws.addEventListener('open', () => {
      ws.send(hello());
      acceptedTimer = window.setTimeout(() => {
        attempt = 0;
      }, ACCEPTED_AFTER_MS);
    });
    ws.addEventListener('message', (ev: MessageEvent<unknown>) => {
      handleMessage(ws, calls.signal, ev.data);
    });
    ws.addEventListener('close', (ev) => {
      calls.abort();
      window.clearTimeout(acceptedTimer);
      if (active?.ws === ws) {
        active = null;
      }
      if (stopped) {
        return;
      }
      if (ev.code === CLOSE_POLICY_VIOLATION) {
        console.error(
          `[aegis] MCP bridge refused this page (${ev.reason || 'policy violation'}); reload the page to reconnect.`,
        );
        return;
      }
      scheduleReconnect();
    });
  };

  const scheduleReconnect = (): void => {
    const delay =
      RECONNECT_BACKOFF_MS[Math.min(attempt, RECONNECT_BACKOFF_MS.length - 1)];
    attempt += 1;
    reconnectTimer = window.setTimeout(connect, delay);
  };

  connect();

  return () => {
    stopped = true;
    window.clearTimeout(reconnectTimer);
    if (active) {
      active.calls.abort();
      active.ws.close();
    }
    session.release();
  };
}
