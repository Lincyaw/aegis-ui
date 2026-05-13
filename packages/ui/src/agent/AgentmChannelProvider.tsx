import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AgentProvider } from './AgentProvider';
import type {
  AgentContextValue,
  AgentMessage,
  AgentMessageRole,
  AgentToolCallRecord,
} from './agentContext';
import {
  AgentmChannelClient,
  type AgentmChannelClientOptions,
  type ConnectionStatus,
  type Envelope,
} from './agentmChannelClient';

type ChannelOptions = Omit<AgentmChannelClientOptions, 'peerId'> & {
  /** Stable peer id. Defaults to a sessionStorage-persisted random id. */
  peerId?: string;
};

interface AgentmChannelProviderProps {
  channel: ChannelOptions;
  children: ReactNode;
  /**
   * Initial messages — for resuming a prior thread server-side. The
   * library still does not persist anything itself.
   */
  initialMessages?: AgentMessage[];
  /** Notified on every connection-state change. */
  onStatusChange?: (status: ConnectionStatus) => void;
  /**
   * Custom mapper from an `outbound` envelope to a renderable assistant
   * message. Default reads `body.content` as the text body.
   */
  mapOutbound?: (env: Envelope) => MappedOutbound | null;
}

interface MappedOutbound {
  content: string;
  role?: AgentMessageRole;
  final?: boolean;
  streamId?: string | null;
  toolCall?: AgentToolCallRecord;
}

function readPersistedPeerId(): string {
  if (typeof window === 'undefined') {
    return `peer-${Math.random().toString(36).slice(2, 10)}`;
  }
  const KEY = 'aegis.agentm.peerId';
  try {
    const existing = window.sessionStorage.getItem(KEY);
    if (existing) {
      return existing;
    }
    const fresh = `peer-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    window.sessionStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return `peer-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function defaultMapOutbound(env: Envelope): MappedOutbound | null {
  const body = env.body as {
    content?: unknown;
    final?: unknown;
    stream_id?: unknown;
    kind?: unknown;
    metadata?: unknown;
  };
  const streamId = typeof body.stream_id === 'string' ? body.stream_id : null;
  if (body.kind === 'tool_call') {
    const toolCall = parseToolCall(body.metadata);
    if (!toolCall) {
      return null;
    }
    return {
      role: 'tool',
      content: '',
      streamId,
      final: body.final === true,
      toolCall,
    };
  }
  if (typeof body.content !== 'string') {
    return null;
  }
  return {
    content: body.content,
    final: body.final === true,
    streamId,
  };
}

function parseToolCall(metadata: unknown): AgentToolCallRecord | null {
  if (typeof metadata !== 'object' || metadata === null) {
    return null;
  }
  const m = metadata as Record<string, unknown>;
  const toolCallId = m.tool_call_id;
  const name = m.tool_name;
  const status = m.status;
  if (typeof toolCallId !== 'string' || typeof name !== 'string') {
    return null;
  }
  const normalizedStatus: AgentToolCallRecord['status'] =
    status === 'running' || status === 'ok' || status === 'error'
      ? status
      : 'running';
  const record: AgentToolCallRecord = {
    toolCallId,
    name,
    args: m.args,
    status: normalizedStatus,
  };
  if (typeof m.result_text === 'string') {
    record.resultText = m.result_text;
  }
  if (typeof m.is_error === 'boolean') {
    record.isError = m.is_error;
  }
  if (typeof m.started_at === 'number') {
    record.startedAt = m.started_at;
  }
  if (typeof m.ended_at === 'number') {
    record.endedAt = m.ended_at;
  }
  return record;
}

function messageId(): string {
  return `msg-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/**
 * Connects to an AgentM channels gateway (contrib/channels) as a
 * `chat_client` peer over WebSocket and exposes the conversation as
 * an `AgentContextValue` consumable by `<AgentPanel>` / `useAgent`.
 *
 * The client owns the round-trip: `send(content)` emits an `inbound`
 * envelope; `outbound` envelopes from the gateway become assistant
 * messages. Streamed responses (same `stream_id`) replace the same
 * message in place — contrib/channels sends cumulative content per
 * chunk, not deltas. Non-streamed outbounds become discrete messages.
 */
export function AgentmChannelProvider({
  channel,
  children,
  initialMessages,
  onStatusChange,
  mapOutbound,
}: AgentmChannelProviderProps): ReactElement {
  const [messages, setMessages] = useState<AgentMessage[]>(
    () => initialMessages ?? [],
  );
  const [sending, setSending] = useState<boolean>(false);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const clientRef = useRef<AgentmChannelClient | null>(null);
  // Maps stream_id → message id so we can append chunks to the same row.
  const streamMapRef = useRef<Map<string, string>>(new Map());

  const mapRef = useRef(mapOutbound);
  mapRef.current = mapOutbound;
  const onStatusRef = useRef(onStatusChange);
  onStatusRef.current = onStatusChange;
  const channelRef = useRef(channel);
  channelRef.current = channel;

  const channelKey = useMemo(
    () =>
      JSON.stringify({
        url: channel.url,
        peerId: channel.peerId,
        peerKind: channel.peerKind,
        token: channel.token,
        channel: channel.channel,
        chatId: channel.chatId,
        autoReconnect: channel.autoReconnect,
      }),
    [
      channel.url,
      channel.peerId,
      channel.peerKind,
      channel.token,
      channel.channel,
      channel.chatId,
      channel.autoReconnect,
    ],
  );

  useEffect(() => {
    const current = channelRef.current;
    const peerId = current.peerId ?? readPersistedPeerId();
    const client = new AgentmChannelClient({ ...current, peerId });
    clientRef.current = client;

    const offStatus = client.onStatusChange((s) => {
      setStatus(s);
      onStatusRef.current?.(s);
    });

    const offOutbound = client.onOutbound((env) => {
      const mapper = mapRef.current ?? defaultMapOutbound;
      const mapped = mapper(env);
      if (!mapped) {
        return;
      }
      setSending(false);
      setMessages((prev) => appendOutbound(prev, mapped, streamMapRef.current));
    });

    const offError = client.onError((env) => {
      const body = env.body as { code?: unknown; message?: unknown };
      const code = typeof body.code === 'string' ? body.code : 'error';
      const detail =
        typeof body.message === 'string' ? body.message : 'gateway error';
      setSending(false);
      setMessages((prev) => [
        ...prev,
        {
          id: messageId(),
          role: 'system',
          content: `[${code}] ${detail}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    });

    client.connect().catch(() => {
      // surfaced via onError / status; nothing to do here.
    });

    const streamMap = streamMapRef.current;
    return () => {
      offStatus();
      offOutbound();
      offError();
      client.close();
      if (clientRef.current === client) {
        clientRef.current = null;
      }
      streamMap.clear();
    };
    // channelKey captures every input that affects the client identity;
    // the latest `channel` object is read via channelRef so a fresh
    // parent render with the same fields does not tear down the socket.
  }, [channelKey]);

  const send = useCallback((content: string): void => {
    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }
    const client = clientRef.current;
    setMessages((prev) => [
      ...prev,
      {
        id: messageId(),
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      },
    ]);
    if (!client || client.connectionStatus !== 'connected') {
      setMessages((prev) => [
        ...prev,
        {
          id: messageId(),
          role: 'system',
          content: 'AgentM gateway is not connected — message not delivered.',
          timestamp: new Date().toISOString(),
        },
      ]);
      return;
    }
    try {
      setSending(true);
      client.sendInbound(trimmed);
    } catch (err) {
      setSending(false);
      setMessages((prev) => [
        ...prev,
        {
          id: messageId(),
          role: 'system',
          content: `send failed: ${err instanceof Error ? err.message : String(err)}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, []);

  const clear = useCallback((): void => {
    streamMapRef.current.clear();
    setMessages([]);
  }, []);

  const value = useMemo<AgentContextValue & { status: ConnectionStatus }>(
    () => ({
      messages,
      sending,
      send,
      clear,
      status,
    }),
    [messages, sending, send, clear, status],
  );

  return <AgentProvider value={value}>{children}</AgentProvider>;
}

function appendOutbound(
  prev: AgentMessage[],
  mapped: MappedOutbound,
  streamMap: Map<string, string>,
): AgentMessage[] {
  const role: AgentMessageRole = mapped.role ?? 'assistant';
  const timestamp = new Date().toISOString();

  if (mapped.streamId) {
    const existingId = streamMap.get(mapped.streamId);
    if (existingId) {
      // contrib/channels sends cumulative content per stream_id (each
      // chunk is the full text so far, not a delta), so replace.
      const next = prev.map((m) =>
        m.id === existingId
          ? {
              ...m,
              content: mapped.content,
              ...(mapped.toolCall ? { toolCall: mapped.toolCall } : {}),
            }
          : m,
      );
      if (mapped.final) {
        streamMap.delete(mapped.streamId);
      }
      return next;
    }
    const id = messageId();
    streamMap.set(mapped.streamId, id);
    const fresh: AgentMessage = {
      id,
      role,
      content: mapped.content,
      timestamp,
      ...(mapped.toolCall ? { toolCall: mapped.toolCall } : {}),
    };
    if (mapped.final) {
      streamMap.delete(mapped.streamId);
    }
    return [...prev, fresh];
  }

  return [
    ...prev,
    {
      id: messageId(),
      role,
      content: mapped.content,
      timestamp,
      ...(mapped.toolCall ? { toolCall: mapped.toolCall } : {}),
    },
  ];
}
