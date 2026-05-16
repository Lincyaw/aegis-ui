import { useParams } from 'react-router-dom';

import {
  Button,
  Chip,
  CodeBlock,
  EmptyState,
  KeyValueList,
  MetricLabel,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  SectionDivider,
  TimeDisplay,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { useInjectionDetail } from '../api/injections';
import { StatusChip } from '../components/StatusChip';

export default function InjectionDetail() {
  const { injectionId } = useParams<{ injectionId: string }>();
  const navigate = useAppNavigate();

  const idNum = injectionId ? Number.parseInt(injectionId, 10) : Number.NaN;
  const {
    data: injection,
    isLoading,
    isError,
    error,
  } = useInjectionDetail(Number.isNaN(idNum) ? null : idNum);

  if (Number.isNaN(idNum)) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={`Injection ${injectionId ?? ''}`} />
        <Panel>
          <EmptyState
            title='Invalid injection id'
            description={injectionId ?? ''}
          />
        </Panel>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={`Injection ${idNum}`} description='Loading…' />
      </div>
    );
  }

  if (isError || !injection) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={`Injection ${idNum}`} />
        <Panel>
          <EmptyState
            title='Injection not found'
            description={
              error instanceof Error
                ? error.message
                : 'It may have been removed or never existed.'
            }
          />
        </Panel>
      </div>
    );
  }

  const status = injection.status ?? injection.state ?? 'unknown';
  const traceReady = status === 'running' || status === 'completed';

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Injection ${injection.id ?? idNum}`}
        description={injection.name}
        action={
          <div className='page-action-row'>
            <StatusChip status={status} />
          </div>
        }
      />

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
            if (injection.trace_id) {
              navigate(`traces/${injection.trace_id}`);
            }
          }}
        >
          View trace
        </Button>
        <Button tone='secondary' onClick={() => navigate('observations')}>
          View observations
        </Button>
      </div>

      <Panel>
        <MetricLabel>
          live status — refetches every 3s while pending/running
        </MetricLabel>
      </Panel>
    </div>
  );
}
