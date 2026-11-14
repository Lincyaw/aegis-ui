import { type ReactNode, useEffect, useRef, useState } from 'react';

import {
  BlastRadiusBar,
  Button,
  Checkbox,
  Chip,
  ChoiceCardGroup,
  CodeEditor,
  ColumnLayout,
  DangerZone,
  DataTable,
  DetailBeside,
  Dialog,
  FileTree,
  FormRow,
  IdentityCell,
  MetadataList,
  MetricLabel,
  MonoValue,
  NumberField,
  PageHeader,
  PageWrapper,
  Panel,
  PasswordField,
  PickerField,
  QueryAutocomplete,
  SearchInput,
  SectionDivider,
  Select,
  ServiceMap,
  type ServiceMapEdge,
  type ServiceMapGroup,
  type ServiceMapNode,
  SettingsSection,
  SiteAnchorNav,
  SiteFooter,
  type SiteFooterColumn,
  SiteLayout,
  SiteNav,
  type SiteNavItem,
  SiteSection,
  SiteSectionHeader,
  Slider,
  Tabs,
  TextField,
  ThemeToggle,
  TimeDisplay,
  Toolbar,
  type TraceSpan,
  TraceTree,
  TreeTable,
  type TreeTableColumn,
} from '@lincyaw/aegis-ui';

import { GalleryRouterLink, GallerySection, Specimen } from '../shared';

const SITE_NAV_ITEMS: SiteNavItem[] = [
  { key: 'benchmarks', label: 'Benchmarks', to: '/gallery' },
  { key: 'leaderboard', label: '排行榜', to: '/gallery' },
  { key: 'replays', label: '回放', to: '/gallery' },
  { key: 'reports', label: '报告', to: '/gallery' },
  { key: 'method', label: '方法', to: '/gallery' },
];

const SITE_FOOTER_COLUMNS: SiteFooterColumn[] = [
  {
    key: 'benchmarks',
    title: 'Benchmarks',
    links: [
      { key: 'dba', label: 'DBA Bench', to: '/gallery' },
      { key: 'swe', label: 'SWE-chat', to: '/gallery' },
      { key: 'arena', label: 'Agent Arena', to: '/gallery' },
    ],
  },
  {
    key: 'resources',
    title: '资源',
    links: [
      { key: 'reports', label: '报告', to: '/gallery' },
      { key: 'method', label: '方法', to: '/gallery' },
      { key: 'changes', label: '更新记录', to: '/gallery' },
    ],
  },
  {
    key: 'about',
    title: '关于',
    links: [
      { key: 'team', label: '团队', to: '/gallery' },
      { key: 'submit', label: '提交模型', to: '/gallery' },
      { key: 'contact', label: '联系我们', to: '/gallery' },
    ],
  },
];

const FORM_ROW_SCOPES = [
  { value: 'recent', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
  { value: 'all', label: 'All runs since the first benchmark' },
];

const FORM_ROW_CHARTS = ['Ranking', 'Scatter', 'Radar'];

const FORM_ROW_QUERY_FIELDS = [
  { value: 'service.name' },
  { value: 'status' },
  { value: 'duration' },
];

function FormRowFieldsSpecimen() {
  const [scope, setScope] = useState('recent');
  const [workers, setWorkers] = useState<number | undefined>(2);
  const [load, setLoad] = useState(70);
  const [alerts, setAlerts] = useState(true);
  const [filter, setFilter] = useState('');
  const [query, setQuery] = useState('status:failed');
  return (
    <>
      <FormRow
        label='Report scope'
        description='Which runs the report covers.'
        controlId='gallery-form-row-scope'
      >
        <Select
          id='gallery-form-row-scope'
          aria-describedby='gallery-form-row-scope-description'
          value={scope}
          options={FORM_ROW_SCOPES}
          onChange={setScope}
        />
      </FormRow>
      <FormRow
        label='Workers'
        description='1–8. Type 1.5: the field’s own error follows this description.'
        controlId='gallery-form-row-workers'
      >
        <NumberField
          id='gallery-form-row-workers'
          aria-describedby='gallery-form-row-workers-description'
          integer
          min={1}
          max={8}
          value={workers}
          onChange={setWorkers}
        />
      </FormRow>
      <FormRow
        label='CPU load'
        description='The value above the track is read once, as the slider’s value.'
        controlId='gallery-form-row-load'
      >
        <Slider
          id='gallery-form-row-load'
          aria-describedby='gallery-form-row-load-description'
          min={1}
          max={100}
          value={load}
          formatValue={(v) => `${String(v)}%`}
          onChange={setLoad}
        />
      </FormRow>
      <FormRow
        label='Critical alerts'
        description='Email me when a run fails.'
        controlId='gallery-form-row-alerts'
      >
        <Checkbox
          id='gallery-form-row-alerts'
          aria-describedby='gallery-form-row-alerts-description'
          checked={alerts}
          onChange={setAlerts}
        />
      </FormRow>
      <FormRow
        label='Default filter'
        description='Applied when the runs list opens.'
        controlId='gallery-form-row-filter'
      >
        <SearchInput
          id='gallery-form-row-filter'
          aria-describedby='gallery-form-row-filter-description'
          placeholder='status:failed'
          value={filter}
          onChange={setFilter}
        />
      </FormRow>
      <FormRow
        label='Alert query'
        description='Runs that match raise an alert.'
        controlId='gallery-form-row-query'
      >
        <QueryAutocomplete
          id='gallery-form-row-query'
          aria-describedby='gallery-form-row-query-description'
          value={query}
          onChange={setQuery}
          fieldSuggestions={FORM_ROW_QUERY_FIELDS}
          showHelp={false}
        />
      </FormRow>
    </>
  );
}

function FormRowLabelledBySpecimen() {
  const [mode, setMode] = useState('auto');
  const [chart, setChart] = useState('Ranking');
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState('replicas: 2\nimage:\n  tag: v1.2.0\n');
  return (
    <>
      <FormRow
        label='Blast radius'
        description='A meter, named once by the row label.'
        controlId='gallery-form-row-blast'
        labelBy='aria-labelledby'
      >
        <BlastRadiusBar
          aria-labelledby='gallery-form-row-blast-label'
          aria-describedby='gallery-form-row-blast-description'
          value={60}
          centerLabel='Service · 60 %'
        />
      </FormRow>
      <FormRow
        label='Namespace'
        description='A radio group of cards.'
        controlId='gallery-form-row-namespace'
        labelBy='aria-labelledby'
      >
        <ChoiceCardGroup
          aria-labelledby='gallery-form-row-namespace-label'
          aria-describedby='gallery-form-row-namespace-description'
          value={mode}
          onChange={setMode}
          options={[
            {
              value: 'auto',
              title: 'Auto-allocate',
              description: 'Take a free namespace from the pool.',
            },
            {
              value: 'specific',
              title: 'Specific namespace',
              description: 'Inject into a namespace you name.',
            },
          ]}
        />
      </FormRow>
      <FormRow
        label='Chart type'
        description='A picker: the row label and the value name it together.'
        controlId='gallery-form-row-chart'
        labelBy='aria-labelledby'
      >
        <PickerField
          aria-labelledby='gallery-form-row-chart-label'
          aria-describedby='gallery-form-row-chart-description'
          value={chart}
          onClick={() => {
            setOpen(true);
          }}
        />
      </FormRow>
      <FormRow
        label='Helm values'
        description='A code editor: its editable area takes the row label.'
        controlId='gallery-form-row-values'
        labelBy='aria-labelledby'
      >
        <CodeEditor
          id='gallery-form-row-values'
          aria-labelledby='gallery-form-row-values-label'
          aria-describedby='gallery-form-row-values-description'
          language='yaml'
          value={values}
          onChange={setValues}
          height='calc(var(--space-16) * 2)'
        />
      </FormRow>
      <Dialog
        open={open}
        title='Chart type'
        width='sm'
        onClose={() => {
          setOpen(false);
        }}
      >
        {FORM_ROW_CHARTS.map((type) => (
          <Button
            key={type}
            tone={type === chart ? 'primary' : 'secondary'}
            onClick={() => {
              setChart(type);
              setOpen(false);
            }}
          >
            {type}
          </Button>
        ))}
      </Dialog>
    </>
  );
}

function FormRowGroupSpecimen() {
  const [channels, setChannels] = useState({ email: true, slack: false });
  return (
    <FormRow
      label='Alert channels'
      description='Several controls: the row is a group the label names.'
    >
      <div className='gallery__row'>
        <Checkbox
          label='Email'
          checked={channels.email}
          onChange={(email) => {
            setChannels((c) => ({ ...c, email }));
          }}
        />
        <Checkbox
          label='Slack'
          checked={channels.slack}
          onChange={(slack) => {
            setChannels((c) => ({ ...c, slack }));
          }}
        />
      </div>
    </FormRow>
  );
}

const SETTINGS_TIMEZONES = [
  { value: 'utc', label: 'UTC' },
  { value: 'shanghai', label: 'Asia/Shanghai' },
  { value: 'new-york', label: 'America/New_York' },
];

function SettingsSectionSpecimen() {
  const [timezone, setTimezone] = useState('utc');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slack, setSlack] = useState(false);
  return (
    <>
      <SettingsSection
        title='Profile'
        description='Update your personal information and preferences.'
      >
        <FormRow
          label='Display name'
          description='Shown across the platform.'
          controlId='gallery-settings-name'
        >
          <TextField
            id='gallery-settings-name'
            aria-describedby='gallery-settings-name-description'
            defaultValue='Ada Lovelace'
          />
        </FormRow>
        <FormRow
          label='Email'
          description='Used for notifications and login.'
          controlId='gallery-settings-email'
        >
          <TextField
            id='gallery-settings-email'
            aria-describedby='gallery-settings-email-description'
            type='email'
            defaultValue='ada@aegislab.io'
          />
        </FormRow>
        <FormRow
          label='Timezone'
          description='All times are displayed in this zone.'
          controlId='gallery-settings-timezone'
        >
          <Select
            id='gallery-settings-timezone'
            aria-describedby='gallery-settings-timezone-description'
            value={timezone}
            options={SETTINGS_TIMEZONES}
            onChange={setTimezone}
          />
        </FormRow>
      </SettingsSection>
      <SettingsSection
        title='Notifications'
        description='Choose what you want to be notified about.'
      >
        <FormRow
          label='Email alerts'
          description='Receive email for critical events.'
          controlId='gallery-settings-email-alerts'
        >
          <Checkbox
            id='gallery-settings-email-alerts'
            aria-describedby='gallery-settings-email-alerts-description'
            checked={emailAlerts}
            onChange={setEmailAlerts}
          />
        </FormRow>
        <FormRow
          label='Slack integration'
          description='Push notifications to your Slack channel.'
          controlId='gallery-settings-slack'
        >
          <Checkbox
            id='gallery-settings-slack'
            aria-describedby='gallery-settings-slack-description'
            checked={slack}
            onChange={setSlack}
          />
        </FormRow>
      </SettingsSection>
    </>
  );
}

function GallerySiteBrand() {
  return <span className='gallery__site-brand'>AEGIS</span>;
}

function GallerySiteNav({ variant }: { variant: 'flat' | 'floating' }) {
  return (
    <SiteNav
      brand={<GallerySiteBrand />}
      brandHref='/gallery'
      items={SITE_NAV_ITEMS}
      activeKey='benchmarks'
      actions={<ThemeToggle />}
      variant={variant}
      linkComponent={GalleryRouterLink}
    />
  );
}

function GallerySiteFooter() {
  return (
    <SiteFooter
      brand={<GallerySiteBrand />}
      tagline='Aegis Bench · 可回放的 Agent 评测'
      columns={SITE_FOOTER_COLUMNS}
      note='数据更新于 2026-10-28'
      wordmark='AEGIS BENCH'
      linkComponent={GalleryRouterLink}
    />
  );
}

/* ── DetailBeside specimen ─────────────────────────────────────────── */

interface GalleryRequirement {
  id: string;
  parent: string | null;
  name: string;
  kind: 'area' | 'group' | 'requirement';
  statement: string;
}

const DETAIL_AREAS = [
  'Accounts',
  'Billing',
  'Catalog',
  'Delivery',
  'Events',
  'Search',
];
const DETAIL_GROUPS = ['Create', 'Read', 'Update', 'Retire'];
const DETAIL_RULES = [
  'keeps every change in its history',
  'rejects a request without a key',
  'answers within one second',
  'shows each record it links to',
  'compares any two versions',
];
/** One rule states enough examples to run past the view, so its detail scrolls its body. */
const DETAIL_LONG_RULE = 2;

/** Six areas of four groups of five requirements: 150 rows, a deep one far below the top. */
const DETAIL_REQUIREMENTS: GalleryRequirement[] = DETAIL_AREAS.flatMap(
  (area, a) => {
    const areaId = `A${String(a + 1)}`;
    return [
      {
        id: areaId,
        parent: null,
        name: `${areaId} · ${area}`,
        kind: 'area' as const,
        statement: `What the ${area.toLowerCase()} service does for its users.`,
      },
      ...DETAIL_GROUPS.flatMap((group, g) => {
        const groupId = `${areaId}.${String(g + 1)}`;
        return [
          {
            id: groupId,
            parent: areaId,
            name: `${groupId} · ${group}`,
            kind: 'group' as const,
            statement: `${group} operations of ${area.toLowerCase()}.`,
          },
          ...DETAIL_RULES.map((rule, r) => ({
            id: `${groupId}.${String(r + 1)}`,
            parent: groupId,
            name: `${groupId}.${String(r + 1)} · ${group} ${rule}`,
            kind: 'requirement' as const,
            statement:
              r === DETAIL_LONG_RULE
                ? Array.from(
                    { length: 24 },
                    (_, n) =>
                      `Example ${String(n + 1)}: a ${group.toLowerCase()} request with ${String(n + 1)} items answers in under a second.`
                  ).join('\n')
                : `${group} ${rule}, for every ${area.toLowerCase()} record.`,
          })),
        ];
      }),
    ];
  }
);

const DETAIL_SPANS: TraceSpan[] = DETAIL_REQUIREMENTS.map((r) => ({
  id: r.id,
  parentId: r.parent,
  name: r.name,
  kind: r.kind,
}));
const DETAIL_LEAVES = DETAIL_REQUIREMENTS.filter(
  (r) => r.kind === 'requirement'
);
const detailPath = (id: string): string =>
  `${id.split('.').slice(0, -1).join('/')}/${id}.yaml`;
const DETAIL_FILES = DETAIL_LEAVES.map((r) => ({ path: detailPath(r.id) }));
const DETAIL_MAP_NODES: ServiceMapNode[] = DETAIL_REQUIREMENTS.filter(
  (r) => r.kind === 'group'
).map((r) => ({ id: r.id, label: r.name }));
const DETAIL_MAP_GROUPS: ServiceMapGroup[] = DETAIL_REQUIREMENTS.filter(
  (r) => r.kind === 'area'
).map((r) => ({
  id: r.id,
  label: r.name,
  nodeIds: DETAIL_MAP_NODES.filter((n) => n.id.startsWith(`${r.id}.`)).map(
    (n) => n.id
  ),
}));
const DETAIL_MAP_EDGES: ServiceMapEdge[] = DETAIL_MAP_GROUPS.flatMap((group) =>
  group.nodeIds.slice(1).map((target, i) => ({
    id: `${group.nodeIds[i]}→${target}`,
    source: group.nodeIds[i],
    target,
  }))
);
/** Each requirement's children, the areas under null, for a TreeTable's getSubRows. */
const DETAIL_CHILDREN = new Map<string | null, GalleryRequirement[]>();
DETAIL_REQUIREMENTS.forEach((r) => {
  DETAIL_CHILDREN.set(r.parent, [...(DETAIL_CHILDREN.get(r.parent) ?? []), r]);
});
const DETAIL_TREE_COLUMNS: Array<TreeTableColumn<GalleryRequirement>> = [
  { key: 'name', header: 'Requirement', render: (r) => r.name },
  {
    key: 'kind',
    header: 'Kind',
    width: 128,
    render: (r) => (
      <Chip size='sm' tone='ghost'>
        {r.kind}
      </Chip>
    ),
  },
];

/** Each list opens on a deep item: the trees, files and table on a requirement, the map on a group. */
const DETAIL_LISTS = [
  { key: 'tree', label: 'TraceTree', opensOn: 'A5.3.4' },
  { key: 'files', label: 'FileTree', opensOn: 'A5.3.4' },
  { key: 'table', label: 'DataTable', opensOn: 'A5.3.4' },
  { key: 'treetable', label: 'TreeTable', opensOn: 'A5.3.4' },
  { key: 'map', label: 'ServiceMap', opensOn: 'A5.3' },
];

function GalleryRequirementDetail({
  id,
  requirements,
}: {
  id: string;
  requirements: GalleryRequirement[];
}): ReactNode {
  const requirement = requirements.find((r) => r.id === id);
  if (requirement === undefined) {
    return null;
  }
  return (
    <Panel title={requirement.name}>
      <MetadataList
        wrap
        entries={[
          { label: 'Kind', value: requirement.kind },
          {
            label: 'Parent',
            value:
              requirement.parent === null
                ? '—'
                : (requirements.find((r) => r.id === requirement.parent)
                    ?.name ?? '—'),
          },
          {
            label: 'Children',
            value: String(requirements.filter((r) => r.parent === id).length),
          },
          { label: 'Statement', value: requirement.statement },
        ]}
      />
    </Panel>
  );
}

function DetailBesideSpecimen(): ReactNode {
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [list, setList] = useState(DETAIL_LISTS[0]);
  const [selected, setSelected] = useState(list.opensOn);
  const lists: Record<string, ReactNode> = {
    tree: (
      <Panel title='Requirement tree' padded={false}>
        <TraceTree
          ariaLabel='Requirement tree'
          spans={DETAIL_SPANS}
          selectedId={selected}
          onSelect={(span) => {
            setSelected(span.id);
          }}
          wrapName
        />
      </Panel>
    ),
    files: (
      <Panel title='Requirement files'>
        <FileTree
          ariaLabel='Requirement files'
          files={DETAIL_FILES}
          selectedPath={detailPath(selected)}
          onSelect={(path) => {
            setSelected(path.slice(path.lastIndexOf('/') + 1, -'.yaml'.length));
          }}
        />
      </Panel>
    ),
    table: (
      <Panel title='Requirements' padded={false}>
        <DataTable<GalleryRequirement>
          ariaLabel='Requirements'
          framed={false}
          columns={[
            { key: 'id', header: 'ID', width: 96, render: (r) => r.id },
            { key: 'name', header: 'Requirement', render: (r) => r.name },
          ]}
          data={DETAIL_LEAVES}
          rowKey={(r) => r.id}
          selectedKeys={[selected]}
          onRowClick={(r) => {
            setSelected(r.id);
          }}
        />
      </Panel>
    ),
    treetable: (
      <Panel title='Requirements by area' padded={false}>
        <TreeTable<GalleryRequirement>
          ariaLabel='Requirements by area'
          framed={false}
          columns={DETAIL_TREE_COLUMNS}
          data={DETAIL_CHILDREN.get(null) ?? []}
          rowKey={(r) => r.id}
          getSubRows={(r) => DETAIL_CHILDREN.get(r.id)}
          selectedKey={selected}
          onSelect={(r) => {
            setSelected(r.id);
          }}
        />
      </Panel>
    ),
    map: (
      <Panel title='Requirement groups' padded={false}>
        <ServiceMap
          ariaLabel='Requirement groups'
          nodes={DETAIL_MAP_NODES}
          edges={DETAIL_MAP_EDGES}
          groups={DETAIL_MAP_GROUPS}
          selectedNodeId={selected}
          focusNodeId={selected}
          onNodeClick={(node) => {
            setSelected(node.id);
          }}
        />
      </Panel>
    ),
  };
  return (
    <div className='gallery__stack gallery__stack--fill'>
      <Tabs
        listOnly
        ariaLabel='List beside the detail'
        items={DETAIL_LISTS}
        activeKey={list.key}
        onChange={(key) => {
          const next = DETAIL_LISTS.find((each) => each.key === key);
          if (next !== undefined) {
            setList(next);
            setSelected(next.opensOn);
          }
        }}
      />
      <div className='gallery__detail-beside-frame'>
        <div ref={setScroller} className='gallery__detail-beside-scroller'>
          <div className='gallery__detail-beside-page'>
            <p className='gallery__panel-body'>
              This frame stands in for the page and opens on {list.opensOn}, far
              down the list. Pick a row: its detail stands level with it, or
              rises until its bottom meets the frame&apos;s; scroll and the
              detail stays in view. At 768 px and below it opens under the row.
            </p>
            {scroller && (
              <DetailBeside
                key={list.key}
                columns='3fr 2fr'
                detail={
                  <GalleryRequirementDetail
                    id={selected}
                    requirements={DETAIL_REQUIREMENTS}
                  />
                }
                revealKey={selected}
                scrollContainer={scroller}
              >
                {lists[list.key]}
              </DetailBeside>
            )}
            <p className='gallery__panel-body'>
              The page goes on after the list.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The group the new data's requirements arrive in, newest first; in the map each is a node after it. */
const DETAIL_ARRIVALS_GROUP = 'A5.3';
/** The tree and the map of the new data, each with the row it selects before any arrive. */
const DETAIL_ARRIVAL_LISTS = DETAIL_LISTS.filter(
  (list) => list.key === 'tree' || list.key === 'map'
);

function arrivedRequirement(n: number): GalleryRequirement {
  const id = `${DETAIL_ARRIVALS_GROUP}.new${String(n)}`;
  return {
    id,
    parent: DETAIL_ARRIVALS_GROUP,
    name: `${id} · Arrived with refresh ${String(n)}`,
    kind: 'requirement',
    statement: `The requirement refresh ${String(n)} brought.`,
  };
}

function DetailBesideRefreshSpecimen(): ReactNode {
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [list, setList] = useState(DETAIL_ARRIVAL_LISTS[0]);
  const [arrived, setArrived] = useState(0);
  const [live, setLive] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  // Written on scroll without a render: a render of this host ends the
  // DetailBeside's following, so it would never show.
  const scrollTopRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!live) {
      return undefined;
    }
    const timer = setInterval(() => {
      setArrived((n) => n + 1);
    }, 2000);
    return () => {
      clearInterval(timer);
    };
  }, [live]);
  const arrivals = Array.from({ length: arrived }, (_, n) =>
    arrivedRequirement(arrived - n)
  );
  const requirements = DETAIL_REQUIREMENTS.flatMap((r) =>
    r.id === DETAIL_ARRIVALS_GROUP ? [r, ...arrivals] : [r]
  );
  const selected =
    picked ?? (arrivals.length === 0 ? list.opensOn : arrivals[0].id);
  const arrivalNodes = arrivals.map((r) => ({ id: r.id, label: r.name }));
  const lists: Record<string, ReactNode> = {
    tree: (
      <Panel title='Requirement tree' padded={false}>
        <TraceTree
          ariaLabel='Requirement tree with new data'
          spans={requirements.map((r) => ({
            id: r.id,
            parentId: r.parent,
            name: r.name,
            kind: r.kind,
          }))}
          selectedId={selected}
          onSelect={(span) => {
            setPicked(span.id);
          }}
          wrapName
        />
      </Panel>
    ),
    map: (
      <Panel title='Requirement groups' padded={false}>
        <ServiceMap
          ariaLabel='Requirement groups with new data'
          nodes={[...DETAIL_MAP_NODES, ...arrivalNodes]}
          edges={[
            ...DETAIL_MAP_EDGES,
            ...arrivalNodes.map((node) => ({
              id: `${DETAIL_ARRIVALS_GROUP}→${node.id}`,
              source: DETAIL_ARRIVALS_GROUP,
              target: node.id,
            })),
          ]}
          groups={DETAIL_MAP_GROUPS.map((group) =>
            group.nodeIds.includes(DETAIL_ARRIVALS_GROUP)
              ? {
                  ...group,
                  nodeIds: [
                    ...group.nodeIds,
                    ...arrivalNodes.map((node) => node.id),
                  ],
                }
              : group
          )}
          selectedNodeId={selected}
          focusNodeId={selected}
          onNodeClick={(node) => {
            setPicked(node.id);
          }}
        />
      </Panel>
    ),
  };
  return (
    <div className='gallery__stack gallery__stack--fill'>
      <Tabs
        listOnly
        ariaLabel='List with new data'
        items={DETAIL_ARRIVAL_LISTS}
        activeKey={list.key}
        onChange={(key) => {
          const next = DETAIL_ARRIVAL_LISTS.find((each) => each.key === key);
          if (next !== undefined) {
            setList(next);
            setPicked(null);
          }
        }}
      />
      <Toolbar
        left={
          <>
            <Button
              tone='secondary'
              onClick={() => {
                setArrived((n) => n + 1);
              }}
            >
              New data
            </Button>
            <Checkbox
              label='New data every 2 s'
              checked={live}
              onChange={setLive}
            />
            <Button
              tone='secondary'
              disabled={picked === null}
              onClick={() => {
                setPicked(null);
              }}
            >
              Back to the default
            </Button>
          </>
        }
        right={
          <MetricLabel>
            frame scrolled <span ref={scrollTopRef}>0</span> px
            {` · ${String(arrived)} arrived · ${picked === null ? `default ${selected}` : `picked ${picked}`}`}
          </MetricLabel>
        }
      />
      <div className='gallery__detail-beside-frame'>
        <div
          ref={setScroller}
          className='gallery__detail-beside-scroller'
          onScroll={(event) => {
            if (scrollTopRef.current !== null) {
              scrollTopRef.current.textContent = String(
                Math.round(event.currentTarget.scrollTop)
              );
            }
          }}
        >
          <div className='gallery__detail-beside-page'>
            <p className='gallery__panel-body'>
              With nothing picked, the selection is a default: the newest
              requirement to arrive in {DETAIL_ARRIVALS_GROUP}, or{' '}
              {list.opensOn} before any has. New data moves it and the rows
              under it; the detail stays level with the selected row and the
              frame does not scroll. In the map the view moves to the new node,
              and at 768 px and below the detail under it stays drawn while it
              does, so the frame keeps its scroll. Picking a row, or going back
              to the default, scrolls to it.
            </p>
            {scroller && (
              <DetailBeside
                key={list.key}
                columns='3fr 2fr'
                detail={
                  <GalleryRequirementDetail
                    id={selected}
                    requirements={requirements}
                  />
                }
                revealKey={picked}
                scrollContainer={scroller}
              >
                {lists[list.key]}
              </DetailBeside>
            )}
            <p className='gallery__panel-body'>
              The page goes on after the list.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageHeaderActionSpecimen() {
  const [created, setCreated] = useState(0);
  return (
    <Specimen
      caption={`with action · onClick · created: ${String(created)}`}
      span={2}
    >
      <PageHeader
        title='Teams'
        description='Organize members into teams.'
        action={
          <Button onClick={() => setCreated((count) => count + 1)}>
            Create team
          </Button>
        }
      />
    </Specimen>
  );
}

export function LayoutsSection() {
  return (
    <GallerySection title='Layouts'>
      <SectionDivider>PageHeader</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='title only' span={2}>
          <PageHeader title='Users' />
        </Specimen>
        <Specimen caption='with description' span={2}>
          <PageHeader
            title='API Keys'
            description='Manage SDK and service API keys for programmatic access.'
          />
        </Specimen>
        <PageHeaderActionSpecimen />
        <Specimen caption='with meta row' span={2}>
          <PageHeader
            title='Checkout latency regression'
            description='external/bench/checkout-latency'
            meta={
              <>
                <Chip tone='info' size='md'>
                  Code check
                </Chip>
                <span>
                  Evaluation version{' '}
                  <MonoValue size='sm'>3f9c2a1b7d04</MonoValue>
                </span>
              </>
            }
          />
        </Specimen>
        <Specimen
          caption='--page-header-margin-bottom · --page-header-title-* · --page-header-description-*'
          span={3}
        >
          <div className='gallery__token-override'>
            <PageHeader
              title='Tasks'
              description='Every task in the current catalog, with its source and content version.'
            />
          </div>
        </Specimen>
        <Specimen
          caption='titleExtra beside the title · description with an avatar'
          span={3}
        >
          <div className='gallery__token-override'>
            <PageHeader
              title='Run 3f9c2a1b'
              titleExtra={
                <>
                  <Chip tone='warning' size='lg'>
                    Failed
                  </Chip>
                  <span>
                    <span className='gallery__figure'>10/11</span> checks passed
                  </span>
                  <span>
                    Outcome <span className='gallery__figure'>0.82</span>
                  </span>
                </>
              }
              description={
                <span className='gallery__specimen-row'>
                  <IdentityCell
                    avatar
                    colorSlot={2}
                    name='claude-opus-4-1'
                    secondary='claude-code'
                    inline
                  />
                  <TimeDisplay value='2026-10-27T09:14:00Z' mode='utc' />
                </span>
              }
            />
          </div>
        </Specimen>
      </div>

      <SectionDivider>PageWrapper</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='--page-padding-inline (-mobile)' span={3}>
          <div className='gallery__token-override gallery__page-wrapper-host'>
            <PageWrapper>
              <div className='gallery__page-wrapper-content'>
                Page content inset by the host&apos;s inline padding.
              </div>
            </PageWrapper>
          </div>
        </Specimen>
      </div>

      <SectionDivider>ColumnLayout</SectionDivider>
      <div className='gallery__stack'>
        <Specimen
          caption="columns='240fr 552fr 360fr' · one column at ≤768 px"
          span={3}
        >
          <div className='gallery__stack gallery__stack--fill'>
            <ColumnLayout columns='240fr 552fr 360fr'>
              <Panel title='Task and criteria'>
                <p className='gallery__panel-body'>Narrow column.</p>
              </Panel>
              <Panel title='Agent answer'>
                <p className='gallery__panel-body'>Wide column.</p>
              </Panel>
              <Panel title='Verdict'>
                <p className='gallery__panel-body'>Side column.</p>
              </Panel>
            </ColumnLayout>
          </div>
        </Specimen>
        <Specimen
          caption="columns='872fr 304fr' · nested columns='1fr' stacks cards · gap='md'"
          span={3}
        >
          <div className='gallery__stack gallery__stack--fill'>
            <ColumnLayout columns='872fr 304fr' gap='md'>
              <Panel title='Instructions'>
                <p className='gallery__panel-body'>Main column.</p>
              </Panel>
              <ColumnLayout columns='1fr' gap='md'>
                <Panel title='Task facts'>
                  <p className='gallery__panel-body'>First card.</p>
                </Panel>
                <Panel title='Checks'>
                  <p className='gallery__panel-body'>Second card.</p>
                </Panel>
              </ColumnLayout>
            </ColumnLayout>
          </div>
        </Specimen>
      </div>

      <SectionDivider>DetailBeside</SectionDivider>
      <Specimen
        caption="columns='3fr 2fr' · scrollContainer · TraceTree, FileTree, DataTable, TreeTable or ServiceMap · the detail under the row at ≤768 px"
        span={3}
      >
        <DetailBesideSpecimen />
      </Specimen>
      <Specimen
        caption='revealKey — the selection as the address names it, null for a default · the page scrolls to the row on the first placement and when revealKey changes; new data that moves the default or the rows only levels the detail with its row · ServiceMap: scroll the frame to the map at 768 px or below and press New data; the view moves to the new node and the frame keeps its scroll'
        span={3}
      >
        <DetailBesideRefreshSpecimen />
      </Specimen>

      <SectionDivider>FormRow</SectionDivider>
      <div className='gallery__stack'>
        <MetricLabel as='div' size='xs'>
          controlId names one control: click the label to focus the field.
        </MetricLabel>
        <FormRow
          label='Display name'
          description='Shown across the platform.'
          controlId='gallery-form-row-name'
        >
          <TextField
            id='gallery-form-row-name'
            aria-describedby='gallery-form-row-name-description'
            defaultValue='Ada Lovelace'
          />
        </FormRow>
        <FormRow
          label='API key'
          description='Treat as a secret.'
          controlId='gallery-form-row-key'
        >
          <PasswordField
            id='gallery-form-row-key'
            aria-describedby='gallery-form-row-key-description'
            defaultValue='secret-token-xxx'
          />
        </FormRow>
        <FormRowFieldsSpecimen />
        <MetricLabel as='div' size='xs'>
          {
            "labelBy='aria-labelledby' names a control a <label> cannot: the control takes the label's id, ${controlId}-label."
          }
        </MetricLabel>
        <FormRowLabelledBySpecimen />
        <FormRowGroupSpecimen />
      </div>

      <SectionDivider>SettingsSection</SectionDivider>
      <SettingsSectionSpecimen />

      <SectionDivider
        extra={
          <MetricLabel>public site · AegisShell is for the console</MetricLabel>
        }
      >
        SiteLayout · SiteNav · SiteSection · SiteFooter
      </SectionDivider>
      <div className='gallery__row'>
        <Specimen
          caption="SiteNav variant='flat' — the top of a page · current item underlined in --accent-brand"
          span={3}
        >
          <div className='gallery__site-frame'>
            <GallerySiteNav variant='flat' />
          </div>
        </Specimen>
      </div>
      <div className='gallery__row'>
        <Specimen
          caption="variant='floating' — after the page scrolls, a glass pill over the content (variant='auto' switches by itself)"
          span={3}
        >
          <div className='gallery__site-frame gallery__site-frame--wash'>
            <GallerySiteNav variant='floating' />
          </div>
        </Specimen>
      </div>
      <div className='gallery__row'>
        <Specimen
          caption='SiteLayout — nav, plain bands divided by a hairline, a tint band edge to edge, footer with outlined wordmark'
          span={3}
        >
          <div className='gallery__site-scroller'>
            <SiteLayout
              nav={<GallerySiteNav variant='flat' />}
              footer={<GallerySiteFooter />}
            >
              <SiteSection>
                <PageHeader
                  title='DBA Bench'
                  description='48 production incidents, five runs each.'
                />
              </SiteSection>
              <SiteSection>
                <p className='gallery__site-copy'>
                  A plain band. Its content sits in the site content column; the
                  hairline above divides it from the band before.
                </p>
              </SiteSection>
              <SiteSection tone='tint'>
                <p className='gallery__site-copy'>
                  A tint band runs edge to edge; its content stays in the
                  column.
                </p>
              </SiteSection>
            </SiteLayout>
          </div>
        </Specimen>
      </div>

      <SectionDivider>SiteSectionHeader · SiteAnchorNav</SectionDivider>
      <div className='gallery__row'>
        <Specimen
          caption='the noun in the eyebrow, the conclusion as the title · actions beside it'
          span={3}
        >
          <div className='gallery__stack gallery__stack--fill'>
            <SiteSectionHeader
              eyebrow='排行榜'
              title='GPT-6.1 Sol 几乎每次都通过，GLM 5.3 Flash 一次也没有'
              lead='通过率 = 通过全部检查的运行 / 总运行。误差线为 90% 区间。'
            />
            <SiteSectionHeader
              eyebrow='报告'
              title='最新发现'
              actions={<a href='#reports'>全部报告 →</a>}
            />
          </div>
        </Specimen>
      </div>
      <div className='gallery__row'>
        <Specimen
          caption='sticks under the nav, follows the scroll, and a click scrolls to the section · chips that scroll sideways on a phone · the nav here is the frame, so scroll inside it'
          span={3}
        >
          <div className='gallery__site-scroller'>
            <SiteLayout nav={<GallerySiteNav variant='flat' />}>
              <SiteSection>
                <SiteSectionHeader as='h3' title='CGFS' />
              </SiteSection>
              <SiteAnchorNav
                items={[
                  { id: 'gallery-anchor-board', label: '排行榜' },
                  { id: 'gallery-anchor-cost', label: '成本与效率' },
                  { id: 'gallery-anchor-models', label: '模型与 Harness' },
                  { id: 'gallery-anchor-failures', label: '失败类型' },
                  { id: 'gallery-anchor-tasks', label: '题目' },
                  { id: 'gallery-anchor-replays', label: '回放' },
                ]}
              />
              {[
                ['gallery-anchor-board', '排行榜'],
                ['gallery-anchor-cost', '成本与效率'],
                ['gallery-anchor-models', '模型与 Harness'],
                ['gallery-anchor-failures', '失败类型'],
                ['gallery-anchor-tasks', '题目'],
                ['gallery-anchor-replays', '回放'],
              ].map(([id, title]) => (
                <SiteSection key={id} id={id}>
                  <SiteSectionHeader as='h3' eyebrow={title} title={title} />
                  <p className='gallery__site-copy'>
                    A section tall enough to scroll past.
                  </p>
                </SiteSection>
              ))}
            </SiteLayout>
          </div>
        </Specimen>
      </div>

      <SectionDivider>DangerZone</SectionDivider>
      <DangerZone description='Once you delete a project, all associated data will be permanently removed. This action cannot be undone.'>
        <div className='gallery__danger-row'>
          <span>
            Delete project <MonoValue size='sm'>catalog-service</MonoValue>
          </span>
          <Button tone='caution'>Delete project</Button>
        </div>
      </DangerZone>
    </GallerySection>
  );
}
