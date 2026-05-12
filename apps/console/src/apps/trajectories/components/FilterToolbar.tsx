import type { ReactElement } from 'react';

import { Chip, MetricLabel } from '@OperationsPAI/aegis-ui';

import {
  FILTERABLE_SPAN_KINDS,
  type TrajectoriesPrefs,
} from '../prefs';
import type { SpanKind } from '../spanKind';
import './FilterToolbar.css';

interface FilterToolbarProps {
  prefs: TrajectoriesPrefs;
  toggleHiddenKind: (kind: SpanKind) => void;
  setMinDurationMs: (n: number) => void;
  setErrorsOnly: (b: boolean) => void;
  onOpenSettings: () => void;
  onShowHelp: () => void;
}

const DURATION_OPTIONS = [0, 1, 10, 100];

export function FilterToolbar({
  prefs,
  toggleHiddenKind,
  setMinDurationMs,
  setErrorsOnly,
  onOpenSettings,
  onShowHelp,
}: FilterToolbarProps): ReactElement {
  return (
    <div className='aegis-trajectories-filter'>
      <div className='aegis-trajectories-filter__group'>
        <MetricLabel size='xs'>span kinds</MetricLabel>
        <div className='aegis-trajectories-filter__chips'>
          {FILTERABLE_SPAN_KINDS.map(({ kind, label }) => {
            const hidden = prefs.hiddenSpanKinds.includes(kind);
            return (
              <Chip
                key={kind}
                tone={hidden ? 'ghost' : 'ink'}
                onClick={() => toggleHiddenKind(kind)}
              >
                {label}
              </Chip>
            );
          })}
        </div>
      </div>
      <div className='aegis-trajectories-filter__group'>
        <MetricLabel size='xs'>min duration</MetricLabel>
        <div className='aegis-trajectories-filter__chips'>
          {DURATION_OPTIONS.map((ms) => (
            <Chip
              key={ms}
              tone={ms === prefs.minDurationMs ? 'ink' : 'default'}
              onClick={() => setMinDurationMs(ms)}
            >
              {ms === 0 ? 'all' : `≥ ${ms.toString()}ms`}
            </Chip>
          ))}
        </div>
      </div>
      <div className='aegis-trajectories-filter__group'>
        <Chip
          tone={prefs.errorsOnly ? 'warning' : 'default'}
          onClick={() => setErrorsOnly(!prefs.errorsOnly)}
        >
          errors only
        </Chip>
      </div>
      <div className='aegis-trajectories-filter__spacer' />
      <button
        type='button'
        className='aegis-trajectories-filter__icon-btn'
        title='Keyboard shortcuts (?)'
        aria-label='Show keyboard shortcuts'
        onClick={onShowHelp}
      >
        ?
      </button>
      <button
        type='button'
        className='aegis-trajectories-filter__icon-btn'
        title='View settings'
        aria-label='View settings'
        onClick={onOpenSettings}
      >
        ⚙
      </button>
    </div>
  );
}

export default FilterToolbar;
