import { Button, DropdownMenu, type DropdownItem } from '@lincyaw/aegis-ui';

import type { RefreshInterval } from './refresh-interval';

interface RefreshControlProps {
  value: RefreshInterval;
  onChange: (next: RefreshInterval) => void;
  onRefresh: () => void;
  isFetching?: boolean;
  /** True while the backing resource is in an active/streaming state. */
  isLive?: boolean;
}

const OPTIONS: Array<{ key: RefreshInterval; label: string }> = [
  { key: 'manual', label: 'Manual only' },
  { key: 2, label: 'Every 2s' },
  { key: 5, label: 'Every 5s' },
  { key: 10, label: 'Every 10s' },
  { key: 30, label: 'Every 30s' },
  { key: 60, label: 'Every 60s' },
];

function labelFor(v: RefreshInterval): string {
  return v === 'manual' ? 'Manual' : `${String(v)}s`;
}

export function RefreshControl({
  value,
  onChange,
  onRefresh,
  isFetching = false,
  isLive = false,
}: RefreshControlProps) {
  const items: DropdownItem[] = OPTIONS.map((opt) => ({
    key: String(opt.key),
    label: opt.key === value ? `${opt.label} ✓` : opt.label,
    onClick: () => {
      onChange(opt.key);
    },
  }));

  const triggerLabel = isLive ? `${labelFor(value)} · live` : labelFor(value);

  return (
    <div className='page-action-row'>
      <DropdownMenu
        align='right'
        trigger={<Button tone='secondary'>{`Refresh: ${triggerLabel}`}</Button>}
        items={items}
      />
      <Button
        tone='secondary'
        disabled={isFetching}
        onClick={onRefresh}
      >
        {isFetching ? 'Refreshing…' : 'Refresh now'}
      </Button>
    </div>
  );
}
