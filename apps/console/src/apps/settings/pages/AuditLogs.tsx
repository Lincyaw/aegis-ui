import { useMemo, useState } from 'react';

import { DatePicker, Input, Select } from 'antd';
import type { Dayjs } from 'dayjs';

import {
  Avatar,
  Chip,
  DataTable,
  type DataTableColumn,
  MonoValue,
  PageHeader,
  Panel,
} from '@OperationsPAI/aegis-ui';

import './AuditLogs.css';

type EventType =
  | 'user.created'
  | 'user.updated'
  | 'role.assigned'
  | 'project.deleted'
  | 'api_key.rotated'
  | 'injection.executed'
  | 'login.success'
  | 'login.failed';

interface LogEntry {
  id: string;
  timestamp: string;
  actor: string;
  event: EventType;
  resource: string;
  ip: string;
  tone: 'default' | 'ghost' | 'warning';
}

const MOCK_LOGS: LogEntry[] = [
  {
    id: 'l-1',
    timestamp: '2026-05-11 09:42:11',
    actor: 'Grace Hopper',
    event: 'user.created',
    resource: 'user:tim-bl',
    ip: '10.4.12.88',
    tone: 'default',
  },
  {
    id: 'l-2',
    timestamp: '2026-05-11 09:18:02',
    actor: 'Linus Torvalds',
    event: 'role.assigned',
    resource: 'user:ada-lovelace',
    ip: '10.4.12.91',
    tone: 'default',
  },
  {
    id: 'l-3',
    timestamp: '2026-05-11 08:55:47',
    actor: 'Ada Lovelace',
    event: 'injection.executed',
    resource: 'injection:run-7c2af',
    ip: '10.4.12.34',
    tone: 'default',
  },
  {
    id: 'l-4',
    timestamp: '2026-05-11 08:12:19',
    actor: 'Alan Turing',
    event: 'login.failed',
    resource: 'user:alan-turing',
    ip: '203.0.113.42',
    tone: 'warning',
  },
  {
    id: 'l-5',
    timestamp: '2026-05-11 08:11:55',
    actor: 'Alan Turing',
    event: 'login.success',
    resource: 'user:alan-turing',
    ip: '203.0.113.42',
    tone: 'ghost',
  },
  {
    id: 'l-6',
    timestamp: '2026-05-10 22:04:33',
    actor: 'Margaret Hamilton',
    event: 'api_key.rotated',
    resource: 'apikey:ak-prod-2',
    ip: '10.4.12.22',
    tone: 'default',
  },
  {
    id: 'l-7',
    timestamp: '2026-05-10 17:39:08',
    actor: 'Edsger Dijkstra',
    event: 'user.updated',
    resource: 'user:barbara-liskov',
    ip: '10.4.12.15',
    tone: 'default',
  },
  {
    id: 'l-8',
    timestamp: '2026-05-10 15:21:50',
    actor: 'Grace Hopper',
    event: 'project.deleted',
    resource: 'project:legacy-rca',
    ip: '10.4.12.88',
    tone: 'warning',
  },
  {
    id: 'l-9',
    timestamp: '2026-05-10 12:08:14',
    actor: 'Linus Torvalds',
    event: 'injection.executed',
    resource: 'injection:run-9d11f',
    ip: '10.4.12.91',
    tone: 'default',
  },
  {
    id: 'l-10',
    timestamp: '2026-05-09 19:55:02',
    actor: 'Donald Knuth',
    event: 'login.success',
    resource: 'user:donald-knuth',
    ip: '198.51.100.7',
    tone: 'ghost',
  },
  {
    id: 'l-11',
    timestamp: '2026-05-09 14:42:31',
    actor: 'Barbara Liskov',
    event: 'user.updated',
    resource: 'user:katherine-johnson',
    ip: '10.4.12.61',
    tone: 'default',
  },
  {
    id: 'l-12',
    timestamp: '2026-05-09 11:30:19',
    actor: 'Katherine Johnson',
    event: 'login.failed',
    resource: 'user:katherine-johnson',
    ip: '198.51.100.34',
    tone: 'warning',
  },
  {
    id: 'l-13',
    timestamp: '2026-05-08 21:14:00',
    actor: 'Ada Lovelace',
    event: 'api_key.rotated',
    resource: 'apikey:ak-staging',
    ip: '10.4.12.34',
    tone: 'default',
  },
  {
    id: 'l-14',
    timestamp: '2026-05-08 16:47:55',
    actor: 'Tim Berners-Lee',
    event: 'user.created',
    resource: 'user:hedy-lamarr',
    ip: '10.4.12.77',
    tone: 'default',
  },
  {
    id: 'l-15',
    timestamp: '2026-05-08 09:02:11',
    actor: 'Grace Hopper',
    event: 'role.assigned',
    resource: 'user:hedy-lamarr',
    ip: '10.4.12.88',
    tone: 'default',
  },
  {
    id: 'l-16',
    timestamp: '2026-05-07 18:36:42',
    actor: 'Alan Turing',
    event: 'injection.executed',
    resource: 'injection:run-04bca',
    ip: '10.4.12.18',
    tone: 'default',
  },
  {
    id: 'l-17',
    timestamp: '2026-05-07 13:11:09',
    actor: 'Margaret Hamilton',
    event: 'login.success',
    resource: 'user:margaret',
    ip: '10.4.12.22',
    tone: 'ghost',
  },
  {
    id: 'l-18',
    timestamp: '2026-05-06 23:58:21',
    actor: 'Edsger Dijkstra',
    event: 'project.deleted',
    resource: 'project:old-sandbox',
    ip: '10.4.12.15',
    tone: 'warning',
  },
];

const EVENT_OPTIONS: Array<{ value: EventType | 'all'; label: string }> = [
  { value: 'all', label: 'All events' },
  { value: 'user.created', label: 'user.created' },
  { value: 'user.updated', label: 'user.updated' },
  { value: 'role.assigned', label: 'role.assigned' },
  { value: 'project.deleted', label: 'project.deleted' },
  { value: 'api_key.rotated', label: 'api_key.rotated' },
  { value: 'injection.executed', label: 'injection.executed' },
  { value: 'login.success', label: 'login.success' },
  { value: 'login.failed', label: 'login.failed' },
];

export default function AuditLogs() {
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<EventType | 'all'>('all');
  const [search, setSearch] = useState('');

  const actorOptions = useMemo(() => {
    const set = new Set(MOCK_LOGS.map((l) => l.actor));
    return [
      { value: 'all', label: 'All actors' },
      ...Array.from(set).map((a) => ({ value: a, label: a })),
    ];
  }, []);

  const filtered = MOCK_LOGS.filter((l) => {
    if (actorFilter !== 'all' && l.actor !== actorFilter) {
      return false;
    }
    if (eventFilter !== 'all' && l.event !== eventFilter) {
      return false;
    }
    if (
      search &&
      !`${l.actor} ${l.event} ${l.resource} ${l.ip}`
        .toLowerCase()
        .includes(search.toLowerCase())
    ) {
      return false;
    }
    if (range?.[0] && range[1]) {
      const ts = new Date(l.timestamp).getTime();
      if (ts < range[0].startOf('day').valueOf()) {
        return false;
      }
      if (ts > range[1].endOf('day').valueOf()) {
        return false;
      }
    }
    return true;
  });

  const columns: Array<DataTableColumn<LogEntry>> = [
    {
      key: 'ts',
      header: 'Timestamp',
      width: '180px',
      render: (l) => <MonoValue size='sm'>{l.timestamp}</MonoValue>,
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (l) => (
        <div className='audit-page__actor'>
          <Avatar name={l.actor} size='sm' />
          <span>{l.actor}</span>
        </div>
      ),
    },
    {
      key: 'event',
      header: 'Event',
      render: (l) => <Chip tone={l.tone}>{l.event}</Chip>,
    },
    {
      key: 'resource',
      header: 'Resource',
      render: (l) => <MonoValue size='sm'>{l.resource}</MonoValue>,
    },
    {
      key: 'ip',
      header: 'IP address',
      render: (l) => <MonoValue size='sm'>{l.ip}</MonoValue>,
    },
  ];

  return (
    <>
      <PageHeader
        title='Audit Logs'
        description='System activity across your workspace.'
      />
      <Panel padded={false}>
        <div className='audit-page__filters'>
          <DatePicker.RangePicker
            value={range as [Dayjs, Dayjs] | null}
            onChange={(v) => setRange(v as [Dayjs | null, Dayjs | null] | null)}
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
          <Select<EventType | 'all'>
            value={eventFilter}
            onChange={setEventFilter}
            options={EVENT_OPTIONS}
            className='audit-page__select'
          />
          <Input.Search
            allowClear
            placeholder='Search resource, IP, or text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='audit-page__search'
          />
        </div>
        <DataTable<LogEntry>
          columns={columns}
          data={filtered}
          rowKey={(l) => l.id}
          emptyTitle='No matching events'
          emptyDescription='Try widening the time range or clearing filters.'
        />
      </Panel>
    </>
  );
}
