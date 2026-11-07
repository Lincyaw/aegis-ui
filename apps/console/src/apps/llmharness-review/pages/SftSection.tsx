import { type ReactElement, useState } from 'react';

import {
  Collapse,
  EmptyState,
  ErrorState,
  MetricLabel,
  SkeletonText,
  Tabs,
} from '@lincyaw/aegis-ui';
import { useQuery } from '@tanstack/react-query';

import { errMsg } from '../../../api/apiClient';
import { SftRowDetail } from '../components';
import { llmhKeys } from '../queries';
import type { CaseRepo, CaseSftBundle } from '../repo';
import type { SftRow } from '../schemas';

type SftTab = 'extractor' | 'auditor' | 'dropped';

const SECTION_KEY = 'sft';

interface SftSectionProps {
  repo: CaseRepo;
  caseId: string;
  rootSessionId: string;
}

function SftRows({ sft }: { sft: CaseSftBundle }): ReactElement {
  const [tab, setTab] = useState<SftTab>('extractor');
  const [selected, setSelected] = useState<SftRow | null>(null);
  const rows = tab === 'dropped' ? [] : sft[tab];
  return (
    <Tabs
      items={[
        {
          key: 'extractor',
          label: `extractor (${sft.extractor.length.toString()})`,
        },
        {
          key: 'auditor',
          label: `auditor (${sft.auditor.length.toString()})`,
        },
        {
          key: 'dropped',
          label: `dropped (${sft.dropped.length.toString()})`,
        },
      ]}
      activeKey={tab}
      onChange={(key) => {
        setTab(key as SftTab);
        setSelected(null);
      }}
    >
      {tab === 'dropped' ? (
        <pre className='llmh-cdp__pre'>
          {JSON.stringify(sft.dropped, null, 2)}
        </pre>
      ) : (
        <div className='llmh-cdp__sft-rows'>
          <div className='llmh-cdp__sft-list'>
            {rows.map((r) => (
              <button
                key={`${r.root_session_id}#${r.turn_index.toString()}#${r.sequence?.toString() ?? ''}`}
                type='button'
                className='llmh-cdp__sft-row-btn'
                onClick={() => {
                  setSelected(r);
                }}
              >
                turn {r.turn_index}
                {r.sequence !== undefined && (
                  <MetricLabel size='xs'>Seq {r.sequence}</MetricLabel>
                )}
              </button>
            ))}
          </div>
          <div>
            {selected ? (
              <SftRowDetail row={selected} />
            ) : (
              <EmptyState title='Pick a row' />
            )}
          </div>
        </div>
      )}
    </Tabs>
  );
}

/** The case's SFT export, read the first time the section is opened. */
export function SftSection({
  repo,
  caseId,
  rootSessionId,
}: SftSectionProps): ReactElement {
  const [open, setOpen] = useState<string[]>([]);
  const load = useQuery({
    queryKey: llmhKeys.caseSft(repo, caseId),
    queryFn: () => repo.loadSftForCase(caseId, rootSessionId),
    enabled: open.includes(SECTION_KEY),
    retry: false,
  });
  const sft = load.data ?? null;
  const counts =
    sft !== null
      ? `${sft.extractor.length.toString()} ext · ${sft.auditor.length.toString()} aud · ${sft.dropped.length.toString()} dropped`
      : '—';

  return (
    <div className='llmh-cdp__sft'>
      <Collapse
        activeKeys={open}
        onChange={setOpen}
        items={[
          {
            key: SECTION_KEY,
            label: (
              <span className='llmh-cdp__sft-label'>
                SFT export
                <MetricLabel size='xs'>{counts}</MetricLabel>
              </span>
            ),
            children: load.isError ? (
              <ErrorState
                size='compact'
                title='Failed to load SFT'
                description={errMsg(load.error)}
              />
            ) : load.isPending ? (
              <SkeletonText lines={3} />
            ) : sft === null ? (
              <EmptyState
                title='SFT not available'
                description='No sft/ directory or endpoint found for this case.'
              />
            ) : (
              <SftRows sft={sft} />
            ),
          },
        ]}
      />
    </div>
  );
}
