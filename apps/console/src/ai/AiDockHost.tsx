import { type ReactElement, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { Button, useAgentChat } from '@lincyaw/aegis-ui';

import { AiDock } from './AiDock';

/**
 * The header's AI toggle and the dock it opens, both driven by the open
 * state `AgentmChatProvider` serves through `useAgentChat`. Focus moves
 * into the composer when the dock opens and back to the toggle when it
 * closes with focus inside.
 */
export function AiDockHost(): ReactElement {
  const { panelOpen = false, setPanelOpen } = useAgentChat();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(panelOpen);

  const toggle = useCallback((): void => {
    setPanelOpen?.(!panelOpen);
  }, [panelOpen, setPanelOpen]);

  const close = useCallback((): void => {
    setPanelOpen?.(false);
  }, [setPanelOpen]);

  useEffect(() => {
    if (panelOpen === wasOpenRef.current) {
      return;
    }
    wasOpenRef.current = panelOpen;
    if (panelOpen) {
      dockRef.current?.querySelector('textarea')?.focus();
    } else if (document.activeElement === document.body) {
      // Why: the dock unmounts on close, which drops focus held inside it
      // to the body.
      toggleRef.current?.focus();
    }
  }, [panelOpen]);

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
        ref={toggleRef}
        tone='ghost'
        onClick={toggle}
        aria-label='AI assistant'
        aria-pressed={panelOpen}
        title='AI assistant (Ctrl/Cmd+K)'
      >
        AI
      </Button>
      {/* Why: the glass header's backdrop-filter is the containing block
          for fixed descendants, which would clip the dock to the header. */}
      {createPortal(
        <AiDock open={panelOpen} onClose={close} dockRef={dockRef} />,
        document.body
      )}
    </>
  );
}

export default AiDockHost;
