import { EmptyState } from '@lincyaw/aegis-ui';

import type { FiringPhase, FiringStatus, VerdictRow } from '../types';

import { FiringCard } from './FiringCard';

import './FiringsPane.css';

export interface FiringEntry {
  phase: FiringPhase;
  sequence: number;
  turnIndex: number;
  fileName: string;
  status: FiringStatus;
  latencyMs: number;
}

interface FiringsPaneProps {
  firings: FiringEntry[];
  verdicts: VerdictRow[];
  selected: { phase: FiringPhase; sequence: number } | null;
  onSelect: (phase: FiringPhase, sequence: number) => void;
  onJumpToTurn?: (turnIndex: number) => void;
}

function findVerdict(verdicts: VerdictRow[], seq: number): VerdictRow | undefined {
  return verdicts.find((v) => v.sequence === seq);
}

export function FiringsPane({
  firings,
  verdicts,
  selected,
  onSelect,
  onJumpToTurn,
}: FiringsPaneProps) {
  if (firings.length === 0) {
    return <EmptyState title='No firings' description='No extractor or auditor records.' />;
  }
  return (
    <div className='llmh-firings'>
      {firings.map((f) => {
        const verdict = f.phase === 'auditor' ? findVerdict(verdicts, f.sequence) : undefined;
        const surfaced = Boolean(verdict?.surface_reminder);
        const active =
          selected?.phase === f.phase && selected.sequence === f.sequence;
        return (
          <FiringCard
            key={`${f.phase}-${f.sequence}`}
            phase={f.phase}
            sequence={f.sequence}
            turnIndex={f.turnIndex}
            status={f.status}
            latencyMs={f.latencyMs}
            surfaced={surfaced}
            active={active}
            summary={
              f.phase === 'auditor'
                ? surfaced
                  ? `surfaced — ${verdict?.reminder_text ?? '(empty)'}`
                  : f.status === 'ok'
                    ? 'silent'
                    : f.status
                : f.status === 'ok'
                  ? f.fileName
                  : f.status
            }
            onClick={() => onSelect(f.phase, f.sequence)}
            onJumpToTurn={onJumpToTurn}
          />
        );
      })}
    </div>
  );
}
