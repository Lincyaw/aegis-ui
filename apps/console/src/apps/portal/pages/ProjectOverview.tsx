import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import {
  Button,
  EmptyState,
  MetricCard,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  StatusDot,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { useMockStore } from '../mocks';

export default function ProjectOverview() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useAppNavigate();

  const project = useMockStore((s) => s.projects.find((p) => p.id === projectId));
  const injections = useMockStore((s) =>
    s.injections.filter((i) => i.projectId === projectId),
  );
  const traces = useMockStore((s) =>
    s.traces.filter((t) => t.projectId === projectId),
  );

  const running = useMemo(
    () => injections.filter((i) => i.status === 'running').length,
    [injections],
  );

  if (!project) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Project not found' />
        <Panel>
          <EmptyState
            title='Project not found'
            description='It may have been removed.'
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={project.name}
        description={project.description}
        action={
          <Button
            tone='primary'
            onClick={() => navigate(`projects/${project.id}/injections/new`)}
          >
            + Inject
          </Button>
        }
      />

      <div className='page-overview-grid'>
        <MetricCard
          label='Injections'
          value={injections.length}
          onClick={() => navigate(`projects/${project.id}/injections`)}
        />
        <MetricCard
          label='Running'
          value={running}
          unit={
            <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
              {running > 0 && <StatusDot size={6} pulse />}
              {running > 0 ? 'active' : 'idle'}
            </span>
          }
        />
        <MetricCard
          label='Traces'
          value={traces.length}
          onClick={() => navigate(`projects/${project.id}/traces`)}
        />
        <MetricCard label='Status' value={project.status} />
      </div>

      <Panel title={<PanelTitle size='base'>Recent injections</PanelTitle>}>
        {injections.length === 0 ? (
          <EmptyState
            title='No injections yet'
            description='Inject your first fault to populate this list.'
          />
        ) : (
          <div className='page-table'>
            <div className='page-table__head'>
              <span className='page-table__cell'>ID</span>
              <span className='page-table__cell'>System</span>
              <span className='page-table__cell'>Status</span>
            </div>
            {injections.slice(0, 6).map((i) => (
              <div
                key={i.id}
                className='page-table__row'
                onClick={() => navigate(`projects/${project.id}/injections/${i.id}`)}
              >
                <span className='page-table__cell'>
                  <MonoValue size='sm'>{i.id}</MonoValue>
                </span>
                <span className='page-table__cell'>
                  <MonoValue size='sm'>{i.systemCode}</MonoValue>
                </span>
                <span className='page-table__cell'>
                  <StatusDot
                    size={6}
                    pulse={i.status === 'running'}
                    tone={
                      i.status === 'failed'
                        ? 'warning'
                        : i.status === 'running' || i.status === 'completed'
                          ? 'ink'
                          : 'muted'
                    }
                  />
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
