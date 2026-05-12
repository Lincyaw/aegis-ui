import { type ReactElement, useCallback, useEffect } from 'react';

import {
  AgentPanel,
  ChatComposer,
  ChatMessage,
  ChatMessageList,
  useAgent,
} from '@lincyaw/aegis-ui';

import './AiDock.css';

interface AiDockProps {
  open: boolean;
  onClose: () => void;
}

export function AiDock({ open, onClose }: AiDockProps): ReactElement | null {
  const { messages, sending, send, clear } = useAgent();

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
        title='AI assistant'
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
            messages.map((m) => (
              <ChatMessage
                key={m.id}
                role={m.role}
                content={m.content}
                timestamp={m.timestamp}
              />
            ))
          )}
        </ChatMessageList>
      </AgentPanel>
    </div>
  );
}

export default AiDock;
