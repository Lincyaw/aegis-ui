import { Chip, StatusDot } from '@lincyaw/aegis-ui';

import { type StatusTone, toneFor } from '../domain/status';

type ChipTone = 'default' | 'warning' | 'caution' | 'success' | 'ghost';
type DotTone = 'ink' | 'warning' | 'caution' | 'muted' | 'success';

const CHIP_TONE: Record<StatusTone, ChipTone> = {
  failure: 'warning',
  caution: 'caution',
  active: 'default',
  success: 'success',
  neutral: 'ghost',
};

const DOT_TONE: Record<StatusTone, DotTone> = {
  failure: 'warning',
  caution: 'caution',
  active: 'ink',
  success: 'success',
  neutral: 'muted',
};

interface StatusChipProps {
  status: string | undefined;
}

export function StatusChip({ status }: StatusChipProps) {
  const tone = toneFor(status);
  return (
    <Chip
      tone={CHIP_TONE[tone]}
      leading={<StatusDot tone={DOT_TONE[tone]} pulse={tone === 'active'} />}
    >
      {status ?? 'unknown'}
    </Chip>
  );
}
