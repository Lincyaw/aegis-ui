import type { ReactElement } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import {
  Chip,
  DangerZone,
  KeyValueList,
  MonoValue,
  PageHeader,
  Panel,
  StatusDot,
} from '@lincyaw/aegis-ui';
import { Button } from 'antd';

import { containerStatusTone } from './data';
import { useContainers } from './store';

export function ContainerDetail(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const { containers, removeContainer } = useContainers();
  const navigate = useNavigate();
  const container = containers.find((c) => c.id === id);

  if (!container) {
    return <Navigate to='..' replace />;
  }

  return (
    <>
      <PageHeader
        title={container.name}
        description={`Container ${container.id}`}
        action={<Link to='..'>← Back to list</Link>}
      />

      <Panel title='Runtime'>
        <KeyValueList
          items={[
            {
              k: 'status',
              v: (
                <span className='containers-status'>
                  <StatusDot tone={containerStatusTone(container.status)} />
                  <Chip tone='ghost'>{container.status}</Chip>
                </span>
              ),
            },
            {
              k: 'image',
              v: <MonoValue size='sm'>{container.image}</MonoValue>,
            },
            {
              k: 'cpu',
              v: `${(container.cpu * 100).toFixed(0)}%`,
            },
            {
              k: 'mem',
              v: container.memMb === 0 ? '—' : `${container.memMb} MB`,
            },
            {
              k: 'createdAt',
              v: new Date(container.createdAt).toLocaleString(),
            },
          ]}
        />
      </Panel>

      <DangerZone
        title='Destroy container'
        description='Removes the workload from the demo control plane. Demo-local only — no real Kubernetes call is made.'
      >
        <Button
          danger
          onClick={() => {
            removeContainer(container.id);
            navigate('..');
          }}
        >
          Destroy
        </Button>
      </DangerZone>
    </>
  );
}
