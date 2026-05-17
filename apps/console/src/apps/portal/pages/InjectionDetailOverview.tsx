import { useParams } from 'react-router-dom';

import {
  Button,
  Chip,
  CodeBlock,
  EmptyState,
  KeyValueList,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
  SectionDivider,
  TimeDisplay,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { useInjectionDetail } from '../api/injections';

export default function InjectionDetailOverview() {
  const { injectionId } = useParams<{ injectionId: string }>();
  const navigate = useAppNavigate();

  const idNum = injectionId ? Number.parseInt(injectionId, 10) : Number.NaN;
  const { data: injection } = useInjectionDetail(
    Number.isNaN(idNum) ? null : idNum,
  );

  if (!injection) {
    return (
      <Panel>
        <EmptyState title='Loading…' />
      </Panel>
    );
  }

  const status = injection.status ?? injection.state ?? 'unknown';
  const traceReady = status === 'running' || status === 'completed';

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
              k: 'task',
              v: injection.task_id ? (
                <MonoValue size='sm'>{injection.task_id}</MonoValue>
              ) : (
                '—'
              ),
            },
            {
              k: 'trace',
              v:
                traceReady && injection.trace_id ? (
                  <MonoValue size='sm'>{injection.trace_id}</MonoValue>
                ) : (
                  <Chip tone='ghost'>pending</Chip>
                ),
            },
            {
              k: 'created',
              v: <TimeDisplay value={injection.created_at ?? ''} />,
            },
            {
              k: 'started',
              v: <TimeDisplay value={injection.start_time ?? ''} />,
            },
            { k: 'ended', v: <TimeDisplay value={injection.end_time ?? ''} /> },
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
          disabled={!traceReady || !injection.trace_id}
          onClick={() => {
            if (injection.trace_id && typeof injection.id === 'number') {
              navigate(
                `traces/${injection.trace_id}?injection=${String(injection.id)}`,
              );
            }
          }}
        >
          View trace
        </Button>
      </div>

      <Panel>
        <MetricLabel>
          live status — refetches every 3s while pending/running
        </MetricLabel>
      </Panel>
    </>
  );
}
