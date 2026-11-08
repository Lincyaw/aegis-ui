import { type ReactElement } from 'react';

import { Chip, EmptyState, MetricLabel } from '@lincyaw/aegis-ui';

import type { CaseBundle } from '../schemas';
import { type CaseSelection, useCaseSelection } from '../selection';

interface FindingDetailProps {
  bundle: CaseBundle;
  findingId: NonNullable<CaseSelection['findingId']>;
}

/** One auditor finding: its summary and the events it relates to. */
export function FindingDetail({
  bundle,
  findingId,
}: FindingDetailProps): ReactElement {
  const { selection, set } = useCaseSelection();
  const clearChip = (
    <div className='llmh-insp__chip-row'>
      <Chip
        tone='ghost'
        onClick={() => {
          set({ findingId: null });
        }}
      >
        clear finding
      </Chip>
    </div>
  );

  const aud = bundle.auditor.find((a) => a.sequence === findingId.auditorSeq);
  const finding = aud?.input.findings.find((f) => f.index === findingId.index);
  if (!aud || !finding) {
    return (
      <div className='llmh-insp'>
        <EmptyState title='Finding not found' />
        {clearChip}
      </div>
    );
  }
  return (
    <div className='llmh-insp'>
      <section className='llmh-insp__section'>
        <header className='llmh-insp__sec-head'>
          <span>finding</span>
          <MetricLabel size='xs'>
            A#{aud.sequence} · F#{finding.index}
          </MetricLabel>
        </header>
        <div className='llmh-insp__chip-row'>
          <Chip tone='default'>{finding.kind}</Chip>
        </div>
        <div className='llmh-cdp__detail-summary'>{finding.summary}</div>
        {finding.related_event_ids.length > 0 && (
          <div className='llmh-insp__chip-row'>
            <span>related events:</span>
            {finding.related_event_ids.map((id) => (
              <Chip
                key={id}
                tone={selection.eventId === id ? 'ink' : 'default'}
                onClick={() => {
                  set({ eventId: id });
                }}
              >
                #{id}
              </Chip>
            ))}
          </div>
        )}
      </section>
      {clearChip}
    </div>
  );
}
