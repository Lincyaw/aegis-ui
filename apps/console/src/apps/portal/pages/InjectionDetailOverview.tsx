import { useParams } from 'react-router-dom';

import {
  Button,
  Chip,
  CodeBlock,
  KeyValueList,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
  SectionDivider,
  SkeletonText,
  TimeDisplay,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { useInjectionDetail } from '../api/injections';

export default function InjectionDetailOverview() {
  const { injectionId } = useParams<{ injectionId: string }>();
  const navigate = useAppNavigate();

  const idNum = injectionId ? Number.parseInt(injectionId, 10) : Number.NaN;
  const { data: injection } = useInjectionDetail(
    Number.isNaN(idNum) ? undefined : idNum
  );

  if (!injection) {
    return (
      <Panel>
        <SkeletonText />
      </Panel>
    );
  }

  const traceId = injection.trace_id;

  return (
    <>
      <Panel title={<PanelTitle size='base'>Provenance</PanelTitle>}>
        <KeyValueList
          items={[
            {
              k: 'pedestal',
              v:
                injection.pedestal_name ?? String(injection.pedestal_id ?? '—'),
            },
            {
              k: 'benchmark',
              v:
                injection.benchmark_name ??
                String(injection.benchmark_id ?? '—'),
            },
            {
              k: 'fault type',
              v: <MonoValue size='sm'>{injection.fault_type ?? '—'}</MonoValue>,
            },
            { k: 'category', v: injection.category ?? '—' },
            {
              k: 'run id',
              v: injection.task_id ? (
                <MonoValue size='sm'>{injection.task_id}</MonoValue>
              ) : (
                '—'
              ),
            },
            {
              k: 'trace',
              v: traceId ? (
                <MonoValue size='sm'>{traceId}</MonoValue>
              ) : (
                <Chip tone='ghost'>not started</Chip>
              ),
            },
            {
              k: 'created',
              v: injection.created_at ? (
                <TimeDisplay value={injection.created_at} />
              ) : (
                '—'
              ),
            },
            {
              k: 'started',
              v: injection.start_time ? (
                <TimeDisplay value={injection.start_time} />
              ) : (
                '—'
              ),
            },
            {
              k: 'ended',
              v: injection.end_time ? (
                <TimeDisplay value={injection.end_time} />
              ) : (
                '—'
              ),
            },
          ]}
        />
      </Panel>

      {injection.display_config && (
        <Panel title={<PanelTitle size='base'>Display config</PanelTitle>}>
          <CodeBlock
            language='json'
            code={JSON.stringify(injection.display_config, null, 2)}
          />
        </Panel>
      )}

      {injection.engine_config && injection.engine_config.length > 0 && (
        <Panel title={<PanelTitle size='base'>Engine config</PanelTitle>}>
          <CodeBlock
            language='json'
            code={JSON.stringify(injection.engine_config, null, 2)}
          />
        </Panel>
      )}

      <SectionDivider>Actions</SectionDivider>
      <div className='page-action-row'>
        <Button
          tone='primary'
          disabled={!traceId}
          onClick={() => {
            if (typeof injection.id === 'number') {
              navigate(`injections/${String(injection.id)}/data`);
            }
          }}
        >
          Browse data
        </Button>
      </div>

      <Panel>
        <MetricLabel>
          Status refreshes every 3s while the injection is active.
        </MetricLabel>
      </Panel>
    </>
  );
}
