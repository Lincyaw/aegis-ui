import { Link, useParams } from 'react-router-dom';

import {
  Breadcrumb,
  Chip,
  EmptyState,
  KeyValueList,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  type TrajectoryStepData,
  TrajectoryTimeline,
  TraceTree,
  type TraceSpan,
  useAppHref,
} from '@lincyaw/aegis-ui';

import { useMockStore } from '../mocks';

function buildMockSpans(traceId: string): TraceSpan[] {
  return [
    { id: `${traceId}-root`, name: 'GET /products', startMs: 0, durationMs: 2840, status: 'error', kind: 'http' },
    {
      id: `${traceId}-svc`,
      parentId: `${traceId}-root`,
      name: 'catalog.getProducts()',
      startMs: 8,
      durationMs: 2820,
      status: 'ok',
      kind: 'rpc',
    },
    {
      id: `${traceId}-db`,
      parentId: `${traceId}-svc`,
      name: 'SELECT * FROM inventory',
      startMs: 14,
      durationMs: 2612,
      status: 'error',
      kind: 'db',
    },
    {
      id: `${traceId}-cache`,
      parentId: `${traceId}-svc`,
      name: 'redis.GET sku:cache',
      startMs: 2628,
      durationMs: 12,
      status: 'ok',
      kind: 'cache',
    },
  ];
}

export default function EvalCaseDetail() {
  const { runId, caseId } = useParams<{ runId: string; caseId: string }>();
  const href = useAppHref();

  const ec = useMockStore((s) => s.evalCases.find((c) => c.id === caseId));
  const run = useMockStore((s) => s.evalRuns.find((r) => r.id === runId));

  if (!ec || !run) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Case not found' />
        <Panel>
          <EmptyState title='Not found' description='Eval case may have been removed.' />
        </Panel>
      </div>
    );
  }

  const trajectory: TrajectoryStepData[] = ec.trajectory.map((t) => ({
    step: t.step,
    timestamp: t.timestamp,
    actionType: t.actionType,
    action: t.action,
    thought: t.thought,
    observation: t.observation,
  }));

  return (
    <div className='page-wrapper'>
      <Breadcrumb
        items={[
          { label: 'Eval runs', to: href('eval') },
          { label: run.id, to: href(`eval/${run.id}`) },
          { label: ec.id },
        ]}
      />

      <PageHeader
        title={`Case ${ec.id}`}
        description={`${ec.tier} · ${ec.pattern}`}
        action={
          <Chip tone={ec.passed ? 'ink' : 'warning'}>
            {ec.passed ? 'pass' : 'fail'} · score {ec.score.toFixed(2)}
          </Chip>
        }
      />

      <Panel title={<PanelTitle size='base'>Provenance</PanelTitle>}>
        <KeyValueList
          items={[
            {
              k: 'injection',
              v: (
                <Link to={href(`projects/proj-catalog/injections/${ec.injectionId}`)}>
                  <MonoValue size='sm'>{ec.injectionId}</MonoValue>
                </Link>
              ),
            },
            {
              k: 'trace',
              v: (
                <Link
                  to={href(
                    `projects/proj-catalog/traces/${ec.traceId}?from=eval&runId=${run.id}&caseId=${ec.id}`,
                  )}
                >
                  <MonoValue size='sm'>{ec.traceId}</MonoValue>
                </Link>
              ),
            },
            { k: 'tier', v: ec.tier },
            { k: 'pattern', v: <MonoValue size='sm'>{ec.pattern}</MonoValue> },
          ]}
        />
      </Panel>

      <div className='page-split'>
        <Panel title={<PanelTitle size='base'>Trace</PanelTitle>}>
          <TraceTree spans={buildMockSpans(ec.traceId)} />
        </Panel>
        <Panel title={<PanelTitle size='base'>Agent trajectory</PanelTitle>}>
          <TrajectoryTimeline
            agentName={run.model}
            status={ec.passed ? 'completed' : 'failed'}
            totalDurationMs={5000}
            steps={trajectory}
          />
        </Panel>
      </div>
    </div>
  );
}
