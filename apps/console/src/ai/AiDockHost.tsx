import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@lincyaw/aegis-ui';
import { AgentmChannelProvider } from '@lincyaw/aegis-ui/transports';

import { AiDock } from './AiDock';
import { useChatStore } from './chatStore';

interface AgentmConnection {
  /** AgentM gateway WebSocket URL. */
  url: string;
  /** Token sent to the gateway, if it requires one. */
  token?: string;
}

const OPEN_KEY = 'aegis.ai.dock.open.v1';

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

function AgentmChatProvider({
  url,
  token,
  children,
}: AgentmConnection & { children: ReactNode }): ReactElement {
  const { currentId, loadMessages } = useChatStore();
  // Why: remount on chat switch so the provider's messages and stream state
  // reset; it seeds from initialMessages only when it mounts.
  return (
    <AgentmChannelProvider
      key={currentId}
      channel={{ url, token, chatId: currentId }}
      initialMessages={loadMessages(currentId)}
    >
      {children}
    </AgentmChannelProvider>
  );
}

export function AiDockHost({ url, token }: AgentmConnection): ReactElement {
  const [open, setOpen] = useState<boolean>(() =>
    typeof window === 'undefined' ? false : readOpen()
  );

  const toggle = useCallback((): void => {
    setOpen((prev) => {
      const next = !prev;
      writeOpen(next);
      return next;
    });
  }, []);

  const close = useCallback((): void => {
    setOpen(false);
    writeOpen(false);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [toggle]);

  return (
    <>
      <Button
        tone='ghost'
        onClick={toggle}
        aria-label='AI assistant'
        aria-pressed={open}
        title='AI assistant (Ctrl/Cmd+K)'
      >
        AI
      </Button>
      <AgentmChatProvider url={url} token={token}>
        {/* Why: the glass header's backdrop-filter is the containing block
            for fixed descendants, which would clip the dock to the header. */}
        {createPortal(<AiDock open={open} onClose={close} />, document.body)}
      </AgentmChatProvider>
    </>
  );
}

export default AiDockHost;
