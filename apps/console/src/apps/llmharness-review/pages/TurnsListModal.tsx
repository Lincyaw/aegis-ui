import { type ReactElement, useMemo } from 'react';

import { EmptyState, MetricLabel, MonoValue } from '@lincyaw/aegis-ui';

import { MessageBlocks } from '../components';
import type { CaseBundle, MainTurn } from '../schemas';

import { DetailModal } from './DetailModal';

interface TurnsListModalProps {
  open: boolean;
  turns: number[];
  bundle: CaseBundle;
  onClose: () => void;
}

export function TurnsListModal({
  open,
  turns,
  bundle,
  onClose,
}: TurnsListModalProps): ReactElement {
  const resolved = useMemo(
    () =>
      turns
        .map((idx) => bundle.main.find((t) => t.index === idx))
        .filter((t): t is MainTurn => t !== undefined),
    [turns, bundle.main]
  );
  const title =
    turns.length === 1
      ? `Source turn #${turns[0].toString()}`
      : `Source turns (${turns.length.toString()})`;
  return (
    <DetailModal title={title} open={open} onClose={onClose}>
      <div className='llmh-cdp__turns-list'>
        {resolved.length === 0 ? (
          <EmptyState
            title='No turns to show'
            description='The cited source_turns are not present in main_agent.jsonl.'
          />
        ) : (
          resolved.map((turn) => (
            <section key={turn.index} className='llmh-cdp__turns-list-item'>
              <header className='llmh-cdp__turns-list-head'>
                <MetricLabel size='xs'>Turn</MetricLabel>
                <MonoValue size='sm'>#{turn.index}</MonoValue>
                <span className='llmh-cdp__rail-row-role'>{turn.role}</span>
              </header>
              <MessageBlocks turn={turn} />
            </section>
          ))
        )}
      </div>
    </DetailModal>
  );
}
