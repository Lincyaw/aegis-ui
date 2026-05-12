import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AgentProvider,
  type AgentContextValue,
  type AgentMessage,
  useAegisSurface,
} from '@lincyaw/aegis-ui';

import { getRuntimeConfig } from '../config/runtime';

const HISTORY_KEY = 'aegis.ai.history.v1';
const MAX_TURNS = 50;
const SNAPSHOT_BUDGET = 4000;

interface OpenAiChoice {
  message?: { role?: string; content?: string };
}
interface OpenAiResponse {
  choices?: OpenAiChoice[];
  error?: { message?: string };
}

function readHistory(): AgentMessage[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as AgentMessage[];
    return Array.isArray(parsed) ? parsed.slice(-MAX_TURNS * 2) : [];
  } catch {
    return [];
  }
}

function writeHistory(messages: AgentMessage[]): void {
  try {
    const trimmed = messages.slice(-MAX_TURNS * 2);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // Why: localStorage may be full or disabled — degrade silently to in-memory.
  }
}

function newId(): string {
  return `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildSystemPrompt(): string {
  const aegis = typeof window !== 'undefined' ? window.__aegis : undefined;
  let snapshotJson = '{}';
  if (aegis) {
    try {
      const snap = aegis.snapshot();
      const full = JSON.stringify(snap);
      snapshotJson =
        full.length > SNAPSHOT_BUDGET
          ? `${full.slice(0, SNAPSHOT_BUDGET)}…(truncated)`
          : full;
    } catch {
      snapshotJson = '{}';
    }
  }
  return [
    'You are the AegisLab in-app assistant.',
    'The user is operating the AegisLab console. Below is a JSON snapshot of the current shell, route, surfaces, and registered actions.',
    'Use it to ground your answers in what is actually on screen.',
    '',
    'AEGIS_SNAPSHOT:',
    snapshotJson,
  ].join('\n');
}

interface AgentChatProviderProps {
  children: ReactNode;
}

export function AgentChatProvider({
  children,
}: AgentChatProviderProps): ReactElement {
  const [messages, setMessages] = useState<AgentMessage[]>(() =>
    typeof window === 'undefined' ? [] : readHistory(),
  );
  const [sending, setSending] = useState(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    writeHistory(messages);
  }, [messages]);

  const append = useCallback((msg: AgentMessage): void => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const clear = useCallback((): void => {
    setMessages([]);
  }, []);

  const send = useCallback(
    async (content: string): Promise<void> => {
      const trimmed = content.trim();
      if (!trimmed) {
        return;
      }
      const userMsg: AgentMessage = {
        id: newId(),
        role: 'user',
        content: trimmed,
        timestamp: nowIso(),
      };
      append(userMsg);

      const cfg = getRuntimeConfig();
      if (!cfg.aiBaseUrl) {
        append({
          id: newId(),
          role: 'assistant',
          content:
            'AI endpoint not configured. Set it in Settings → Endpoints.',
          timestamp: nowIso(),
        });
        return;
      }

      setSending(true);
      try {
        const history = [...messagesRef.current, userMsg];
        const body = {
          model: cfg.aiModel,
          messages: [
            { role: 'system', content: buildSystemPrompt() },
            ...history.map((m) => ({ role: m.role, content: m.content })),
          ],
        };
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (cfg.aiApiKey) {
          headers.Authorization = `Bearer ${cfg.aiApiKey}`;
        }
        const res = await fetch(`${cfg.aiBaseUrl}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as OpenAiResponse;
        if (!res.ok) {
          const err = data.error?.message ?? `HTTP ${String(res.status)}`;
          append({
            id: newId(),
            role: 'assistant',
            content: `AI request failed: ${err}`,
            timestamp: nowIso(),
          });
          return;
        }
        const reply = data.choices?.[0]?.message?.content ?? '(empty response)';
        append({
          id: newId(),
          role: 'assistant',
          content: reply,
          timestamp: nowIso(),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        append({
          id: newId(),
          role: 'assistant',
          content: `AI request error: ${msg}`,
          timestamp: nowIso(),
        });
      } finally {
        setSending(false);
      }
    },
    [append],
  );

  useAegisSurface<number>({
    id: 'console.ai.chat',
    kind: 'chat',
    label: 'AI chat',
    data: messages.length,
    project: (count) => ({
      entities: [
        {
          id: 'console.ai.chat',
          type: 'chat',
          label: 'AI chat',
        },
      ],
      fields: [
        {
          name: 'messageCount',
          type: 'number',
          label: 'Messages',
          value: count,
        },
      ],
    }),
  });

  const value = useMemo<AgentContextValue>(
    () => ({ messages, sending, send, clear }),
    [messages, sending, send, clear],
  );

  return <AgentProvider value={value}>{children}</AgentProvider>;
}

export default AgentChatProvider;
