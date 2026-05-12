import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import {
  Chip,
  EmptyState,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
} from '@OperationsPAI/aegis-ui';

import { TrajectoryWorkspace } from '../components/TrajectoryWorkspace';
import { useCompareList } from '../compareList';
import './Compare.css';

export function Compare(): ReactElement {
  const { pinned, remove, clear } = useCompareList();
  const [a, b] = pinned;

  if (!a) {
    return (
      <Panel
        title={<PanelTitle size='lg'>Compare</PanelTitle>}
        extra={
          <Link to='..' style={{ color: 'inherit' }}>
            <Chip>← back to sessions</Chip>
          </Link>
        }
      >
        <EmptyState
          title='No trajectories pinned'
          description='Open a session and click ☆ pin to compare to add up to two trajectories side by side.'
        />
      </Panel>
    );
  }

  return (
    <div className='trajectories-compare'>
      <Panel
        title={<PanelTitle size='lg'>Compare</PanelTitle>}
        extra={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Link to='..' style={{ color: 'inherit', textDecoration: 'none' }}>
              <Chip>← back</Chip>
            </Link>
            <Chip tone='warning' onClick={clear}>
              clear pins
            </Chip>
          </div>
        }
      />
      <div className='trajectories-compare__split'>
        <CompareColumn rootSessionId={a} label='A' onUnpin={() => remove(a)} />
        {b ? (
          <CompareColumn
            rootSessionId={b}
            label='B'
            onUnpin={() => remove(b)}
          />
        ) : (
          <div className='trajectories-compare__empty'>
            <EmptyState
              title='Pin a second trajectory'
              description='Open another session and pin it to fill this side.'
            />
          </div>
        )}
      </div>
    </div>
  );
}

function CompareColumn({
  rootSessionId,
  label,
  onUnpin,
}: {
  rootSessionId: string;
  label: 'A' | 'B';
  onUnpin: () => void;
}): ReactElement {
  return (
    <div className='trajectories-compare__col'>
      <header className='trajectories-compare__col-header'>
        <Chip tone='ink'>{label}</Chip>
        <Link
          to={`/trajectories/${rootSessionId}`}
          style={{ color: 'inherit', textDecoration: 'none', flex: '1 1 auto' }}
        >
          <MonoValue size='sm'>{rootSessionId.slice(0, 16)}…</MonoValue>
        </Link>
        <Chip onClick={onUnpin}>unpin</Chip>
        <MetricLabel size='xs'>open ↗</MetricLabel>
      </header>
      <TrajectoryWorkspace rootSessionId={rootSessionId} urlSync={false} />
    </div>
  );
}

export default Compare;
