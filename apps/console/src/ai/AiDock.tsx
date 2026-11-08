import { type KeyboardEvent, type ReactElement, type RefObject } from 'react';

import {
  type AgentMessage,
  AgentPanel,
  Button,
  ChatComposer,
  ChatMessage,
  ChatMessageList,
  Markdown,
  ToolCallCard,
  useAgentChat,
} from '@lincyaw/aegis-ui';

import { ChatSwitcher } from './ChatSwitcher';

import './AiDock.css';

interface AiDockProps {
  open: boolean;
  onClose: () => void;
  dockRef: RefObject<HTMLDivElement>;
}

export function AiDock({
  open,
  onClose,
  dockRef,
}: AiDockProps): ReactElement | null {
  const { messages, sending, send, clear } = useAgentChat();

  // Popups inside the dock mark the Escape they handle with preventDefault.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape' && !event.defaultPrevented) {
      event.preventDefault();
      onClose();
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      ref={dockRef}
      className='aegis-ai-dock'
      role='dialog'
      aria-label='AI assistant'
      onKeyDown={handleKeyDown}
    >
      <AgentPanel
        title={<ChatSwitcher />}
        headerActions={
          <>
            {clear && messages.length > 0 && (
              <Button tone='ghost' onClick={clear} aria-label='Clear chat'>
                Clear
              </Button>
            )}
            <Button tone='ghost' onClick={onClose} aria-label='Close AI panel'>
              Close
            </Button>
          </>
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
  };
}

export default AiDock;
