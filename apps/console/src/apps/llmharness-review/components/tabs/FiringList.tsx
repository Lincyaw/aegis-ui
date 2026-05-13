import { type ReactNode } from 'react';

import { Chip, EmptyState, MetricLabel } from '@lincyaw/aegis-ui';

import type { FiringPhase, FiringStatus } from '../../types';

import './FiringList.css';

export interface FiringEntry {
  phase: FiringPhase;
  sequence: number;
  turnIndex: number;
  fileName: string;
  status: FiringStatus;
  latencyMs: number;
}

interface FiringListProps {
  firings: FiringEntry[];
  selectedSequence: number | null;
  onSelect: (sequence: number) => void;
  /** Right-side adornment per row (a Chip / status). */
  renderTrailing?: (firing: FiringEntry) => ReactNode;
  /** Primary stats line under the sequence label (e.g. `events=N edges=E`). */
  renderStats?: (firing: FiringEntry) => ReactNode;
  emptyTitle?: string;
}

export function FiringList({
  firings,
  selectedSequence,
  onSelect,
  renderTrailing,
  renderStats,
  emptyTitle = 'No firings',
}: FiringListProps) {
  if (firings.length === 0) {
    return <EmptyState title={emptyTitle} />;
  }
  return (
    <div className='llmh-firing-list' role='listbox'>
      {firings.map((f) => {
        const active = selectedSequence === f.sequence;
        const cls = [
          'llmh-firing-list__row',
          active ? 'llmh-firing-list__row--active' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <div
            key={`${f.phase}-${f.sequence}`}
            className={cls}
            role='option'
            aria-selected={active}
            tabIndex={0}
            onClick={() => {
              onSelect(f.sequence);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(f.sequence);
              }
            }}
          >
            <div className='llmh-firing-list__head'>
              <span className='llmh-firing-list__seq'>#{f.sequence}</span>
              <MetricLabel size='xs'>turn {f.turnIndex}</MetricLabel>
              <span className='llmh-firing-list__spacer' />
              {renderTrailing ? (
                renderTrailing(f)
              ) : (
                <Chip tone={f.status === 'ok' ? 'ghost' : 'warning'}>{f.status}</Chip>
              )}
            </div>
            {renderStats && <div className='llmh-firing-list__stats'>{renderStats(f)}</div>}
          </div>
        );
      })}
    </div>
  );
}
