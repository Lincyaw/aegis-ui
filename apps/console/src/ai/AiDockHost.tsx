import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { ThemeToggle } from '@lincyaw/aegis-ui';

import { AgentChatProvider } from './AgentChatProvider';
import { AiDock } from './AiDock';

const agentmConfigured = Boolean(import.meta.env.VITE_AGENTM_GATEWAY_URL);

// eslint-disable-next-line no-console -- temporary diagnostic for AgentM wire-up
console.info('[AiDockHost] agentmConfigured =', agentmConfigured, {
  url: import.meta.env.VITE_AGENTM_GATEWAY_URL,
});

function ChatProviderShell({ children }: { children: ReactNode }): ReactNode {
  // When AgentM is wired (see main.tsx → MaybeAgentm), the outer
  // AgentmChannelProvider already supplies the AgentContext we need;
  // mounting AgentChatProvider here would shadow it with the direct
  // OpenAI client and surface "AI endpoint not configured".
  if (agentmConfigured) {
    return children;
  }
  return <AgentChatProvider>{children}</AgentChatProvider>;
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

export function AiDockHost(): ReactElement {
  const [open, setOpen] = useState<boolean>(() =>
    typeof window === 'undefined' ? false : readOpen(),
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
    <ChatProviderShell>
      <button
        type='button'
        className='aegis-ai-dock-toggle'
        onClick={toggle}
        aria-label='Toggle AI assistant'
        aria-pressed={open}
        title='AI assistant (Ctrl/Cmd+K)'
        style={{
          font: 'var(--text-caption)',
          color: open ? 'var(--text-on-inverted)' : 'var(--text-secondary)',
          background: open ? 'var(--bg-inverted)' : 'transparent',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-1) var(--space-3)',
          cursor: 'pointer',
        }}
      >
        AI
      </button>
      <ThemeToggle />
      <AiDock open={open} onClose={close} />
    </ChatProviderShell>
  );
}

export default AiDockHost;
