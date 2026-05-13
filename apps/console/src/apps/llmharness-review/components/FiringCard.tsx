import { Chip, MetricLabel } from '@lincyaw/aegis-ui';

import type { FiringPhase, FiringStatus } from '../types';

import './FiringCard.css';

interface FiringCardProps {
  phase: FiringPhase;
  sequence: number;
  turnIndex: number;
  status: FiringStatus;
  latencyMs: number;
  summary: string;
  /** Verdict colouring (auditor only): surfaced reminder = anomaly-red. */
  surfaced?: boolean;
  active?: boolean;
  onClick?: () => void;
  /** Reverse jump: open the left trajectory pane at this turn. */
  onJumpToTurn?: (turnIndex: number) => void;
}

const PHASE_TONE: Record<FiringPhase, 'ink' | 'ghost'> = {
  extractor: 'ink',
  auditor: 'ghost',
};

function statusTone(
  status: FiringStatus,
  surfaced: boolean,
): 'default' | 'warning' | 'ghost' {
  if (status !== 'ok') return 'warning';
  if (surfaced) return 'warning';
  return 'ghost';
}

export function FiringCard({
  phase,
  sequence,
  turnIndex,
  status,
  latencyMs,
  summary,
  surfaced = false,
  active = false,
  onClick,
  onJumpToTurn,
}: FiringCardProps) {
  const cls = [
    'aegis-firing-card',
    `aegis-firing-card--${phase}`,
    active ? 'aegis-firing-card--active' : '',
    surfaced ? 'aegis-firing-card--surfaced' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Outer is a div with role=button so the inner "jump" affordance can be
  // a real <button> without invalid nested-button HTML.
  return (
    <div
      className={cls}
      role='button'
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className='aegis-firing-card__head'>
        <Chip tone={PHASE_TONE[phase]}>{phase}</Chip>
        <span className='aegis-firing-card__seq'>#{sequence}</span>
        {onJumpToTurn ? (
          <button
            type='button'
            className='aegis-firing-card__jump'
            onClick={(e) => {
              e.stopPropagation();
              onJumpToTurn(turnIndex);
            }}
            title='Scroll trajectory to this turn'
          >
            ↗ turn {turnIndex}
          </button>
        ) : (
          <MetricLabel size='xs'>turn {turnIndex}</MetricLabel>
        )}
        <span className='aegis-firing-card__spacer' />
        <Chip tone={statusTone(status, surfaced)}>{surfaced ? 'surfaced' : status}</Chip>
      </div>
      <div className='aegis-firing-card__body'>{summary}</div>
      <div className='aegis-firing-card__foot'>
        <MetricLabel size='xs'>{latencyMs}ms</MetricLabel>
      </div>
    </div>
  );
}
