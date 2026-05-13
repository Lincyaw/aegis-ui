import { type ReactElement, useCallback, useEffect, useState } from 'react';

import { ThemeToggle } from '@lincyaw/aegis-ui';

import { AiDock } from './AiDock';

// main.tsx always mounts AgentmChannelProvider (with a localhost default
// when VITE_AGENTM_GATEWAY_URL is unset), so AgentChatProvider is no
// longer needed as the chat backend here.

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
    <>
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
    </>
  );
}

export default AiDockHost;
