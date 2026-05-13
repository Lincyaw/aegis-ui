import { useEffect, useRef, useState } from 'react';

import { ChatMessage, EmptyState } from '@lincyaw/aegis-ui';

import type { FiringPhase, MainAgentMessage } from '../types';

import { MessageBlocks } from './MessageBlocks';
import { TurnMarker, type TurnMarkerFiring } from './TurnMarker';

import './TrajectoryPane.css';

interface TrajectoryPaneProps {
  messages: MainAgentMessage[];
  /** Firings keyed by their turn_index — TurnMarker reads this. */
  firingsByTurn: Map<number, TurnMarkerFiring[]>;
  selectedFiring: { phase: FiringPhase; sequence: number } | null;
  onSelectFiring?: (phase: FiringPhase, sequence: number) => void;
  /** When non-null, scroll the row carrying that turn index into view and
   * flash it. Re-triggers when ``scrollSignal`` changes — pass a monotonic
   * counter from the page so re-clicking the same turn re-fires. */
  scrollToTurn?: number | null;
  scrollSignal?: number;
}

function messageTurn(msg: MainAgentMessage): number | null {
  return typeof msg.index === 'number' ? msg.index : null;
}

export function TrajectoryPane({
  messages,
  firingsByTurn,
  selectedFiring,
  onSelectFiring,
  scrollToTurn,
  scrollSignal,
}: TrajectoryPaneProps) {
  const rowRefs = useRef(new Map<number, HTMLDivElement>());
  const [flashTurn, setFlashTurn] = useState<number | null>(null);

  useEffect(() => {
    if (scrollToTurn == null) return;
    const el = rowRefs.current.get(scrollToTurn);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashTurn(scrollToTurn);
    const t = window.setTimeout(() => setFlashTurn(null), 1200);
    return () => window.clearTimeout(t);
  }, [scrollToTurn, scrollSignal]);

  if (messages.length === 0) {
    return (
      <EmptyState title='No messages' description='main_agent.jsonl was empty.' />
    );
  }
  return (
    <div className='llmh-trajectory'>
      {messages.map((msg, i) => {
        const role = String(msg.role ?? 'assistant');
        const chatRole: 'user' | 'assistant' | 'system' =
          role === 'user' || role === 'system' ? role : 'assistant';
        const turn = messageTurn(msg);
        const senderName = turn !== null ? `turn ${turn} · ${role}` : role;

        // TurnMarker sits AFTER the message whose turn_index it labels.
        const markerFirings = turn !== null ? firingsByTurn.get(turn) ?? [] : [];

        return (
          <div
            key={i}
            ref={(node) => {
              if (turn === null) return;
              if (node) rowRefs.current.set(turn, node);
              else rowRefs.current.delete(turn);
            }}
            className={[
              'llmh-trajectory__row',
              flashTurn === turn ? 'llmh-trajectory__row--flash' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <ChatMessage
              role={chatRole}
              senderName={senderName}
              content={<MessageBlocks content={msg.content} />}
            />
            {markerFirings.length > 0 && turn !== null && (
              <TurnMarker
                turnIndex={turn}
                firings={markerFirings}
                selected={selectedFiring}
                onSelect={onSelectFiring}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
