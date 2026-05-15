import { Chip, StatusDot } from '@lincyaw/aegis-ui';

import type { EntityStatus } from '../mocks/types';

type ChipTone = 'default' | 'ink' | 'warning' | 'ghost';
type DotTone = 'ink' | 'inverted' | 'warning' | 'muted';

interface StatusChipProps {
  status: EntityStatus | string;
  pulse?: boolean;
}

const TONE_MAP: Record<string, ChipTone> = {
  pending: 'ghost',
  running: 'ink',
  restarting: 'ink',
  installing: 'ink',
  completed: 'ink',
  failed: 'warning',
  cancelled: 'ghost',
  pass: 'ink',
  fail: 'warning',
  ok: 'ink',
  warn: 'warning',
  uninstalled: 'ghost',
};

const DOT_MAP: Record<ChipTone, DotTone> = {
  ink: 'ink',
  warning: 'warning',
  ghost: 'muted',
  default: 'muted',
};

export function StatusChip({ status, pulse }: StatusChipProps) {
  const tone = TONE_MAP[status] ?? 'ghost';
  const isLive =
    status === 'running' || status === 'restarting' || status === 'installing';
  return (
    <Chip tone={tone}>
      <StatusDot size={6} pulse={pulse ?? isLive} tone={DOT_MAP[tone]} /> {status}
    </Chip>
  );
}
