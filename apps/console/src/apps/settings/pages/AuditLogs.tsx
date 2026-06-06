import { useCallback, useEffect, useMemo, useState } from 'react';

import { ReloadOutlined } from '@ant-design/icons';
import {
  Avatar,
  Chip,
  DataTable,
  type DataTableColumn,
  ErrorState,
  MonoValue,
  PageHeader,
  Panel,
} from '@lincyaw/aegis-ui';
import { Button, DatePicker, Input, Pagination, Select } from 'antd';
import type { Dayjs } from 'dayjs';

import { errMsg } from '../../../api/apiClient';
import { type AuditLog, listAuditLogs } from '../../../api/auditClient';

import './AuditLogs.css';

const PAGE_SIZE = 20;


function actorOf(l: AuditLog): string {
  return l.username || (l.user_id ? `user:${String(l.user_id)}` : 'system');
}

function resourceOf(l: AuditLog): string {
  if (!l.resource) {
    return l.resource_id ? `#${String(l.resource_id)}` : '—';
  }
  return l.resource_id ? `${l.resource}:${String(l.resource_id)}` : l.resource;
}

function statusTone(status: string): 'default' | 'ghost' | 'warning' {
  const s = status.toLowerCase();
  if (s === 'failed' || s === 'error' || s === 'denied') {
    return 'warning';
  }
  if (s === 'success' || s === 'ok') {
    return 'ghost';
  }
  return 'default';
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAuditLogs({ page, size: PAGE_SIZE });
      setLogs(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const actorOptions = useMemo(() => {
    const set = new Set(logs.map(actorOf));
    return [
      { value: 'all', label: 'All actors' },
      ...Array.from(set).map((a) => ({ value: a, label: a })),
    ];
  }, [logs]);

  const actionOptions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action));
    return [
      { value: 'all', label: 'All actions' },
      ...Array.from(set)
        .sort()
        .map((a) => ({ value: a, label: a })),
    ];
  }, [logs]);

  const filtered = logs.filter((l) => {
    if (actorFilter !== 'all' && actorOf(l) !== actorFilter) {
      return false;
    }
    if (actionFilter !== 'all' && l.action !== actionFilter) {
      return false;
    }
    if (
      search &&
      !`${actorOf(l)} ${l.action} ${resourceOf(l)} ${l.ip_address}`
        .toLowerCase()
        .includes(search.toLowerCase())
    ) {
      return false;
    }
    if (range?.[0] && range[1]) {
      const ts = new Date(l.created_at).getTime();
      if (ts < range[0].startOf('day').valueOf()) {
        return false;
      }
      if (ts > range[1].endOf('day').valueOf()) {
        return false;
      }
    }
    return true;
  });

  const columns: Array<DataTableColumn<AuditLog>> = [
    {
      key: 'ts',
      header: 'Timestamp',
      width: '180px',
      render: (l) => (
        <MonoValue size='sm'>{new Date(l.created_at).toLocaleString()}</MonoValue>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (l) => (
        <div className='audit-page__actor'>
          <Avatar name={actorOf(l)} size='sm' />
          <span>{actorOf(l)}</span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (l) => <Chip tone={statusTone(l.status)}>{l.action}</Chip>,
    },
    {
      key: 'resource',
      header: 'Resource',
      render: (l) => <MonoValue size='sm'>{resourceOf(l)}</MonoValue>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (l) => <span>{l.status || l.state}</span>,
    },
    {
      key: 'ip',
      header: 'IP address',
      render: (l) => <MonoValue size='sm'>{l.ip_address || '—'}</MonoValue>,
    },
  ];

  return (
    <>
      <PageHeader
        title='Audit Logs'
        description='System activity across your workspace.'
        action={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              void refresh();
            }}
          >
            Refresh
          </Button>
        }
      />
      {error !== null ? (
        <Panel>
          <ErrorState
            title='Could not load audit logs'
            description={error}
            action={
              <Button
                onClick={() => {
                  void refresh();
                }}
              >
                Try again
              </Button>
            }
          />
        </Panel>
      ) : (
        <Panel padded={false}>
          <div className='audit-page__filters'>
            <DatePicker.RangePicker
              value={range as [Dayjs, Dayjs] | null}
              onChange={(v) => {
                setRange(v as [Dayjs | null, Dayjs | null] | null);
              }}
              className='audit-page__range'
            />
            <Select
              value={actorFilter}
              onChange={setActorFilter}
              options={actorOptions}
              className='audit-page__select'
              showSearch
              optionFilterProp='label'
            />
            <Select
              value={actionFilter}
              onChange={setActionFilter}
              options={actionOptions}
              className='audit-page__select'
              showSearch
              optionFilterProp='label'
            />
            <Input.Search
              allowClear
              placeholder='Search resource, IP, or text'
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              className='audit-page__search'
            />
          </div>
          <DataTable<AuditLog>
            columns={columns}
            data={filtered}
            rowKey={(l) => l.id.toString()}
            loading={loading}
            emptyTitle='No matching events'
            emptyDescription='Try widening the time range or clearing filters.'
          />
          {total > PAGE_SIZE ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: 'var(--space-3)',
              }}
            >
              <Pagination
                current={page}
                pageSize={PAGE_SIZE}
                total={total}
                showSizeChanger={false}
                onChange={setPage}
              />
            </div>
          ) : null}
        </Panel>
      )}
    </>
  );
}
