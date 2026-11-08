import { Button, Select } from '@lincyaw/aegis-ui';

import type { RefreshInterval } from '../api/polling';

interface RefreshControlProps {
  value: RefreshInterval;
  onChange: (next: RefreshInterval) => void;
  onRefresh: () => void;
  isFetching?: boolean;
  /** True while the watched resource is still active, so `auto` is polling. */
  isLive?: boolean;
}

const INTERVALS: RefreshInterval[] = ['auto', 'manual', 2, 5, 10, 30, 60];

function labelFor(value: RefreshInterval, isLive: boolean): string {
  if (value === 'auto') {
    return isLive ? 'Auto (live)' : 'Auto (stopped)';
  }
  return value === 'manual' ? 'Manual only' : `Every ${String(value)}s`;
}

export function RefreshControl({
  value,
  onChange,
  onRefresh,
  isFetching = false,
  isLive = false,
}: RefreshControlProps) {
  return (
    <div className='page-action-row'>
      <Select
        ariaLabel='Refresh'
        value={String(value)}
        options={INTERVALS.map((interval) => ({
          value: String(interval),
          label: labelFor(interval, isLive),
        }))}
        onChange={(next) => {
          const interval = INTERVALS.find((i) => String(i) === next);
          if (interval !== undefined) {
            onChange(interval);
          }
        }}
      />
      <Button tone='secondary' disabled={isFetching} onClick={onRefresh}>
        {isFetching ? 'Refreshing…' : 'Refresh now'}
      </Button>
    </div>
  );
}
