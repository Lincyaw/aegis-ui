import { Chip, EmptyState, MetricLabel } from '@lincyaw/aegis-ui';

import type { FiringPhase, VerdictRow } from '../types';

import './VerdictsPane.css';

interface VerdictsPaneProps {
  verdicts: VerdictRow[];
  selected: { phase: FiringPhase; sequence: number } | null;
  onSelect: (phase: 'auditor', sequence: number) => void;
}

export function VerdictsPane({ verdicts, selected, onSelect }: VerdictsPaneProps) {
  if (verdicts.length === 0) {
    return <EmptyState title='No verdicts' />;
  }
  return (
    <div className='llmh-verdicts'>
      {verdicts.map((v) => {
        const active =
          selected?.phase === 'auditor' && selected.sequence === v.sequence;
        const cls = [
          'llmh-verdict',
          active ? 'llmh-verdict--active' : '',
          v.surface_reminder ? 'llmh-verdict--surfaced' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <button
            key={v.sequence}
            type='button'
            className={cls}
            onClick={() => onSelect('auditor', v.sequence)}
          >
            <Chip tone={v.surface_reminder ? 'warning' : 'ghost'}>
              {v.surface_reminder ? 'surfaced' : 'silent'}
            </Chip>
            <MetricLabel size='xs'>
              #{v.sequence} · turn {v.turn_index}
            </MetricLabel>
            {v.reminder_text && (
              <span className='llmh-verdict__text'>{v.reminder_text}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
