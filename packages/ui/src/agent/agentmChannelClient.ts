// WebSocket client for the AgentM channels gateway
// (contrib/channels in github.com/.../AgentM, feat/gateway-websocket).
//
// Wire contract — one binary WS message == one framed envelope:
//   [ 4-byte big-endian length ][ UTF-8 JSON body ]
// Envelope JSON: { v: 1, id, kind, ts, body, [to, correlation_id, hops,
// root_session_key, peer_kind] }. Kinds: hello | welcome | inbound |
// outbound | ack | ack_batch | ping | pong | error | bye | delivery_batch.
//
// This module is transport-only: no React, no DOM.

export const WIRE_VERSION = 1;

export type EnvelopeKind =
  | 'hello'
  | 'welcome'
  | 'inbound'
  | 'outbound'
  | 'ack'
  | 'ack_batch'
  | 'ping'
  | 'pong'
  | 'error'
  | 'bye'
  | 'delivery_batch';

export interface Envelope {
  v: number;
  id: string;
  kind: EnvelopeKind;
  ts: number;
  body: Record<string, unknown>;
  to?: string;
  correlation_id?: string;
  hops?: number;
  root_session_key?: string;
  peer_kind?: string;
}

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'closed';

export interface AgentmChannelClientOptions {
  url: string;
  peerId: string;
  /** Default: 'chat_client'. */
  peerKind?: string;
  /** Bearer/shared token sent in the hello body. */
  token?: string;
  /** Default: 'web'. Goes into every inbound body. */
  channel?: string;
  /** Default: same as peerId. Goes into every inbound body. */
  chatId?: string;
  capabilities?: Record<string, unknown>;
  /** Reconnect backoff schedule in ms. Defaults to [1000, 2000, 5000, 10000]. */
  reconnectBackoffMs?: number[];
  /** If false, do not auto-reconnect after close. Default true. */
  autoReconnect?: boolean;
}

const DEFAULT_BACKOFF = [1000, 2000, 5000, 10000];

const HEADER_BYTES = 4;
const MAX_FRAME_BYTES = 16 * 1024 * 1024;

function encodeFrame(env: Envelope): ArrayBuffer {
  const json = JSON.stringify(env);
  const bodyBytes = new TextEncoder().encode(json);
  if (bodyBytes.byteLength > MAX_FRAME_BYTES) {
    throw new Error(
      `encoded envelope is ${bodyBytes.byteLength} bytes; exceeds MAX_FRAME_BYTES=${MAX_FRAME_BYTES}`,
    );
  }
  const out = new ArrayBuffer(HEADER_BYTES + bodyBytes.byteLength);
  const view = new DataView(out);
  view.setUint32(0, bodyBytes.byteLength, false);
  new Uint8Array(out, HEADER_BYTES).set(bodyBytes);
  return out;
}

function decodeFrame(data: ArrayBuffer | Uint8Array): Envelope {
  const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (u8.byteLength < HEADER_BYTES) {
    throw new Error('incomplete frame: missing length header');
  }
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const length = view.getUint32(0, false);
  if (length > MAX_FRAME_BYTES) {
    throw new Error(
      `declared frame length ${length} exceeds MAX_FRAME_BYTES=${MAX_FRAME_BYTES}`,
    );
  }
  if (u8.byteLength < HEADER_BYTES + length) {
    throw new Error('incomplete frame: short body');
  }
  const bodyBytes = u8.subarray(HEADER_BYTES, HEADER_BYTES + length);
  const json = new TextDecoder('utf-8').decode(bodyBytes);
  const parsed = JSON.parse(json) as unknown;
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('envelope wire payload is not a JSON object');
  }
  const env = parsed as Record<string, unknown>;
  for (const required of ['v', 'id', 'kind', 'ts', 'body'] as const) {
    if (!(required in env)) {
      throw new Error(`envelope missing required field ${required}`);
    }
  }
  return env as unknown as Envelope;
}

function nowSeconds(): number {
  return Date.now() / 1000;
}

function uniqueSuffix(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export type Listener<T> = (value: T) => void;

interface ConnectResult {
  welcome: Envelope;
}

export class AgentmChannelClient {
  private readonly opts: Required<
    Omit<AgentmChannelClientOptions, 'token' | 'capabilities'>
  > &
    Pick<AgentmChannelClientOptions, 'token' | 'capabilities'>;
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'idle';
  private attempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private welcomePending: {
    resolve: (r: ConnectResult) => void;
    reject: (err: Error) => void;
  } | null = null;
  private explicitlyClosed = false;

  private readonly outboundListeners = new Set<Listener<Envelope>>();
  private readonly errorListeners = new Set<Listener<Envelope>>();
  private readonly statusListeners = new Set<Listener<ConnectionStatus>>();
  private readonly anyListeners = new Set<Listener<Envelope>>();

  constructor(options: AgentmChannelClientOptions) {
    this.opts = {
      url: options.url,
      peerId: options.peerId,
      peerKind: options.peerKind ?? 'chat_client',
      token: options.token,
      channel: options.channel ?? 'web',
      chatId: options.chatId ?? options.peerId,
      capabilities: options.capabilities,
      reconnectBackoffMs: options.reconnectBackoffMs ?? DEFAULT_BACKOFF,
      autoReconnect: options.autoReconnect ?? true,
    };
  }

  // -- public API --------------------------------------------------

  get connectionStatus(): ConnectionStatus {
    return this.status;
  }

  get peerId(): string {
    return this.opts.peerId;
  }

  get sessionKey(): string {
    return `${this.opts.channel}:${this.opts.chatId}`;
  }

  /** Open the WebSocket and complete the hello/welcome handshake. */
  async connect(): Promise<ConnectResult> {
    if (typeof WebSocket === 'undefined') {
      throw new Error('WebSocket is not available in this environment');
    }
    this.explicitlyClosed = false;
    return this.openOnce();
  }

  /** Close the connection. Disables auto-reconnect for this client. */
  close(): void {
    this.explicitlyClosed = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        // Best-effort: send bye, then close. Server tolerates either.
        if (this.ws.readyState === WebSocket.OPEN) {
          this.send(this.makeEnvelope('bye', {}));
        }
      } catch {
        /* ignore — we're closing anyway */
      }
      this.ws.close();
    }
    this.setStatus('closed');
  }

  /** Send an arbitrary envelope. Throws if not OPEN. */
  send(env: Envelope): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('AgentmChannelClient is not connected');
    }
    this.ws.send(encodeFrame(env));
  }

  /** Convenience: send an `inbound` envelope with `{channel, chat_id, content}`. */
  sendInbound(content: string, extraBody?: Record<string, unknown>): string {
    const id = `in-${this.opts.peerId}-${uniqueSuffix()}`;
    this.send({
      v: WIRE_VERSION,
      id,
      kind: 'inbound',
      ts: nowSeconds(),
      body: {
        channel: this.opts.channel,
        chat_id: this.opts.chatId,
        content,
        ...extraBody,
      },
    });
    return id;
  }

  /** Convenience: send a `ping`. */
  ping(): void {
    this.send(this.makeEnvelope('ping', {}));
  }

  onOutbound(cb: Listener<Envelope>): () => void {
    this.outboundListeners.add(cb);
    return () => this.outboundListeners.delete(cb);
  }

  onError(cb: Listener<Envelope>): () => void {
    this.errorListeners.add(cb);
    return () => this.errorListeners.delete(cb);
  }

  onStatusChange(cb: Listener<ConnectionStatus>): () => void {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  /** Fires for every envelope received (including welcome/pong/error). */
  onAny(cb: Listener<Envelope>): () => void {
    this.anyListeners.add(cb);
    return () => this.anyListeners.delete(cb);
  }

  // -- internals ---------------------------------------------------

  private makeEnvelope(
    kind: EnvelopeKind,
    body: Record<string, unknown>,
  ): Envelope {
    return {
      v: WIRE_VERSION,
      id: `${kind}-${this.opts.peerId}-${uniqueSuffix()}`,
      kind,
      ts: nowSeconds(),
      body,
    };
  }

  private setStatus(next: ConnectionStatus): void {
    if (this.status === next) {
      return;
    }
    this.status = next;
    for (const cb of this.statusListeners) {
      cb(next);
    }
  }

  private async openOnce(): Promise<ConnectResult> {
    return new Promise<ConnectResult>((resolve, reject) => {
      this.setStatus(this.attempt === 0 ? 'connecting' : 'reconnecting');

      let ws: WebSocket;
      try {
        ws = new WebSocket(this.opts.url);
      } catch (err) {
        const e =
          err instanceof Error
            ? err
            : new Error(`WebSocket ctor threw: ${String(err)}`);
        reject(e);
        this.scheduleReconnect();
        return;
      }
      ws.binaryType = 'arraybuffer';
      this.ws = ws;
      this.welcomePending = { resolve, reject };

      ws.addEventListener('open', () => {
        const hello: Envelope = {
          v: WIRE_VERSION,
          id: `hello-${this.opts.peerId}-${uniqueSuffix()}`,
          kind: 'hello',
          ts: nowSeconds(),
          body: {
            peer_id: this.opts.peerId,
            peer_kind: this.opts.peerKind,
            token: this.opts.token ?? null,
            capabilities: this.opts.capabilities ?? {},
          },
        };
        try {
          ws.send(encodeFrame(hello));
        } catch (err) {
          this.failPending(err instanceof Error ? err : new Error(String(err)));
          ws.close();
        }
      });

      ws.addEventListener('message', (ev: MessageEvent) => {
        const data = ev.data as unknown;
        let env: Envelope;
        try {
          if (data instanceof ArrayBuffer) {
            env = decodeFrame(data);
          } else if (data instanceof Uint8Array) {
            env = decodeFrame(data);
          } else if (data instanceof Blob) {
            // Blob path — async. Defer dispatch.
            void data.arrayBuffer().then(
              (buf) => this.handleEnvelope(decodeFrame(buf)),
              (err: unknown) => this.handleFatal(err),
            );
            return;
          } else {
            throw new Error(
              `unexpected WS frame type: ${typeof data} (wire is binary-only)`,
            );
          }
        } catch (err) {
          this.handleFatal(err);
          return;
        }
        this.handleEnvelope(env);
      });

      ws.addEventListener('close', () => {
        this.ws = null;
        if (this.welcomePending) {
          this.failPending(new Error('socket closed before welcome'));
        }
        if (this.explicitlyClosed) {
          this.setStatus('closed');
          return;
        }
        if (this.opts.autoReconnect) {
          this.scheduleReconnect();
        } else {
          this.setStatus('closed');
        }
      });

      ws.addEventListener('error', () => {
        // The close handler does the reconnect bookkeeping.
      });
    });
  }

  private handleEnvelope(env: Envelope): void {
    for (const cb of this.anyListeners) {
      cb(env);
    }
    switch (env.kind) {
      case 'welcome': {
        this.attempt = 0;
        this.setStatus('connected');
        const pending = this.welcomePending;
        this.welcomePending = null;
        pending?.resolve({ welcome: env });
        return;
      }
      case 'error': {
        for (const cb of this.errorListeners) {
          cb(env);
        }
        const pending = this.welcomePending;
        if (pending) {
          this.welcomePending = null;
          const body = env.body as {
            code?: unknown;
            message?: unknown;
          };
          const code = typeof body.code === 'string' ? body.code : 'unknown';
          const message =
            typeof body.message === 'string' ? body.message : 'error envelope';
          pending.reject(
            new Error(`agentm hello rejected: ${code}: ${message}`),
          );
        }
        return;
      }
      case 'ping': {
        try {
          this.send({
            v: WIRE_VERSION,
            id: `pong-${this.opts.peerId}-${uniqueSuffix()}`,
            kind: 'pong',
            ts: nowSeconds(),
            body: { echo_id: env.id },
          });
        } catch {
          /* socket gone — close handler will reconnect */
        }
        return;
      }
      case 'outbound': {
        for (const cb of this.outboundListeners) {
          cb(env);
        }
        return;
      }
      default:
        // pong / ack / ack_batch / bye / delivery_batch / hello (server never
        // sends hello) — exposed via onAny for callers that care.
        return;
    }
  }

  private handleFatal(err: unknown): void {
    const e = err instanceof Error ? err : new Error(String(err));
    if (this.welcomePending) {
      this.failPending(e);
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
    }
  }

  private failPending(err: Error): void {
    const pending = this.welcomePending;
    this.welcomePending = null;
    pending?.reject(err);
  }

  private scheduleReconnect(): void {
    if (this.explicitlyClosed || !this.opts.autoReconnect) {
      this.setStatus('closed');
      return;
    }
    const schedule = this.opts.reconnectBackoffMs;
    const idx = Math.min(this.attempt, schedule.length - 1);
    const delay = schedule[idx] ?? 1000;
    this.attempt += 1;
    this.setStatus('reconnecting');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openOnce().catch(() => {
        /* scheduleReconnect already fired from close handler */
      });
    }, delay);
  }
}
