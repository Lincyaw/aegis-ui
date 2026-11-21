import { type ReactElement, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  type AegisApp,
  Breadcrumb,
  DataTable,
  DetailBeside,
  KeyValueList,
  LineIcon,
  type LinkComponent,
  MetricLabel,
  MonoValue,
  Pane,
  PaneLayout,
  PanelTitle,
  SectionDivider,
  ShellMenuToggle,
  StatusDot,
  Toolbar,
  Workbench,
  type WorkbenchTab,
} from '@lincyaw/aegis-ui';

import { CodeSelectionDemo } from './CodeSelectionDemo';

import './shellDemo.css';

const OVERVIEW_GLYPH = (
  <>
    <rect x='4' y='4' width='7' height='7' rx='1.5' />
    <rect x='13' y='4' width='7' height='7' rx='1.5' />
    <rect x='4' y='13' width='7' height='7' rx='1.5' />
    <rect x='13' y='13' width='7' height='7' rx='1.5' />
  </>
);

const REQUIREMENTS_GLYPH = <path d='M5 6h14M5 12h14M5 18h9' />;

const CODE_GLYPH = <path d='m8 7-5 5 5 5m8-10 5 5-5 5m-2-12-4 14' />;

const EVENTS = [
  {
    at: '13:01',
    tone: 'warning',
    text: '运行 e3b0aa32 暂停：需求冲突（可测试性）',
  },
  { at: '12:40', tone: 'success', text: '修复 #1（完成待办）通过' },
  { at: '12:31', tone: 'caution', text: '检查（可测试性）：操作日志未写入' },
  { at: '11:58', tone: 'info', text: 'Issue #12 已整理为需求提交 3v14vrqi' },
] as const;

function PageBar({ title }: { title: string }): ReactElement {
  return (
    <Toolbar
      variant='page'
      left={
        <>
          <ShellMenuToggle />
          <PanelTitle as='h1'>{title}</PanelTitle>
        </>
      }
    />
  );
}

function OverviewPage(): ReactElement {
  return (
    <>
      <PageBar title='概览' />
      <Toolbar
        variant='sub'
        left={
          <>
            <span>
              当前运行 <MonoValue size='sm'>e3b0aa32</MonoValue>
            </span>
            <span>
              需求提交 <MonoValue size='sm'>3v14vrqi</MonoValue>
            </span>
            <span>验收 2 / 3 区域通过</span>
          </>
        }
      />
      <PaneLayout>
        <Pane label='区域状态'>
          <div className='shell-demo__stack'>
            <SectionDivider variant='group' extra={<span>3</span>}>
              区域状态
            </SectionDivider>
            <span className='shell-demo__row'>
              <StatusDot tone='success' /> 完成待办
            </span>
            <span className='shell-demo__row'>
              <StatusDot tone='success' /> 记录待办
            </span>
            <span className='shell-demo__row'>
              <StatusDot tone='warning' /> 可测试性
            </span>
          </div>
        </Pane>
        <Pane size='lg' label='事件'>
          <div className='shell-demo__stack'>
            <SectionDivider variant='group'>事件</SectionDivider>
            {EVENTS.map((event) => (
              <span key={event.at} className='shell-demo__row'>
                <MetricLabel>{event.at}</MetricLabel>
                <StatusDot tone={event.tone} />
                {event.text}
              </span>
            ))}
          </div>
        </Pane>
      </PaneLayout>
    </>
  );
}

function CodePage(): ReactElement {
  return (
    <>
      <PageBar title='代码' />
      <Toolbar
        variant='sub'
        left={
          <>
            <span>追溯</span>
            <Breadcrumb
              variant='trace'
              ariaLabel='追溯'
              items={[
                { kind: '文件', label: 'src/clock.py', current: true },
                { kind: '模块', label: '根/clock', to: '#module' },
                {
                  kind: '需求',
                  label: 'testability.clock-drives-time',
                  to: '#requirement',
                },
              ]}
            />
          </>
        }
      />
      <PaneLayout>
        <Pane size='sm' label='文件'>
          <div className='shell-demo__stack'>
            <MonoValue size='sm'>src/app.py</MonoValue>
            <MonoValue size='sm'>src/clock.py</MonoValue>
            <MonoValue size='sm'>src/store.py</MonoValue>
          </div>
        </Pane>
        <Pane label='文件内容'>
          <CodeSelectionDemo />
        </Pane>
      </PaneLayout>
    </>
  );
}

interface DemoRequirement {
  id: string;
  name: string;
}

const REQUIREMENTS: DemoRequirement[] = Array.from(
  { length: 60 },
  (_, index) => ({
    id: `R${String(index + 1).padStart(2, '0')}`,
    name: `需求 ${String(index + 1)}：时钟驱动时间，记录可追溯`,
  })
);

/**
 * A bleed page whose list and detail are DetailBeside's panes; it opens
 * on a row far down, so at 768 px and below, where the page grows with
 * its stacked panes and the window scrolls, the reveal scrolls the window.
 */
function RequirementsPage(): ReactElement {
  const [selected, setSelected] = useState('R52');
  return (
    <>
      <PageBar title='需求' />
      <PaneLayout>
        <DetailBeside
          layout='panes'
          listPane={{ label: '需求', padding: 'none' }}
          detailPane={{ label: '详情' }}
          detail={
            <KeyValueList
              items={[
                { k: '需求', v: <MonoValue size='sm'>{selected}</MonoValue> },
                { k: '状态', v: '通过' },
              ]}
            />
          }
          revealKey={selected}
        >
          <DataTable<DemoRequirement>
            ariaLabel='需求'
            framed={false}
            columns={[
              { key: 'id', header: 'ID', width: 96, render: (r) => r.id },
              { key: 'name', header: '需求', render: (r) => r.name },
            ]}
            data={REQUIREMENTS}
            rowKey={(r) => r.id}
            selectedKeys={[selected]}
            onRowClick={(r) => {
              setSelected(r.id);
            }}
          />
        </DetailBeside>
      </PaneLayout>
    </>
  );
}

const DemoLink: LinkComponent = ({
  to,
  className,
  'aria-current': ariaCurrent,
  'aria-label': ariaLabel,
  tabIndex,
  children,
}) => (
  <Link
    to={to}
    className={className}
    aria-current={ariaCurrent}
    aria-label={ariaLabel}
    tabIndex={tabIndex}
  >
    {children}
  </Link>
);

const AREAS = Array.from({ length: 12 }, (_, index) => ({
  id: `A${String(index + 1)}`,
  name: `区域 ${String(index + 1)}`,
}));

interface WorkbenchState {
  /** Open records; a preview one is marked with a leading `~`. */
  open: string[];
  active: string | null;
}

function workbenchHref(state: WorkbenchState): string {
  const params = new URLSearchParams();
  if (state.open.length > 0) {
    params.set('open', state.open.join(','));
  }
  if (state.active !== null) {
    params.set('active', state.active);
  }
  const query = params.toString();
  return query === '' ? '?' : `?${query}`;
}

/**
 * A bleed page of a Workbench over 60 requirements with an area pane before
 * them; its tabs live in the address, as a host keeps them.
 */
function WorkbenchPage(): ReactElement {
  const [params] = useSearchParams();
  // ?leading=none shows the page without its area pane, and keeps it so.
  const noLeading = params.get('leading') === 'none';
  const pageHref = (next: WorkbenchState): string => {
    const href = workbenchHref(next);
    if (!noLeading) {
      return href;
    }
    return href === '?' ? '?leading=none' : `${href}&leading=none`;
  };
  const open = (params.get('open') ?? '').split(',').filter(Boolean);
  const active = params.get('active');
  const keyOf = (entry: string): string => entry.replace(/^~/, '');
  const state: WorkbenchState = { open, active };
  const openHref = (id: string, pinned: boolean): string => {
    const has = open.find((entry) => keyOf(entry) === id);
    const next = has
      ? open.map((entry) => (keyOf(entry) === id && pinned ? id : entry))
      : [
          ...open.filter((entry) => !entry.startsWith('~')),
          pinned ? id : `~${id}`,
        ];
    return pageHref({ open: next, active: id });
  };
  const tabs: WorkbenchTab[] = open.map((entry) => {
    const id = keyOf(entry);
    const rest = open.filter((other) => keyOf(other) !== id);
    return {
      key: id,
      name: REQUIREMENTS.find((r) => r.id === id)?.name ?? id,
      href: pageHref({ ...state, active: id }),
      closeHref: pageHref({
        open: rest,
        active: active === id ? (rest[0] ? keyOf(rest[0]) : null) : active,
      }),
      pinHref: openHref(id, true),
      pinned: !entry.startsWith('~'),
      active: id === active,
    };
  });
  const record = REQUIREMENTS.find((r) => r.id === active);
  return (
    <>
      <PageBar title='需求工作台' />
      <Workbench
        tabs={tabs}
        backHref={pageHref({ ...state, active: null })}
        linkComponent={DemoLink}
        listLabel='需求'
        listSize='md'
        leadingLabel='区域'
        leading={
          noLeading ? undefined : (
            <DataTable
              ariaLabel='区域'
              framed={false}
              columns={[{ key: 'name', header: '区域', render: (a) => a.name }]}
              data={AREAS}
              rowKey={(a) => a.id}
            />
          )
        }
        listPinHref={(href) => {
          const id = new URLSearchParams(href.slice(1)).get('active');
          return id === null ? null : openHref(id, true);
        }}
        detail={
          record && (
            <div className='shell-demo__workbench-detail'>
              <PanelTitle as='h2'>{record.name}</PanelTitle>
              <KeyValueList
                items={[
                  {
                    k: '需求',
                    v: <MonoValue size='sm'>{record.id}</MonoValue>,
                  },
                  { k: '状态', v: '通过' },
                ]}
              />
            </div>
          )
        }
      >
        <DataTable<DemoRequirement>
          ariaLabel='需求'
          framed={false}
          columns={[
            { key: 'id', header: 'ID', width: 96, render: (r) => r.id },
            {
              key: 'name',
              header: '需求',
              truncate: false,
              render: (r) => (
                <DemoLink to={openHref(r.id, false)}>{r.name}</DemoLink>
              ),
            },
          ]}
          data={REQUIREMENTS}
          rowKey={(r) => r.id}
          selectedKeys={active === null ? [] : [active]}
        />
      </Workbench>
    </>
  );
}

/**
 * The shell with `chrome="sidebar"`: brand and controls in the sidebar,
 * bleed pages of bars over panes, the drawer toggle in each page's bar.
 * The console sets `mobileBar`, so at 768 px and below the toggle, the
 * brand and the header actions sit in the shell's bar above the page.
 */
export const shellDemoApp: AegisApp = {
  id: 'shell-demo',
  label: 'Sidebar chrome demo',
  icon: <LineIcon>{OVERVIEW_GLYPH}</LineIcon>,
  basePath: '/shell-demo',
  description: 'AegisShell chrome="sidebar" with bleed pane pages.',
  requiresAuth: false,
  chrome: 'sidebar',
  bleed: true,
  breadcrumbBar: false,
  sidebar: [
    {
      items: [
        {
          to: '',
          label: '概览',
          end: true,
          icon: <LineIcon>{OVERVIEW_GLYPH}</LineIcon>,
        },
        {
          to: 'requirements',
          label: '需求',
          icon: <LineIcon>{REQUIREMENTS_GLYPH}</LineIcon>,
        },
        { to: 'code', label: '代码', icon: <LineIcon>{CODE_GLYPH}</LineIcon> },
        {
          to: 'workbench',
          label: '工作台',
          icon: <LineIcon>{REQUIREMENTS_GLYPH}</LineIcon>,
        },
      ],
    },
  ],
  routes: [
    { path: '', element: <OverviewPage /> },
    { path: 'requirements', element: <RequirementsPage /> },
    { path: 'code', element: <CodePage /> },
    { path: 'workbench', element: <WorkbenchPage /> },
  ],
};
