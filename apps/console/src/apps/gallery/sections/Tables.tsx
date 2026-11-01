import { type ReactNode, useCallback, useState } from 'react';

import {
  Button as AegisButton,
  Chip,
  DataList,
  DataTable,
  type DataTableCellTone,
  type DataTableColumn,
  type DataTableSort,
  EventTable,
  type EventTableColumn,
  IdentityCell,
  KeyValueList,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
  SectionDivider,
  Toolbar,
} from '@lincyaw/aegis-ui';

import { GALLERY_RUN_COLUMNS } from '../columns';
import {
  GALLERY_MODEL_COLUMNS,
  GALLERY_MODEL_ROWS,
  GALLERY_RUNS,
  type GalleryModelRow,
} from '../fixtures';
import { Specimen } from '../shared';

const GALLERY_SORTABLE_COLUMNS: Array<DataTableColumn<GalleryModelRow>> =
  GALLERY_MODEL_COLUMNS.map((col) => ({
    ...col,
    sortable: true,
    sortValue: (row: GalleryModelRow) =>
      col.key === 'model'
        ? row.model
        : (row[col.key as 'runs' | 'passed' | 'failed' | 'mean'] ?? null),
  }));

function DataTableSortSpecimen(): ReactNode {
  const [sort, setSort] = useState<DataTableSort | null>(null);
  return (
    <div className='gallery__row'>
      <Specimen
        caption={`sortable + sortValue · the table orders the rows · numeric columns sort high first · — (null) last either way · ${sort ? `${sort.key} ${sort.direction}` : 'unsorted'}`}
        span={3}
      >
        <DataTable
          columns={GALLERY_SORTABLE_COLUMNS}
          data={GALLERY_MODEL_ROWS}
          rowKey={(row) => row.model}
          defaultSort={{ key: 'mean', direction: 'desc' }}
          onSortChange={setSort}
        />
      </Specimen>
    </div>
  );
}

function DataTablePaginationSpecimen(): ReactNode {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [uncountedPage, setUncountedPage] = useState(1);
  const uncountedSize = 5;
  return (
    <div className='gallery__row'>
      <Specimen caption='total · pageSizeOptions' span={3}>
        <DataTable
          columns={GALLERY_RUN_COLUMNS}
          data={GALLERY_RUNS.slice((page - 1) * pageSize, page * pageSize)}
          rowKey={(row) => row.id}
          pagination={{
            page,
            pageSize,
            total: GALLERY_RUNS.length,
            pageSizeOptions: [5, 10, 20, 50],
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            },
          }}
        />
      </Specimen>
      <Specimen caption='no total · Next while the page is full' span={3}>
        <DataTable
          columns={GALLERY_RUN_COLUMNS}
          data={GALLERY_RUNS.slice(
            (uncountedPage - 1) * uncountedSize,
            uncountedPage * uncountedSize
          )}
          rowKey={(row) => row.id}
          pagination={{
            page: uncountedPage,
            pageSize: uncountedSize,
            onChange: (nextPage) => {
              setUncountedPage(nextPage);
            },
          }}
        />
      </Specimen>
    </div>
  );
}

function GalleryModelCard({ row }: { row: GalleryModelRow }): ReactNode {
  return (
    <div className='gallery__table-card'>
      <span className='gallery__table-card-title'>{row.model}</span>
      <MonoValue size='sm' weight='regular'>
        {`${row.passed}/${row.runs} passed · mean ${row.mean === null ? '—' : row.mean.toFixed(2)}`}
      </MonoValue>
    </div>
  );
}

interface GalleryMatrixRow {
  task: string;
  /** Passed runs per model, out of GALLERY_MATRIX_VALID valid runs. */
  passed: number[];
}

const GALLERY_MATRIX_MODELS = [
  'model-alpha',
  'model-beta',
  'model-gamma',
  'model-delta',
  'model-epsilon',
  'model-zeta',
];

const GALLERY_MATRIX_VALID = 5;

const GALLERY_MATRIX_ROWS: GalleryMatrixRow[] = [
  { task: 'checkout-latency-regression', passed: [5, 4, 3, 2, 1, 0] },
  { task: 'orders-index-rebuild', passed: [0, 1, 2, 3, 4, 5] },
  { task: 'replica-lag-after-failover', passed: [3, 0, 5, 1, 2, 4] },
];

/** 0 passed is the anomaly wash; otherwise one step per fifth of the runs. */
function galleryPassTone(passed: number): DataTableCellTone {
  if (passed === 0) {
    return { tone: 'warning' };
  }
  const step = Math.ceil((passed / GALLERY_MATRIX_VALID) * 5);
  return { tone: 'success', step: step as DataTableCellTone['step'] };
}

function DataTableMatrixSpecimen(): ReactNode {
  const [selected, setSelected] = useState<Array<string | number>>([]);
  const columns: Array<DataTableColumn<GalleryMatrixRow>> = [
    {
      key: 'task',
      header: 'Task',
      width: 220,
      render: (row) => row.task,
    },
    ...GALLERY_MATRIX_MODELS.map(
      (model, index): DataTableColumn<GalleryMatrixRow> => ({
        key: model,
        header: model,
        width: 160,
        numeric: true,
        cellTone: (row) => galleryPassTone(row.passed[index]),
        render: (row) =>
          `${String(row.passed[index])}/${String(GALLERY_MATRIX_VALID)}`,
      })
    ),
  ];
  return (
    <div className='gallery__row'>
      <Specimen
        caption="stickyFirstColumn · cellTone: success steps 1–5 by pass rate, 'warning' for 0 passed"
        span={3}
      >
        <DataTable
          stickyFirstColumn
          columns={columns}
          data={GALLERY_MATRIX_ROWS}
          rowKey={(row) => row.task}
        />
      </Specimen>
      <Specimen
        caption='stale · selectable · the selection column sticks too'
        span={3}
      >
        <DataTable
          stale
          stickyFirstColumn
          selectable
          selectedKeys={selected}
          onSelectedKeysChange={setSelected}
          columns={columns}
          data={GALLERY_MATRIX_ROWS}
          rowKey={(row) => row.task}
        />
      </Specimen>
    </div>
  );
}

function DataTableRowClickSpecimen(): ReactNode {
  const [opened, setOpened] = useState('none');
  return (
    <div className='gallery__row'>
      <Specimen
        caption={`onRowClick · hover chevron · Enter on a focused row · last: ${opened}`}
        span={3}
      >
        <DataTable
          columns={[
            ...GALLERY_MODEL_COLUMNS.slice(0, 3),
            {
              key: 'link',
              header: 'Link in a cell',
              truncate: false,
              render: (row) => (
                <a
                  href={`#${row.model}`}
                  className='gallery__table-link'
                  onClick={(event) => {
                    event.preventDefault();
                    setOpened(`link ${row.model}`);
                  }}
                >
                  Open report
                </a>
              ),
            },
          ]}
          data={GALLERY_MODEL_ROWS}
          rowKey={(row) => row.model}
          onRowClick={(row) => {
            setOpened(`row ${row.model}`);
          }}
        />
      </Specimen>
    </div>
  );
}

interface GalleryTaskRow {
  id: string;
  title: string;
  path: string;
  runs: number;
  passRate: number;
  mean: number | null;
}

const GALLERY_TASK_ROWS: GalleryTaskRow[] = [
  {
    id: '30434932d311',
    title: '部署回滚后为批量导出审批执行计划',
    path: 'dba-bench / tidb-binding-approval',
    runs: 41,
    passRate: 0.976,
    mean: 0.72,
  },
  {
    id: '13c2dea9bcbb',
    title: 'checkout-latency-regression',
    path: 'external / checkout-latency',
    runs: 18,
    passRate: 0.222,
    mean: 0,
  },
  {
    id: '7f0e5b2a9c41',
    title: 'replica-lag-after-failover',
    path: 'cgfs / replica-lag',
    runs: 3,
    passRate: 0,
    mean: null,
  },
];

const GALLERY_TASK_COLUMNS: Array<DataTableColumn<GalleryTaskRow>> = [
  {
    key: 'task',
    header: '题目',
    render: (row) => (
      <IdentityCell
        name={row.title}
        secondary={row.path}
        to={`#task-${row.id}`}
      />
    ),
  },
  { key: 'runs', header: '运行', numeric: true, render: (row) => row.runs },
  {
    key: 'passRate',
    header: '通过率',
    numeric: true,
    render: (row) => `${(row.passRate * 100).toFixed(1)}%`,
  },
  {
    key: 'mean',
    header: '结果均分',
    numeric: true,
    render: (row) => (row.mean === null ? '—' : row.mean.toFixed(2)),
  },
];

interface GalleryGradingRow {
  id: string;
  method: string;
  summary: string;
  source: string;
  derivation: string;
  location: string;
}

const GALLERY_GRADING_ROWS: GalleryGradingRow[] = [
  {
    id: 'binding_controls_all_serving_readers',
    method: '代码检查',
    summary: '两个读端的最终计划都由已批准的 binding 控制才通过。',
    source: 'recorded_verdict · trace',
    derivation: '未记录',
    location: 'dba-bench@2df1441+judge.patch:ServingBindingPlanVerifier',
  },
  {
    id: 'no_dml_against_orders',
    method: '代码检查',
    summary: '诊断过程中不得对 orders 表执行写操作。',
    source: 'trace',
    derivation: '由公开要求推导',
    location: 'tests/cases/no_dml.py',
  },
  {
    id: 'root_cause_named',
    method: '评委',
    summary: '回答指出回滚后 binding 失效是计划变化的原因。',
    source: 'answer',
    derivation: '由构造效果推导',
    location: 'tests/grading.toml',
  },
];

const GALLERY_GRADING_COLUMNS: Array<DataTableColumn<GalleryGradingRow>> = [
  {
    key: 'id',
    header: 'ID',
    width: 240,
    render: (row) => <MonoValue size='sm'>{row.id}</MonoValue>,
  },
  {
    key: 'method',
    header: '方式',
    truncate: false,
    render: (row) => <Chip size='md'>{row.method}</Chip>,
  },
  {
    key: 'summary',
    header: '说明',
    truncate: false,
    render: (row) => row.summary,
  },
];

function renderGalleryGradingDetail(row: GalleryGradingRow): ReactNode {
  return (
    <KeyValueList
      items={[
        { k: '观察来源', v: row.source },
        { k: '推导思路', v: row.derivation },
        { k: '实现位置', v: <MonoValue size='sm'>{row.location}</MonoValue> },
      ]}
    />
  );
}

function DataTableExpandableSpecimen(): ReactNode {
  const [expanded, setExpanded] = useState<Array<string | number>>([]);
  const [selected, setSelected] = useState<Array<string | number>>([]);
  const [opened, setOpened] = useState('none');
  return (
    <div className='gallery__row'>
      <Specimen
        caption='renderExpanded · uncontrolled · defaultExpandedKeys · 16 px chevron toggle · detail under the row'
        span={3}
      >
        <DataTable
          columns={GALLERY_GRADING_COLUMNS}
          data={GALLERY_GRADING_ROWS}
          rowKey={(row) => row.id}
          renderExpanded={renderGalleryGradingDetail}
          defaultExpandedKeys={[GALLERY_GRADING_ROWS[0].id]}
        />
      </Specimen>
      <Specimen
        caption={`controlled expandedKeys · selectable · onRowClick · expanded: ${expanded.length > 0 ? expanded.join(', ') : 'none'} · last click: ${opened}`}
        span={3}
      >
        <div className='gallery__stack gallery__stack--fill'>
          <div className='gallery__row'>
            <AegisButton
              tone='secondary'
              onClick={() => {
                setExpanded(GALLERY_GRADING_ROWS.map((row) => row.id));
              }}
            >
              Expand all
            </AegisButton>
            <AegisButton
              tone='ghost'
              onClick={() => {
                setExpanded([]);
              }}
            >
              Collapse all
            </AegisButton>
          </div>
          <DataTable
            columns={GALLERY_GRADING_COLUMNS}
            data={GALLERY_GRADING_ROWS}
            rowKey={(row) => row.id}
            renderExpanded={renderGalleryGradingDetail}
            expandedKeys={expanded}
            onExpandedKeysChange={setExpanded}
            selectable
            selectedKeys={selected}
            onSelectedKeysChange={setSelected}
            onRowClick={(row) => {
              setOpened(row.id);
            }}
          />
        </div>
      </Specimen>
    </div>
  );
}

function DataTableMobileCardSpecimen(): ReactNode {
  const [page, setPage] = useState(1);
  const [opened, setOpened] = useState('none');
  const pageSize = 2;
  const renderCard = (row: GalleryModelRow): ReactNode => (
    <GalleryModelCard row={row} />
  );
  return (
    <div className='gallery__row'>
      <Specimen
        caption={`renderMobileCard · ≤768 px renders cards · pagination · onRowClick · last: ${opened}`}
        span={3}
      >
        <DataTable
          columns={GALLERY_MODEL_COLUMNS}
          data={GALLERY_MODEL_ROWS.slice(
            (page - 1) * pageSize,
            page * pageSize
          )}
          rowKey={(row) => row.model}
          renderMobileCard={renderCard}
          onRowClick={(row) => {
            setOpened(row.model);
          }}
          pagination={{
            page,
            pageSize,
            total: GALLERY_MODEL_ROWS.length,
            onChange: (nextPage) => {
              setPage(nextPage);
            },
          }}
        />
      </Specimen>
      <Specimen caption='renderMobileCard · loading' span={2}>
        <DataTable
          columns={GALLERY_MODEL_COLUMNS}
          data={[]}
          rowKey={(row) => row.model}
          renderMobileCard={renderCard}
          loading
        />
      </Specimen>
      <Specimen caption='renderMobileCard · empty' span={2}>
        <DataTable
          columns={GALLERY_MODEL_COLUMNS}
          data={[]}
          rowKey={(row) => row.model}
          renderMobileCard={renderCard}
          emptyTitle='No results'
        />
      </Specimen>
    </div>
  );
}

interface SampleEvent {
  id: string;
  ts: string;
  level: 'info' | 'warn' | 'error';
  service: string;
  message: string;
}

const SERVICES = [
  'order-svc',
  'cart-svc',
  'inventory',
  'auth',
  'gateway',
  'billing',
];

const LEVELS: Array<SampleEvent['level']> = ['info', 'warn', 'error'];

function makeEvent(i: number): SampleEvent {
  const level = LEVELS[i % LEVELS.length] ?? 'info';
  const service = SERVICES[i % SERVICES.length] ?? 'gateway';
  return {
    id: `evt-${String(i).padStart(6, '0')}`,
    ts: new Date(1_700_000_000_000 + i * 1000).toISOString(),
    level,
    service,
    message: `request handled in ${(20 + (i % 480)).toString()}ms`,
  };
}

function makeEvents(count: number, offset = 0): SampleEvent[] {
  return Array.from({ length: count }, (_, i) => makeEvent(i + offset));
}

const eventColumns: Array<EventTableColumn<SampleEvent>> = [
  {
    key: 'ts',
    header: 'Timestamp',
    width: 220,
    render: (row) => <MonoValue size='sm'>{row.ts}</MonoValue>,
  },
  {
    key: 'level',
    header: 'Level',
    width: 90,
    align: 'center',
    render: (row) => {
      const tone =
        row.level === 'error'
          ? 'warning'
          : row.level === 'warn'
            ? 'ink'
            : 'default';
      return <Chip tone={tone}>{row.level}</Chip>;
    },
    truncate: false,
  },
  {
    key: 'service',
    header: 'Service',
    width: 140,
    render: (row) => row.service,
  },
  {
    key: 'message',
    header: 'Message',
    render: (row) => row.message,
  },
];

const SMALL_EVENTS = makeEvents(50);

const LARGE_EVENTS = makeEvents(10_000);

function EventTableSpecimen(): ReactNode {
  const [selectedKey, setSelectedKey] = useState<string | undefined>(
    SMALL_EVENTS[2]?.id
  );
  const [paginated, setPaginated] = useState<SampleEvent[]>(() =>
    makeEvents(200)
  );
  const handleLoadMore = useCallback(() => {
    setPaginated((prev) => prev.concat(makeEvents(1000, prev.length)));
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
    >
      <div>
        <MetricLabel as='div' size='xs'>
          50 rows · sticky header · row selection
        </MetricLabel>
        <EventTable
          columns={eventColumns}
          data={SMALL_EVENTS}
          rowKey={(row) => row.id}
          selectedKey={selectedKey}
          onRowClick={(row) => {
            setSelectedKey(row.id);
          }}
          maxVisibleRows={10}
        />
      </div>
      <div>
        <MetricLabel as='div' size='xs'>
          10,000 rows · virtualization perf
        </MetricLabel>
        <EventTable
          columns={eventColumns}
          data={LARGE_EVENTS}
          rowKey={(row) => row.id}
          maxVisibleRows={12}
        />
      </div>
      <div>
        <MetricLabel as='div' size='xs'>
          onLoadMore · appends 1,000 rows on scroll-to-bottom · current size{' '}
          {paginated.length.toString()}
        </MetricLabel>
        <EventTable
          columns={eventColumns}
          data={paginated}
          rowKey={(row) => row.id}
          onLoadMore={handleLoadMore}
          maxVisibleRows={12}
        />
      </div>
    </div>
  );
}

export function TablesSection() {
  return (
    <Panel title={<PanelTitle size='lg'>Tables & Toolbar</PanelTitle>}>
      <SectionDivider>Toolbar</SectionDivider>
      <Specimen caption='search + filters + action' span={3}>
        <Toolbar
          searchPlaceholder='Search injections…'
          searchValue='latency'
          filters={[
            { key: 'type', label: 'type: NetworkLatency' },
            { key: 'target', label: 'target: order-svc' },
          ]}
          action={<Chip tone='ink'>+ New injection</Chip>}
        />
      </Specimen>

      <SectionDivider>DataTable · framed</SectionDivider>
      <div className='gallery__row'>
        <Specimen
          caption='default · own card, header flush and clipped by --radius-lg · IdentityCell main column · numeric columns · no separator under the last row'
          span={3}
        >
          <DataTable
            columns={GALLERY_TASK_COLUMNS}
            data={GALLERY_TASK_ROWS}
            rowKey={(row) => row.id}
          />
        </Specimen>
        <Specimen
          caption='framed={false} in a titled Panel padded={false}'
          span={3}
        >
          <Panel
            title='按模型'
            description='示例只列出部分'
            padded={false}
            className='gallery__menu-host'
          >
            <DataTable
              framed={false}
              columns={GALLERY_MODEL_COLUMNS}
              data={GALLERY_MODEL_ROWS}
              rowKey={(row) => row.model}
            />
          </Panel>
        </Specimen>
      </div>

      <SectionDivider>DataTable · with data</SectionDivider>
      <Specimen
        caption='mono ids · chips · numeric duration · agent surface'
        span={3}
      >
        <DataTable
          columns={[
            {
              key: 'id',
              header: 'ID',
              render: (row) => <MonoValue size='sm'>{row.id}</MonoValue>,
            },
            {
              key: 'type',
              header: 'Type',
              render: (row) => row.type,
            },
            {
              key: 'target',
              header: 'Target',
              render: (row) => row.target,
            },
            {
              key: 'duration',
              header: 'Duration',
              numeric: true,
              render: (row) => row.duration,
            },
            {
              key: 'state',
              header: 'State',
              align: 'center',
              render: (row) => {
                const tone =
                  row.state === 'running'
                    ? 'ink'
                    : row.state === 'failed'
                      ? 'warning'
                      : 'default';
                return <Chip tone={tone}>{row.state}</Chip>;
              },
            },
          ]}
          data={[
            {
              id: 'INJ-0001',
              type: 'NetworkLatency',
              target: 'order-svc',
              duration: '120 s',
              state: 'running',
            },
            {
              id: 'INJ-0002',
              type: 'CPUStress',
              target: 'cart-svc',
              duration: '300 s',
              state: 'queued',
            },
            {
              id: 'INJ-0003',
              type: 'PodKill',
              target: 'inventory',
              duration: '—',
              state: 'failed',
            },
          ]}
          rowKey={(row) => row.id}
          surface={{
            id: 'gallery.table.injections',
            kind: 'table',
            label: 'Injections table',
            askSuggestions: ['Which injections are failing?'],
            project: (rows) => ({
              entities: rows.map((r) => ({
                id: r.id,
                type: 'injection',
                label: r.id,
                data: { type: r.type, target: r.target, state: r.state },
              })),
            }),
          }}
        />
      </Specimen>

      <SectionDivider>DataTable · numeric columns</SectionDivider>
      <Specimen
        caption='numeric: true · right-aligned header and cells · --font-numeric tabular figures · 0.00 and —'
        span={3}
      >
        <DataTable
          columns={GALLERY_MODEL_COLUMNS}
          data={GALLERY_MODEL_ROWS}
          rowKey={(row) => row.model}
        />
      </Specimen>

      <SectionDivider>DataTable · sorting</SectionDivider>
      <DataTableSortSpecimen />

      <SectionDivider>DataTable · row click</SectionDivider>
      <DataTableRowClickSpecimen />

      <SectionDivider>DataTable · expandable rows</SectionDivider>
      <DataTableExpandableSpecimen />

      <SectionDivider>
        DataTable · stickyFirstColumn · cellTone · stale
      </SectionDivider>
      <DataTableMatrixSpecimen />

      <SectionDivider>DataTable · mobile cards</SectionDivider>
      <DataTableMobileCardSpecimen />

      <SectionDivider>DataTable · loading</SectionDivider>
      <Specimen caption='skeleton shimmer' span={3}>
        <DataTable
          columns={[
            { key: 'id', header: 'ID', render: () => '' },
            { key: 'type', header: 'Type', render: () => '' },
            { key: 'status', header: 'Status', render: () => '' },
          ]}
          data={[]}
          rowKey={(_, i) => i}
          loading
        />
      </Specimen>

      <SectionDivider>DataTable · empty</SectionDivider>
      <Specimen caption='EmptyState inline' span={3}>
        <DataTable
          columns={[
            { key: 'id', header: 'ID', render: () => '' },
            { key: 'type', header: 'Type', render: () => '' },
          ]}
          data={[]}
          rowKey={(_, i) => i}
          emptyTitle='No executions'
          emptyDescription='Run an experiment to see results here.'
        />
      </Specimen>

      <SectionDivider>DataTable · pagination</SectionDivider>
      <DataTablePaginationSpecimen />

      <SectionDivider>DataTable · actions column</SectionDivider>
      <Specimen
        caption="kind: 'actions' · right-aligned, gapped, wraps"
        span={3}
      >
        <DataTable
          columns={[
            ...GALLERY_RUN_COLUMNS.slice(0, 2),
            {
              key: 'actions',
              header: '',
              kind: 'actions',
              render: (row) => (
                <>
                  <AegisButton tone='ghost'>Logs</AegisButton>
                  <AegisButton tone='ghost'>Rerun</AegisButton>
                  <AegisButton
                    tone='secondary'
                    disabled={row.state !== 'running'}
                  >
                    Stop
                  </AegisButton>
                </>
              ),
            },
          ]}
          data={GALLERY_RUNS.slice(0, 3)}
          rowKey={(row) => row.id}
        />
      </Specimen>

      <SectionDivider>EventTable</SectionDivider>
      <Specimen
        caption='virtualized · sticky header · selection · onLoadMore'
        span={3}
      >
        <EventTableSpecimen />
      </Specimen>

      <SectionDivider>DataList</SectionDivider>
      <Specimen caption='compact list · selectable rows' span={3}>
        <DataList
          items={[
            { id: 'ds-001', name: 'wikitext-103', status: 'ready' },
            { id: 'ds-002', name: 'imagenet-mini', status: 'syncing' },
            { id: 'ds-003', name: 'common-crawl-en', status: 'ready' },
          ]}
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Name' },
            { key: 'status', label: 'Status' },
          ]}
          selectedId='ds-002'
          surface={{
            id: 'gallery.list.datasets',
            kind: 'list',
            label: 'Datasets list',
            askSuggestions: ['Which dataset is still syncing?'],
            project: (rows) => ({
              entities: rows.map((r) => ({
                id: r.id,
                type: 'dataset',
                label: r.name,
                data: { status: r.status },
              })),
            }),
          }}
        />
      </Specimen>
    </Panel>
  );
}
