import { Chip, MetricLabel, MonoValue, TimeDisplay } from '@lincyaw/aegis-ui';

import type { CaseMeta } from '../schemas';

import './CaseMetaBar.css';

interface CaseMetaBarProps {
  meta: CaseMeta;
}

function nsToIso(ns: number): string | null {
  if (!ns) return null;
  return new Date(Math.round(ns / 1_000_000)).toISOString();
}

export function CaseMetaBar({ meta }: CaseMetaBarProps) {
  const started = nsToIso(meta.started_at_ns);
  const ended = nsToIso(meta.ended_at_ns);

  return (
    <div className='llmh-case-meta'>
      <div className='llmh-case-meta__chips'>
        <MonoValue size='sm'>{meta.case_id}</MonoValue>
        {meta.sample_id && meta.sample_id !== meta.case_id && (
          <Chip tone='ink'>sample {meta.sample_id}</Chip>
        )}
        {meta.dataset_name && <Chip>{meta.dataset_name}</Chip>}
        <Chip>extractor {meta.extractor_firings}</Chip>
        <Chip>auditor {meta.auditor_firings}</Chip>
        {meta.surfaced_reminders > 0 ? (
          <Chip tone='warning'>surfaced {meta.surfaced_reminders}</Chip>
        ) : (
          <Chip tone='ghost'>silent</Chip>
        )}
      </div>
      <div className='llmh-case-meta__times'>
        {started && (
          <MetricLabel size='xs'>
            started <TimeDisplay value={started} />
          </MetricLabel>
        )}
        {ended && started !== ended && (
          <MetricLabel size='xs'>
            ended <TimeDisplay value={ended} />
          </MetricLabel>
        )}
      </div>
    </div>
  );
}
