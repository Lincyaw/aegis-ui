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
  AgentChatProvider,
  type AgentChatValue,
  type AgentMessage,
  useAgentChat,
} from '@lincyaw/aegis-ui';
import { AgentmChannelProvider } from '@lincyaw/aegis-ui/transports';

import { loadMessages, useChatStore } from './chatStore';

const OPEN_KEY = 'aegis.ai.dock.open.v1';
const SAVE_DEBOUNCE_MS = 500;

function readOpen(): boolean {
  try {
    return window.localStorage.getItem(OPEN_KEY) === '1';
  } catch {
    return false;
  }
}

function writeOpen(value: boolean): void {
  try {
    window.localStorage.setItem(OPEN_KEY, value ? '1' : '0');
  } catch {
    // Why: localStorage may be unavailable in some sandboxes — preference is best-effort.
  }
}

interface ChatPersistenceProps {
  chatId: string;
}

/**
 * Keeps one chat's messages saved under that chat, titles a still-untitled
 * chat from its first user message, and bumps its `lastActiveAt` when a new
 * user turn starts.
 */
function ChatPersistence({ chatId }: ChatPersistenceProps): null {
  const { messages } = useAgentChat();
  const { saveMessages, maybeAutoTitle, touchActive } = useChatStore();

  // Debounced persistence: coalesce streaming writes to at most one per
  // SAVE_DEBOUNCE_MS; flush when the chat closes so nothing is lost.
  const lastSavedRef = useRef<string>('');
  const pendingRef = useRef<AgentMessage[] | null>(null);
  useEffect(() => {
    const serialized = JSON.stringify(messages);
    if (serialized === lastSavedRef.current) {
      return undefined;
    }
    pendingRef.current = messages;
    const flush = (): void => {
      const pending = pendingRef.current;
      if (!pending) {
        return;
      }
      saveMessages(chatId, pending);
      lastSavedRef.current = JSON.stringify(pending);
      pendingRef.current = null;
    };
    const timer = window.setTimeout(flush, SAVE_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      flush();
    };
  }, [messages, chatId, saveMessages]);

  // Title + lastActiveAt bump only when a new user turn starts, i.e. the
  // chat's user-message count rises. The count starts at what the chat
  // opened with, so opening it on a switch or a reload is not a new turn,
  // and it follows a clear back down. Streaming assistant tokens must not
  // reorder the chat list.
  const prevUserCountRef = useRef(
    messages.filter((m) => m.role === 'user').length
  );
  useEffect(() => {
    const userMessages = messages.filter((m) => m.role === 'user');
    const previous = prevUserCountRef.current;
    prevUserCountRef.current = userMessages.length;
    if (userMessages.length <= previous) {
      return;
    }
    const firstUser = userMessages[0];
    if (firstUser) {
      maybeAutoTitle(chatId, firstUser.content);
    }
    touchActive(chatId);
  }, [messages, chatId, maybeAutoTitle, touchActive]);

  return null;
}

interface DockChatProviderProps {
  children: ReactNode;
}

/** Serves the channel's chat together with whether the AI dock is open. */
function DockChatProvider({ children }: DockChatProviderProps): ReactElement {
  const { messages, sending, send, clear } = useAgentChat();
  const [panelOpen, setOpen] = useState<boolean>(readOpen);

  const setPanelOpen = useCallback((open: boolean): void => {
    setOpen(open);
    writeOpen(open);
  }, []);

  const value = useMemo<AgentChatValue>(
    () => ({ messages, sending, send, clear, panelOpen, setPanelOpen }),
    [messages, sending, send, clear, panelOpen, setPanelOpen]
  );

  return <AgentChatProvider value={value}>{children}</AgentChatProvider>;
}

interface AgentmChatProviderProps {
  /** AgentM gateway WebSocket URL. */
  url: string;
  /** Token sent to the gateway, if it requires one. */
  token?: string;
  children: ReactNode;
}

/**
 * Connects the current chat to the AgentM gateway and serves it, with
 * whether the AI dock is open, to everything below through
 * `useAgentChat`. Switching chats reconnects the channel and restarts it
 * from that chat's saved messages; the console stays mounted.
 */
export function AgentmChatProvider({
  url,
  token,
  children,
}: AgentmChatProviderProps): ReactElement {
  const { currentId } = useChatStore();
  const initialMessages = useMemo(() => loadMessages(currentId), [currentId]);

  return (
    <AgentmChannelProvider
      channel={{ url, token, chatId: currentId }}
      initialMessages={initialMessages}
    >
      {/* Why: keyed so its save and title counters reset per chat. */}
      <ChatPersistence key={currentId} chatId={currentId} />
      <DockChatProvider>{children}</DockChatProvider>
    </AgentmChannelProvider>
  );
}
