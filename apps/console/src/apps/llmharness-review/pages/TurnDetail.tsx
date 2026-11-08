import { type ReactElement } from 'react';

import { Chip, EmptyState, MetricLabel, MonoValue } from '@lincyaw/aegis-ui';

import { MessageBlocks } from '../components';
import type { CaseBundle } from '../schemas';
import { useCaseSelection } from '../selection';

interface TurnDetailProps {
  bundle: CaseBundle;
  turnIndex: number;
}

/** One main-agent turn: its message, the firings that cite it, and steps to
 *  the turns either side. */
export function TurnDetail({
  bundle,
  turnIndex,
}: TurnDetailProps): ReactElement {
  const { selection, set } = useCaseSelection();
  const clearChip = (
    <div className='llmh-insp__chip-row'>
      <Chip
        tone='ghost'
        onClick={() => {
          set({ turn: null });
        }}
      >
        clear turn
      </Chip>
    </div>
  );

  const turn = bundle.main.find((t) => t.index === turnIndex);
  if (!turn) {
    return (
      <div className='llmh-insp'>
        <EmptyState title={`Turn #${turnIndex.toString()} not found`} />
        {clearChip}
      </div>
    );
  }
  const ext = bundle.links.turnToExtractor.get(turn.index) ?? [];
  const aud = bundle.links.turnToAuditor.get(turn.index) ?? [];
  const turnIdx = bundle.main.findIndex((t) => t.index === turn.index);
  const prevTurn = turnIdx > 0 ? bundle.main[turnIdx - 1] : undefined;
  const nextTurn =
    turnIdx >= 0 && turnIdx < bundle.main.length - 1
      ? bundle.main[turnIdx + 1]
      : undefined;
  return (
    <div className='llmh-insp'>
      <div className='llmh-insp__sticky-head'>
        <div className='llmh-insp__sticky-title'>
          <MetricLabel size='xs'>Turn</MetricLabel>
          <MonoValue size='sm'>#{turn.index}</MonoValue>
          <span className='llmh-cdp__rail-row-role'>{turn.role}</span>
          <MetricLabel size='xs'>
            {turnIdx + 1} / {bundle.main.length}
          </MetricLabel>
        </div>
        <div className='llmh-insp__sticky-nav'>
          <Chip
            tone='default'
            onClick={() => {
              if (prevTurn) {
                set({
                  turn: prevTurn.index,
                  mode: null,
                  extractorSeq: null,
                  auditorSeq: null,
                  eventId: null,
                  findingId: null,
                });
              }
            }}
          >
            ← {prevTurn ? `#${prevTurn.index.toString()}` : 'prev'}
          </Chip>
          <Chip
            tone='default'
            onClick={() => {
              if (nextTurn) {
                set({
                  turn: nextTurn.index,
                  mode: null,
                  extractorSeq: null,
                  auditorSeq: null,
                  eventId: null,
                  findingId: null,
                });
              }
            }}
          >
            {nextTurn ? `#${nextTurn.index.toString()}` : 'next'} →
          </Chip>
        </div>
      </div>
      <section className='llmh-insp__section'>
        <header className='llmh-insp__sec-head'>
          <span>turn</span>
          <MetricLabel size='xs'>
            #{turn.index} · {turn.role}
          </MetricLabel>
        </header>
        {(ext.length > 0 || aud.length > 0) && (
          <div className='llmh-insp__chip-row'>
            <span>cited by:</span>
            {ext.map((s) => (
              <Chip
                key={`e${s.toString()}`}
                tone={
                  selection.mode === 'extractor' && selection.extractorSeq === s
                    ? 'ink'
                    : 'default'
                }
                onClick={() => {
                  set({
                    mode: 'extractor',
                    extractorSeq: s,
                    auditorSeq: null,
                  });
                }}
              >
                E#{s}
              </Chip>
            ))}
            {aud.map((s) => (
              <Chip
                key={`a${s.toString()}`}
                tone={
                  selection.mode === 'auditor' && selection.auditorSeq === s
                    ? 'ink'
                    : 'default'
                }
                onClick={() => {
                  set({
                    mode: 'auditor',
                    auditorSeq: s,
                    extractorSeq: null,
                  });
                }}
              >
                A#{s}
              </Chip>
            ))}
          </div>
        )}
      </section>
      <section className='llmh-insp__section'>
        <MessageBlocks turn={turn} />
      </section>
      {clearChip}
    </div>
  );
}
