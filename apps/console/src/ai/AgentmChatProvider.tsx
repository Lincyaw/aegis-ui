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

const NOT_CONNECTED: AgentChatValue = {
  messages: [],
  sending: false,
  send: () => undefined,
};

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

interface ChatRelayProps {
  chatId: string;
  onChange: (chat: AgentChatValue) => void;
}

/**
 * Sits inside one chat's channel: hands the chat up to the console and
 * keeps its messages saved under that chat.
 */
function ChatRelay({ chatId, onChange }: ChatRelayProps): null {
  const chat = useAgentChat();
  const { messages } = chat;
  const { saveMessages, maybeAutoTitle, touchActive } = useChatStore();

  useEffect(() => {
    onChange(chat);
  }, [chat, onChange]);

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

  // Title + lastActiveAt should bump only when a NEW user turn starts —
  // i.e., the user-message count for this chat increases. Streaming
  // assistant tokens must not reorder the chat list.
  const prevUserCountRef = useRef(0);
  useEffect(() => {
    const userMessages = messages.filter((m) => m.role === 'user');
    if (userMessages.length <= prevUserCountRef.current) {
      return;
    }
    prevUserCountRef.current = userMessages.length;
    const firstUser = userMessages[0];
    if (firstUser) {
      maybeAutoTitle(chatId, firstUser.content);
    }
    touchActive(chatId);
  }, [messages, chatId, maybeAutoTitle, touchActive]);

  return null;
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
 * `useAgentChat`. Switching chats replaces the channel, not the console.
 */
export function AgentmChatProvider({
  url,
  token,
  children,
}: AgentmChatProviderProps): ReactElement {
  const { currentId } = useChatStore();
  const [chat, setChat] = useState<AgentChatValue>(NOT_CONNECTED);
  const [panelOpen, setOpen] = useState<boolean>(readOpen);

  const setPanelOpen = useCallback((open: boolean): void => {
    setOpen(open);
    writeOpen(open);
  }, []);

  // Why: the channel seeds a chat's messages only when it mounts, so it is
  // keyed by chat; as a sibling of `children`, remounting it leaves the
  // console in place.
  const channel = useMemo(
    () => (
      <AgentmChannelProvider
        key={currentId}
        channel={{ url, token, chatId: currentId }}
        initialMessages={loadMessages(currentId)}
      >
        <ChatRelay chatId={currentId} onChange={setChat} />
      </AgentmChannelProvider>
    ),
    [url, token, currentId]
  );

  const value = useMemo<AgentChatValue>(
    () => ({
      messages: chat.messages,
      sending: chat.sending,
      send: chat.send,
      clear: chat.clear,
      panelOpen,
      setPanelOpen,
    }),
    [chat, panelOpen, setPanelOpen]
  );

  return (
    <AgentChatProvider value={value}>
      {channel}
      {children}
    </AgentChatProvider>
  );
}
