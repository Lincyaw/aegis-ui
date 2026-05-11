import { type ReactElement, useMemo, useState } from 'react';

import { Link } from 'react-router-dom';

import { Chip } from '../../../components/ui/Chip';
import { DataTable } from '../../../components/ui/DataTable';
import { MonoValue } from '../../../components/ui/MonoValue';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Panel } from '../../../components/ui/Panel';
import { StatusDot } from '../../../components/ui/StatusDot';
import { Toolbar } from '../../../components/ui/Toolbar';
import type { ContainerStatus, DemoContainer } from './data';
import { useContainers } from './store';

const STATUS_TABS: Array<{ value: ContainerStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'running', label: 'Running' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'failed', label: 'Failed' },
];

export function ContainerList(): ReactElement {
  const { containers } = useContainers();
  const [statusFilter, setStatusFilter] = useState<ContainerStatus | 'all'>(
    'all',
  );
  const [query, setQuery] = useState('');

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
    <>
      <PageHeader
        title="Containers"
        description="Workloads currently registered with the demo control plane."
        action={
          <Link to="./new" className="aegis-shell__nav-link">
            + New container
          </Link>
        }
      />

      <Panel>
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: 'var(--space-3) var(--space-3) 0',
          }}
        >
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
        <Toolbar
          searchPlaceholder="Filter by name or image"
          searchValue={query}
          onSearchChange={setQuery}
        />
        <DataTable<DemoContainer>
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (row) => (
                <Link to={`./${row.id}`} style={{ color: 'inherit' }}>
                  {row.name}
                </Link>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <StatusDot tone={statusTone(row.status)} />
                  <span>{row.status}</span>
                </span>
              ),
            },
            {
              key: 'image',
              header: 'Image',
              render: (row) => <MonoValue size="sm">{row.image}</MonoValue>,
            },
            {
              key: 'cpu',
              header: 'CPU',
              align: 'right',
              render: (row) => `${(row.cpu * 100).toFixed(0)}%`,
            },
            {
              key: 'mem',
              header: 'Memory',
              align: 'right',
              render: (row) =>
                row.memMb === 0 ? (
                  <MonoValue size="sm">—</MonoValue>
                ) : (
                  <MonoValue size="sm">{`${row.memMb} MB`}</MonoValue>
                ),
            },
          ]}
          data={filtered}
          rowKey={(row) => row.id}
          emptyTitle="No containers"
          emptyDescription="Nothing matches the current filter."
        />
      </Panel>
    </>
  );
}

function statusTone(s: ContainerStatus): 'ink' | 'muted' | 'warning' {
  if (s === 'running') {
    return 'ink';
  }
  if (s === 'failed') {
    return 'warning';
  }
  return 'muted';
}
