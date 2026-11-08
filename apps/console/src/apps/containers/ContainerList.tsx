import { type ReactElement, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Chip,
  DataTable,
  MonoValue,
  Panel,
  StatusDot,
} from '@lincyaw/aegis-ui';

import {
  type ContainerStatus,
  containerStatusTone,
  type DemoContainer,
} from './data';
import { useContainers } from './store';

const STATUS_TABS: Array<{ value: ContainerStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'running', label: 'Running' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'failed', label: 'Failed' },
];

export function ContainerList(): ReactElement {
  const { containers, query } = useContainers();
  const [statusFilter, setStatusFilter] = useState<ContainerStatus | 'all'>(
    'all'
  );

  const filtered = useMemo(() => {
    return containers.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) {
        return false;
      }
      if (query && !c.name.includes(query) && !c.image.includes(query)) {
        return false;
      }
      return true;
    });
  }, [containers, statusFilter, query]);

  return (
    <Panel>
      <div className='containers-list__filters'>
        {STATUS_TABS.map((tab) => (
          <Chip
            key={tab.value}
            tone={tab.value === statusFilter ? 'ink' : 'ghost'}
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
          </Chip>
        ))}
      </div>
      <DataTable<DemoContainer>
        framed={false}
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (row) => (
              <Link to={`./${row.id}`} className='containers-list__link'>
                {row.name}
              </Link>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <span className='containers-status'>
                <StatusDot tone={containerStatusTone(row.status)} />
                <span>{row.status}</span>
              </span>
            ),
          },
          {
            key: 'image',
            header: 'Image',
            render: (row) => <MonoValue size='sm'>{row.image}</MonoValue>,
          },
          {
            key: 'cpu',
            header: 'CPU',
            numeric: true,
            render: (row) => `${(row.cpu * 100).toFixed(0)}%`,
          },
          {
            key: 'mem',
            header: 'Memory',
            numeric: true,
            render: (row) => (row.memMb === 0 ? '—' : `${row.memMb} MB`),
          },
        ]}
        data={filtered}
        rowKey={(row) => row.id}
        emptyTitle='No containers'
        emptyDescription='Nothing matches the current filter.'
      />
    </Panel>
  );
}
