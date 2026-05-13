import { type ReactElement, useCallback, useEffect, useRef } from 'react';

import {
  type AgentMessage,
  AgentPanel,
  ChatComposer,
  ChatMessage,
  ChatMessageList,
  Markdown,
  ToolCallCard,
  useAgent,
} from '@lincyaw/aegis-ui';

import { ChatSwitcher } from './ChatSwitcher';
import { useChatStore } from './chatStore';
import './AiDock.css';

const SAVE_DEBOUNCE_MS = 500;

interface AiDockProps {
  open: boolean;
  onClose: () => void;
}

export function AiDock({ open, onClose }: AiDockProps): ReactElement | null {
  const { messages, sending, send, clear } = useAgent();
  const { currentId, saveMessages, maybeAutoTitle, touchActive } =
    useChatStore();

  // Debounced persistence: coalesce streaming writes to at most one per
  // SAVE_DEBOUNCE_MS; flush on unmount / chat-switch so nothing is lost.
  const lastSavedRef = useRef<string>('');
  const pendingRef = useRef<{ id: string; messages: typeof messages } | null>(
    null,
  );
  useEffect(() => {
    const serialized = JSON.stringify(messages);
    if (serialized === lastSavedRef.current) {
      return undefined;
    }
    pendingRef.current = { id: currentId, messages };
    const timer = window.setTimeout(() => {
      const pending = pendingRef.current;
      if (!pending) {
        return;
      }
      saveMessages(pending.id, pending.messages);
      lastSavedRef.current = JSON.stringify(pending.messages);
      pendingRef.current = null;
    }, SAVE_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      const pending = pendingRef.current;
      if (pending) {
        saveMessages(pending.id, pending.messages);
        lastSavedRef.current = JSON.stringify(pending.messages);
        pendingRef.current = null;
      }
    };
  }, [messages, currentId, saveMessages]);

  // Title + lastActiveAt should bump only when a NEW user turn starts —
  // i.e., the user-message count for this chat increases. Streaming
  // assistant tokens must not reorder the chat list.
  const prevUserCountRef = useRef<{ id: string; count: number }>({
    id: currentId,
    count: 0,
  });
  useEffect(() => {
    const userMessages = messages.filter((m) => m.role === 'user');
    const userCount = userMessages.length;
    const prev = prevUserCountRef.current;
    if (prev.id !== currentId) {
      prevUserCountRef.current = { id: currentId, count: userCount };
      return;
    }
    if (userCount > prev.count) {
      prevUserCountRef.current = { id: currentId, count: userCount };
      const firstUser = userMessages[0];
      if (firstUser) {
        maybeAutoTitle(currentId, firstUser.content);
      }
      touchActive(currentId);
    }
  }, [messages, currentId, maybeAutoTitle, touchActive]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleKeyDown]);

  if (!open) {
    return null;
  }

  return (
    <div className='aegis-ai-dock' role='dialog' aria-label='AI assistant'>
      <AgentPanel
        title={<ChatSwitcher />}
        headerActions={
          <div className='aegis-ai-dock__header-actions'>
            {clear && messages.length > 0 && (
              <button
                type='button'
                className='aegis-ai-dock__btn'
                onClick={clear}
                aria-label='Clear chat'
              >
                Clear
              </button>
            )}
            <button
              type='button'
              className='aegis-ai-dock__btn'
              onClick={onClose}
              aria-label='Close AI panel'
            >
              Close
            </button>
          </div>
        }
        footer={<ChatComposer onSend={send} sending={sending} />}
      >
        <ChatMessageList>
          {messages.length === 0 ? (
            <ChatMessage
              role='assistant'
              content='Hi — ask me anything about what is on your screen.'
            />
          ) : (
            messages.map((m) => {
              if (m.role === 'tool' && m.toolCall) {
                return (
                  <ChatMessage
                    key={m.id}
                    role='assistant'
                    content={<ToolCallCard data={renderToolCallData(m)} />}
                    timestamp={m.timestamp}
                  />
                );
              }
              return (
                <ChatMessage
                  key={m.id}
                  role={m.role === 'tool' ? 'assistant' : m.role}
                  content={
                    m.role === 'user' ? (
                      m.content
                    ) : (
                      <Markdown>{m.content}</Markdown>
                    )
                  }
                  timestamp={m.timestamp}
                />
              );
            })
          )}
        </ChatMessageList>
      </AgentPanel>
    </div>
  );
}

function renderToolCallData(message: AgentMessage): {
  name: string;
  arguments: string;
  result?: string;
  status: 'running' | 'ok' | 'error';
  isError?: boolean;
} {
  const tc = message.toolCall;
  if (!tc) {
    return { name: 'tool', arguments: '', status: 'ok' };
  }
  let argsText = '';
  try {
    argsText = JSON.stringify(tc.args ?? {}, null, 2);
  } catch {
    argsText = String(tc.args ?? '');
  }
  return {
    name: tc.name,
    arguments: argsText,
    result: tc.resultText,
    status: tc.status,
    isError: tc.isError,
  };
}

export default AiDock;
