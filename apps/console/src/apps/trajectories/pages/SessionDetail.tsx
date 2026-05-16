import { type ReactElement } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  Chip,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
} from '@lincyaw/aegis-ui';

import { useCompareList } from '../compareList';
import { TrajectoryWorkspace } from '../components/TrajectoryWorkspace';

import './SessionDetail.css';

export function SessionDetail(): ReactElement {
  const { rootSessionId } = useParams<{ rootSessionId: string }>();
  const { pinned, toggle } = useCompareList();

  if (!rootSessionId) {
    return <Panel title={<PanelTitle>Missing root session id</PanelTitle>} />;
  }

  const isPinned = pinned.includes(rootSessionId);

  return (
    <div className='trajectories-detail'>
      <Panel
        title={
          <PanelTitle size='lg'>
            <Link to='..' style={{ color: 'inherit', textDecoration: 'none' }}>
              ← Sessions
            </Link>
          </PanelTitle>
        }
        extra={
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              alignItems: 'center',
            }}
          >
            <MonoValue size='sm'>{rootSessionId.slice(0, 16)}…</MonoValue>
            <Chip
              tone={isPinned ? 'ink' : 'default'}
              onClick={() => toggle(rootSessionId)}
            >
              {isPinned ? '★ pinned' : '☆ pin to compare'}
            </Chip>
            {pinned.length === 2 && (
              <Link to='/trajectories/compare'>
                <Chip tone='warning'>compare 2 →</Chip>
              </Link>
            )}
            <MetricLabel>{pinned.length}/2 pinned</MetricLabel>
          </div>
        }
      />
      <TrajectoryWorkspace rootSessionId={rootSessionId} urlSync />
    </div>
  );
}

export default SessionDetail;
