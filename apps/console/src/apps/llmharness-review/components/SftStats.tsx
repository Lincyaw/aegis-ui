import { Chip, KeyValueList, MetricLabel } from '@lincyaw/aegis-ui';

import type { DroppedRow, SftRowBase } from '../schemas';

import './SftStats.css';

interface SftStatsProps {
  extractor: SftRowBase[];
  auditor: SftRowBase[];
  dropped: DroppedRow[];
}

function uniqueSamples(rows: Array<{ sample_id?: string }>): number {
  const set = new Set<string>();
  for (const r of rows) {
    if (r.sample_id) set.add(r.sample_id);
  }
  return set.size;
}

function surfacedCount(rows: SftRowBase[]): number {
  let n = 0;
  for (const r of rows) {
    const call = r.target.tool_calls[0];
    if (!call) continue;
    const v = (call.arguments as { verdict?: { surface_reminder?: boolean } })
      .verdict;
    if (v?.surface_reminder) n += 1;
  }
  return n;
}

export function SftStats({ extractor, auditor, dropped }: SftStatsProps) {
  const auditorSurfaced = surfacedCount(auditor);
  const auditorSilent = auditor.length - auditorSurfaced;

  return (
    <div className='llmh-sft-stats'>
      <KeyValueList
        items={[
          {
            k: 'extractor',
            v: (
              <span>
                <strong>{extractor.length}</strong>{' '}
                <MetricLabel size='xs'>
                  rows · {uniqueSamples(extractor)} samples
                </MetricLabel>
              </span>
            ),
          },
          {
            k: 'auditor',
            v: (
              <span>
                <strong>{auditor.length}</strong>{' '}
                <MetricLabel size='xs'>
                  rows · {uniqueSamples(auditor)} samples
                </MetricLabel>{' '}
                <Chip tone='warning'>surfaced {auditorSurfaced}</Chip>{' '}
                <Chip tone='ghost'>silent {auditorSilent}</Chip>
              </span>
            ),
          },
          {
            k: 'dropped',
            v: (
              <span>
                <strong>{dropped.length}</strong>{' '}
                <MetricLabel size='xs'>
                  rows (audit-only; not in training)
                </MetricLabel>
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
