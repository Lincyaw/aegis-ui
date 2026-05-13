import { Chip, MetricLabel } from '@lincyaw/aegis-ui';

import type { FiringPhase } from '../types';

import './TurnMarker.css';

export interface TurnMarkerFiring {
  phase: FiringPhase;
  sequence: number;
  /** Auditor only — surfaced reminders get warning tone. */
  surfaced?: boolean;
}

interface TurnMarkerProps {
  turnIndex: number;
  firings: TurnMarkerFiring[];
  selected?: { phase: FiringPhase; sequence: number } | null;
  onSelect?: (phase: FiringPhase, sequence: number) => void;
}

function chipTone(f: TurnMarkerFiring, active: boolean): 'ink' | 'warning' | 'default' {
  if (active) return 'ink';
  if (f.surfaced) return 'warning';
  return 'default';
}

export function TurnMarker({
  turnIndex,
  firings,
  selected,
  onSelect,
}: TurnMarkerProps) {
  if (firings.length === 0) return null;
  return (
    <div className='llmh-turn-marker'>
      <span className='llmh-turn-marker__rule' />
      <MetricLabel size='xs'>turn {turnIndex}</MetricLabel>
      <div className='llmh-turn-marker__chips'>
        {firings.map((f) => {
          const active =
            selected?.phase === f.phase && selected.sequence === f.sequence;
          return (
            <Chip
              key={`${f.phase}-${f.sequence}`}
              tone={chipTone(f, active)}
              onClick={onSelect ? () => onSelect(f.phase, f.sequence) : undefined}
            >
              {f.phase}#{f.sequence}
              {f.surfaced ? ' ⚠' : ''}
            </Chip>
          );
        })}
      </div>
      <span className='llmh-turn-marker__rule' />
    </div>
  );
}
