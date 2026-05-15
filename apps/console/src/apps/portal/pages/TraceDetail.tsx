import { Link, useParams, useSearchParams } from 'react-router-dom';

import {
  Chip,
  EmptyState,
  KeyValueList,
  MetricCard,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  SectionDivider,
  TimeDisplay,
  TraceTree,
  type TraceSpan,
  useAppHref,
} from '@lincyaw/aegis-ui';

import { useMockStore } from '../mocks';

function buildSpans(traceId: string, root: string): TraceSpan[] {
  return [
    { id: `${traceId}-root`, name: root, startMs: 0, durationMs: 2840, status: 'error', kind: 'http' },
    { id: `${traceId}-svc`, parentId: `${traceId}-root`, name: 'service.handler', startMs: 8, durationMs: 2820, status: 'ok', kind: 'rpc' },
    { id: `${traceId}-db`, parentId: `${traceId}-svc`, name: 'db.query', startMs: 14, durationMs: 2612, status: 'error', kind: 'db' },
    { id: `${traceId}-cache`, parentId: `${traceId}-svc`, name: 'redis.GET', startMs: 2628, durationMs: 12, status: 'ok', kind: 'cache' },
  ];
}

export default function TraceDetail() {
  const { projectId, traceId } = useParams<{
    projectId: string;
    traceId: string;
  }>();
  const [params] = useSearchParams();
  const href = useAppHref();

  const trace = useMockStore((s) => s.traces.find((t) => t.id === traceId));
  const injection = useMockStore((s) =>
    s.injections.find((i) => i.id === trace?.injectionId),
  );

  const fromCtx = params.get('from');
  const fromRunId = params.get('runId');
  const fromCaseId = params.get('caseId');

  if (!trace) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={`Trace ${traceId ?? ''}`} />
        <Panel>
          <EmptyState
            title='Trace not found'
            description='It may have been removed or never landed.'
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Trace ${trace.id}`}
        description={trace.rootOperation}
        action={<Chip tone='ghost'>{trace.spanCount} spans</Chip>}
      />

      {fromCtx === 'eval' && fromRunId && fromCaseId && (
        <Panel>
          <Link to={href(`eval/${fromRunId}/cases/${fromCaseId}`)}>
            ← Eval run {fromRunId} / case {fromCaseId}
          </Link>
        </Panel>
      )}
      {fromCtx === 'regression' && fromRunId && (
        <Panel>
          <Link to={href(`regression/${fromRunId}`)}>
            ← Regression run {fromRunId}
          </Link>
        </Panel>
      )}

      <Panel title={<PanelTitle size='base'>Provenance</PanelTitle>}>
        <KeyValueList
          items={[
            {
              k: 'project',
              v: <MonoValue size='sm'>{projectId ?? trace.projectId}</MonoValue>,
            },
            {
              k: 'originating injection',
              v: injection ? (
                <Link to={href(`projects/${trace.projectId}/injections/${injection.id}`)}>
                  {injection.id}
                </Link>
              ) : (
                '—'
              ),
            },
            { k: 'started', v: <TimeDisplay value={trace.startedAt} /> },
          ]}
        />
      </Panel>

      <div className='page-overview-grid'>
        <MetricCard label='Duration' value={`${trace.durationMs} ms`} />
        <MetricCard label='Spans' value={trace.spanCount} />
        <MetricCard label='Status' value={<Chip tone='warning'>contains error</Chip>} />
        <MetricCard label='Root op' value={<MonoValue size='sm'>{trace.rootOperation}</MonoValue>} />
      </div>

      <SectionDivider>Span tree</SectionDivider>
      <Panel>
        <TraceTree spans={buildSpans(trace.id, trace.rootOperation)} />
      </Panel>
    </div>
  );
}
