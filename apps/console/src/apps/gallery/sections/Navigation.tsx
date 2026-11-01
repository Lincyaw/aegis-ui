import { type ReactNode, useState } from 'react';

import {
  AppstoreOutlined,
  ArrowRightOutlined,
  DeleteOutlined,
  DotChartOutlined,
  DownloadOutlined,
  InboxOutlined,
  LogoutOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Button as AegisButton,
  AuthLayout,
  Avatar,
  Breadcrumb,
  ButtonLink,
  Carousel,
  type CarouselSlide,
  Chip,
  DataTable,
  DropdownMenu,
  EnvironmentSwitcher,
  type EnvironmentSwitcherOption,
  ErrorState,
  ForgotPasswordForm,
  IdentityCell,
  LoginForm,
  MetricLabel,
  MonoValue,
  PageSizeSelect,
  Panel,
  PanelTitle,
  PasswordField,
  ProjectSelector,
  RegisterForm,
  Tabs as RosettaTabs,
  SectionDivider,
  TableOfContents,
  type TableOfContentsItem,
  TextField,
} from '@lincyaw/aegis-ui';
import { Button } from 'antd';

import { GALLERY_RUN_COLUMNS } from '../columns';
import { GALLERY_ACTIONS, GALLERY_RUNS } from '../fixtures';
import { Specimen } from '../shared';

/* ── Button specimens ──────────────────────────────────────────────── */

function ButtonPressedSpecimen() {
  const [failedOnly, setFailedOnly] = useState(true);
  const [unreviewed, setUnreviewed] = useState(false);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
      <AegisButton
        tone='secondary'
        aria-pressed={failedOnly}
        onClick={() => setFailedOnly(!failedOnly)}
      >
        Failed only
      </AegisButton>
      <AegisButton
        tone='ghost'
        aria-pressed={unreviewed}
        onClick={() => setUnreviewed(!unreviewed)}
      >
        Unreviewed
      </AegisButton>
    </div>
  );
}

interface ButtonGlassStageProps {
  children: ReactNode;
}

function ButtonGlassStage({ children }: ButtonGlassStageProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-2)',
        padding: 'var(--space-6)',
        borderRadius: 'var(--radius-lg)',
        background:
          'radial-gradient(circle at 15% 30%, var(--ambient-1), transparent 60%), radial-gradient(circle at 85% 70%, var(--ambient-3), transparent 60%), var(--bg-tint)',
      }}
    >
      {children}
    </div>
  );
}

const AVATAR_SAMPLE_SRC = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#3C56F4"/><circle cx="40" cy="32" r="14" fill="#EEF1FE"/><rect x="16" y="52" width="48" height="40" rx="20" fill="#EEF1FE"/></svg>'
)}`;

const GALLERY_CHAOS_FAMILIES = [
  'Pod',
  'Container',
  'Network',
  'Stress',
  'HTTP',
  'JVM',
  'DNS',
  'Time',
].map((name) => ({ key: name.toLowerCase(), label: `${name} chaos` }));

const GALLERY_TASK_SECTIONS = [
  { key: 'rubric', label: 'Rubric 12' },
  { key: 'results', label: 'Results 15' },
  { key: 'files', label: 'Files 46' },
  { key: 'versions', label: 'Versions 10' },
];

const GALLERY_SITE_SECTIONS = [
  {
    key: 'overview',
    label: (
      <>
        <AppstoreOutlined />
        <span>Overview</span>
      </>
    ),
  },
  {
    key: 'tasks',
    label: (
      <>
        <InboxOutlined />
        <span>Tasks</span>
      </>
    ),
  },
  {
    key: 'results',
    label: (
      <>
        <DotChartOutlined />
        <span>Results</span>
      </>
    ),
  },
];

function TabsSegmentedSpecimen(): ReactNode {
  const [section, setSection] = useState('rubric');
  const [site, setSite] = useState('tasks');
  return (
    <div className='gallery__row'>
      <Specimen
        caption='default · tabpanel under the list · Overview fires an agent action'
        span={3}
      >
        <RosettaTabs
          items={[
            {
              key: 'overview',
              label: 'Overview',
              action: GALLERY_ACTIONS.tabOverview,
            },
            { key: 'params', label: 'Parameters' },
            { key: 'logs', label: 'Logs' },
          ]}
          defaultActiveKey='overview'
        >
          <p className='gallery__panel-body'>Tab panel content goes here.</p>
        </RosettaTabs>
      </Specimen>
      <Specimen caption='count after the label · controlled' span={2}>
        <RosettaTabs
          listOnly
          items={GALLERY_TASK_SECTIONS}
          activeKey={section}
          onChange={setSection}
        />
      </Specimen>
      <Specimen caption='icon + label' span={2}>
        <RosettaTabs
          listOnly
          items={GALLERY_SITE_SECTIONS}
          activeKey={site}
          onChange={setSite}
        />
      </Specimen>
    </div>
  );
}

function TabsViewSwitchSpecimen(): ReactNode {
  const [view, setView] = useState('answer');
  const views = [
    { key: 'answer', label: 'Answer and grading' },
    { key: 'trajectory', label: 'Trajectory' },
  ];
  return (
    <div className='gallery__row'>
      <Specimen caption='listOnly · no tabpanel under the list' span={2}>
        <RosettaTabs
          listOnly
          items={views}
          activeKey={view}
          onChange={setView}
        />
      </Specimen>
      <Specimen caption="listOnly · size='sm' · --size-control-base tall">
        <RosettaTabs
          listOnly
          size='sm'
          items={views}
          activeKey={view}
          onChange={setView}
        />
      </Specimen>
    </div>
  );
}

function TabsOverflowSpecimen(): ReactNode {
  const [active, setActive] = useState('network');
  const step = (delta: number): void => {
    const count = GALLERY_CHAOS_FAMILIES.length;
    const index = GALLERY_CHAOS_FAMILIES.findIndex((f) => f.key === active);
    setActive(GALLERY_CHAOS_FAMILIES[(index + delta + count) % count].key);
  };
  return (
    <div className='gallery__row'>
      <Specimen caption="overflow · defaultActiveKey='jvm' scrolled into view">
        <RosettaTabs items={GALLERY_CHAOS_FAMILIES} defaultActiveKey='jvm' />
      </Specimen>
      <Specimen
        caption='overflow · active tab follows Previous / Next'
        span={2}
      >
        <RosettaTabs
          items={GALLERY_CHAOS_FAMILIES}
          activeKey={active}
          onChange={setActive}
        >
          <div className='gallery__row'>
            <AegisButton
              tone='secondary'
              onClick={() => {
                step(-1);
              }}
            >
              Previous
            </AegisButton>
            <AegisButton
              tone='secondary'
              onClick={() => {
                step(1);
              }}
            >
              Next
            </AegisButton>
          </div>
        </RosettaTabs>
      </Specimen>
    </div>
  );
}

interface GalleryCarouselCopyProps {
  eyebrow: string;
  title: string;
  lead: string;
  action: string;
}

function GalleryCarouselCopy({
  eyebrow,
  title,
  lead,
  action,
}: GalleryCarouselCopyProps): ReactNode {
  return (
    <div className='gallery__carousel-copy'>
      <p className='gallery__carousel-eyebrow'>{eyebrow}</p>
      <p className='gallery__carousel-title'>{title}</p>
      <p className='gallery__carousel-lead'>{lead}</p>
      <AegisButton>{action}</AegisButton>
    </div>
  );
}

const GALLERY_CAROUSEL_SLIDES: CarouselSlide[] = [
  {
    key: 'benchmark',
    label: '基准介绍',
    content: (
      <GalleryCarouselCopy
        eyebrow='基准介绍 · 数据更新于 2026-10-28'
        title='可追溯的运维诊断评测'
        lead='公开 11 道题，另有未公开题；结果只计入可比的运行。'
        action='查看展示集'
      />
    ),
  },
  {
    key: 'replay',
    label: '运行回放',
    content: (
      <GalleryCarouselCopy
        eyebrow='运行回放 · 部署回滚后为批量导出审批执行计划'
        title='看 Agent 一步步定位故障'
        lead='回放一次真实运行：它查了什么、改了什么，评分怎样逐项判定。'
        action='查看这次运行'
      />
    ),
  },
  {
    key: 'grading',
    label: '评分过程',
    content: (
      <GalleryCarouselCopy
        eyebrow='评分过程'
        title='一道题怎样算正确'
        lead='评分项分属结果、安全、诊断三个维度，判定规则写明维度怎样合成结论。'
        action='查看评分标准'
      />
    ),
  },
  {
    key: 'article',
    label: '最新文章',
    content: (
      <GalleryCarouselCopy
        eyebrow='评分方法 · 2026-10-28 · 约 5 分钟'
        title='我们怎么评分'
        lead='每道题都有一份评分定义，评分器只按它执行。'
        action='阅读全文'
      />
    ),
  },
];

function CarouselControlledSpecimen(): ReactNode {
  const keys = GALLERY_CAROUSEL_SLIDES.map((slide) => slide.key);
  const [activeKey, setActiveKey] = useState(keys[0]);
  const step = (offset: number) => {
    const index = keys.indexOf(activeKey);
    setActiveKey(keys[(index + offset + keys.length) % keys.length]);
  };
  return (
    <div className='gallery__row'>
      <Specimen
        caption='controlled · activeKey + onChange · the tabs and autoplay both report through onChange'
        span={3}
      >
        <div className='gallery__stack gallery__stack--fill'>
          <Carousel
            ariaLabel='受控轮播'
            slides={GALLERY_CAROUSEL_SLIDES}
            activeKey={activeKey}
            onChange={setActiveKey}
          />
          <div className='gallery__row'>
            <AegisButton tone='secondary' onClick={() => step(-1)}>
              上一张
            </AegisButton>
            <AegisButton tone='secondary' onClick={() => step(1)}>
              下一张
            </AegisButton>
            <MetricLabel>activeKey {activeKey}</MetricLabel>
          </div>
        </div>
      </Specimen>
    </div>
  );
}

const GALLERY_TOC_STATE_ITEMS: TableOfContentsItem[] = [
  { id: 'gallery-toc-state-pass', label: '一道题怎样算正确' },
  { id: 'gallery-toc-state-gate', label: '门槛与评分项' },
  { id: 'gallery-toc-state-old-runs', label: '旧运行怎样处理' },
  {
    id: 'gallery-toc-state-digest',
    label: '规则摘要改变时，旧运行要重新评分或重新运行',
    level: 2,
  },
  { id: 'gallery-toc-state-regrade', label: '重新评分', level: 2 },
  { id: 'gallery-toc-state-regrade-records', label: '读取哪些记录', level: 3 },
  { id: 'gallery-toc-state-bars', label: '结果条怎样读' },
];

const GALLERY_TOC_SCROLL_SECTIONS: Array<
  TableOfContentsItem & { body: string }
> = [
  {
    id: 'gallery-toc-scroll-pass',
    label: '一道题怎样算正确',
    body: '每道题的评分由 tests/grading.toml 定义：先检查门槛，门槛通过后再逐项检查评分项。所有必需的评分项都通过，这道题才算正确。',
  },
  {
    id: 'gallery-toc-scroll-gate',
    label: '门槛与评分项',
    body: '门槛检查回答的格式与必需字段；评分项检查回答里的每个结论是否与参考一致。门槛未通过时，后面的评分项不再检查。',
  },
  {
    id: 'gallery-toc-scroll-old-runs',
    label: '旧运行怎样处理',
    body: '题目的评分规则改变后，旧运行先按新规则重新评分；记录里缺少新规则所需的测量时，只能重新运行。',
  },
  {
    id: 'gallery-toc-scroll-regrade',
    label: '重新评分',
    level: 2,
    body: '重新评分读取记录下来的回答与产物，用新规则评一次；原来的评分保留，新的评分成为当前评分。',
  },
  {
    id: 'gallery-toc-scroll-regrade-records',
    label: '读取哪些记录',
    level: 3,
    body: '每次运行保存回答、命令输出与评分时读取的文件；重新评分只读这些记录，不再访问运行环境。',
  },
  {
    id: 'gallery-toc-scroll-bars',
    label: '结果条怎样读',
    body: '结果条按正确、错误与执行失败分段；执行失败不计入模型结果。',
  },
];

function TableOfContentsStatesSpecimen(): ReactNode {
  const [current, setCurrent] = useState('gallery-toc-state-pass');
  return (
    <div className='gallery__row'>
      <Specimen
        caption='currentId · current item Strong + --accent-brand indicator, others Body + --border-hairline; click to move it'
        span={2}
      >
        <TableOfContents
          items={GALLERY_TOC_STATE_ITEMS}
          currentId={current}
          onCurrentChange={setCurrent}
        />
      </Specimen>
      <Specimen caption='level=2 current · level 2 and 3 labels indent by --space-3 and --space-6; a long label wraps and its indicator follows'>
        <TableOfContents
          items={GALLERY_TOC_STATE_ITEMS}
          currentId='gallery-toc-state-digest'
        />
      </Specimen>
    </div>
  );
}

function TableOfContentsScrollSpecimen(): ReactNode {
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  return (
    <div className='gallery__row'>
      <Specimen
        caption='scrollContainer · the item follows the scroll; a click scrolls smoothly (instantly under reduced motion), puts the section in the URL hash and moves focus to it; at the end of the scroll the short last section becomes current'
        span={3}
      >
        <div className='gallery__toc-demo'>
          <TableOfContents
            items={GALLERY_TOC_SCROLL_SECTIONS}
            scrollContainer={scroller}
          />
          <div ref={setScroller} className='gallery__toc-scroller'>
            {GALLERY_TOC_SCROLL_SECTIONS.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className='gallery__toc-section'
              >
                <h3 className='gallery__toc-heading'>{section.label}</h3>
                <p className='gallery__panel-body'>{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </Specimen>
    </div>
  );
}

function PageSizeSelectSpecimen(): ReactNode {
  const [size, setSize] = useState(20);
  const [customSize, setCustomSize] = useState(25);
  const [panelSize, setPanelSize] = useState(10);
  return (
    <div className='gallery__row'>
      <Specimen caption='default · [10, 20, 50, 100]'>
        <PageSizeSelect value={size} onChange={setSize} />
      </Specimen>
      <Specimen caption='disabled'>
        <PageSizeSelect
          value={50}
          onChange={() => {
            /* no-op */
          }}
          disabled
        />
      </Specimen>
      <Specimen caption='custom options · [5, 25, 100]'>
        <PageSizeSelect
          value={customSize}
          onChange={setCustomSize}
          options={[5, 25, 100]}
          label='Page size'
        />
      </Specimen>
      <Specimen
        caption='DataTable footer in a Panel · one row · panel opens above the table'
        span={3}
      >
        <Panel title='Runs' padded={false} className='gallery__menu-host'>
          <DataTable
            framed={false}
            columns={GALLERY_RUN_COLUMNS}
            data={GALLERY_RUNS.slice(0, 1)}
            rowKey={(row) => row.id}
            pagination={{
              page: 1,
              pageSize: panelSize,
              total: GALLERY_RUNS.length,
              pageSizeOptions: [5, 10, 20, 50, 100],
              onChange: (_page, nextSize) => {
                setPanelSize(nextSize);
              },
            }}
          />
        </Panel>
      </Specimen>
    </div>
  );
}

function EnvironmentSwitcherSpecimen(): ReactNode {
  const options: EnvironmentSwitcherOption[] = [
    {
      id: 'prod',
      label: 'Production',
      badge: 'default',
      hint: 'https://api.example.com',
      action: GALLERY_ACTIONS.envSelectProd,
    },
    {
      id: 'stage',
      label: 'Staging',
      badge: 'warning',
      hint: 'https://api-stage.example.com',
    },
    {
      id: 'dev',
      label: 'Dev',
      badge: 'info',
      hint: 'https://api-dev.example.com',
    },
    {
      id: 'canary',
      label: 'Canary',
      badge: 'danger',
      hint: 'https://api-canary.example.com',
    },
  ];
  const [current, setCurrent] = useState('prod');
  return (
    <div className='gallery__row'>
      <Specimen caption='static manifest stub'>
        <EnvironmentSwitcher
          options={options}
          currentId={current}
          onChange={setCurrent}
        />
      </Specimen>
      <Specimen caption='single env · hidden by default'>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <EnvironmentSwitcher
            options={options.slice(0, 1)}
            currentId='prod'
            onChange={() => {
              /* no-op */
            }}
          />
          <MetricLabel>Switcher hidden when ≤1 env</MetricLabel>
        </div>
      </Specimen>
      <Specimen caption='no manifest · hidden state'>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <EnvironmentSwitcher
            options={[]}
            currentId=''
            onChange={() => {
              /* no-op */
            }}
          />
          <MetricLabel>Switcher hidden when no envs</MetricLabel>
        </div>
      </Specimen>
    </div>
  );
}

export function NavigationSection() {
  return (
    <Panel title={<PanelTitle size='lg'>Navigation · Rosetta</PanelTitle>}>
      <SectionDivider
        extra={
          <MetricLabel>Selected indicator slides · --motion-base</MetricLabel>
        }
      >
        Tabs
      </SectionDivider>
      <TabsSegmentedSpecimen />

      <SectionDivider>Tabs · overflow</SectionDivider>
      <TabsOverflowSpecimen />

      <SectionDivider>Tabs · view switch</SectionDivider>
      <TabsViewSwitchSpecimen />

      <SectionDivider>Carousel</SectionDivider>
      <div className='gallery__row'>
        <Specimen
          caption="uncontrolled · defaultActiveKey='replay' · hover or focus pauses the progress bar · the button stops autoplay until pressed again"
          span={3}
        >
          <Carousel
            ariaLabel='首页轮播'
            slides={GALLERY_CAROUSEL_SLIDES}
            defaultActiveKey='replay'
            className='gallery__stack--fill'
          />
        </Specimen>
      </div>

      <SectionDivider>Carousel · controlled</SectionDivider>
      <CarouselControlledSpecimen />

      <SectionDivider
        extra={<MetricLabel>Pill · 32 high · lifts on hover</MetricLabel>}
      >
        Button
      </SectionDivider>
      <div className='gallery__row'>
        <Specimen caption="tone='primary'">
          <AegisButton>Run evaluation</AegisButton>
        </Specimen>
        <Specimen caption="tone='secondary'">
          <AegisButton tone='secondary'>Compare models</AegisButton>
        </Specimen>
        <Specimen caption="tone='ghost'">
          <AegisButton tone='ghost'>View script</AegisButton>
        </Specimen>
        <Specimen caption="icon · iconPosition='start'">
          <AegisButton tone='secondary' icon={<DownloadOutlined />}>
            Download
          </AegisButton>
        </Specimen>
        <Specimen caption="icon · iconPosition='end'">
          <AegisButton
            tone='ghost'
            icon={<ArrowRightOutlined />}
            iconPosition='end'
          >
            All runs
          </AegisButton>
        </Specimen>
        <Specimen caption='aria-pressed · toggle filters' span={2}>
          <ButtonPressedSpecimen />
        </Specimen>
        <Specimen caption='disabled' span={2}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--space-2)',
            }}
          >
            <AegisButton disabled>Run evaluation</AegisButton>
            <AegisButton tone='secondary' disabled>
              Compare models
            </AegisButton>
            <AegisButton tone='ghost' disabled>
              View script
            </AegisButton>
          </div>
        </Specimen>
        <Specimen caption="tone='glass' · on a tinted backdrop" span={2}>
          <ButtonGlassStage>
            <AegisButton tone='glass'>Read the method</AegisButton>
            <AegisButton tone='glass' icon={<DownloadOutlined />}>
              Download
            </AegisButton>
            <AegisButton>Open results</AegisButton>
          </ButtonGlassStage>
        </Specimen>
      </div>

      <SectionDivider
        extra={<MetricLabel>Button look · link behaviour</MetricLabel>}
      >
        ButtonLink
      </SectionDivider>
      <div className='gallery__row'>
        <Specimen caption="tone='primary' · opens another page">
          <ButtonLink to='#button-link'>View the representative run</ButtonLink>
        </Specimen>
        <Specimen caption="tone='secondary' · icon at the end">
          <ButtonLink
            tone='secondary'
            to='#button-link'
            icon={<ArrowRightOutlined />}
            iconPosition='end'
          >
            All collections
          </ButtonLink>
        </Specimen>
        <Specimen caption="tone='ghost'">
          <ButtonLink tone='ghost' to='#button-link'>
            All 100 runs
          </ButtonLink>
        </Specimen>
        <Specimen caption="tone='glass' · on a tinted backdrop" span={2}>
          <ButtonGlassStage>
            <ButtonLink
              tone='glass'
              to='#button-link'
              icon={<ArrowRightOutlined />}
              iconPosition='end'
            >
              How we grade
            </ButtonLink>
          </ButtonGlassStage>
        </Specimen>
      </div>

      <SectionDivider>Breadcrumb</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='simple'>
          <Breadcrumb items={[{ label: 'Dashboard' }]} />
        </Specimen>
        <Specimen caption='with links' span={2}>
          <Breadcrumb
            items={[
              { label: 'Projects', to: '/projects' },
              { label: 'catalog-service', to: '/projects/1' },
              { label: 'Injections' },
            ]}
          />
        </Specimen>
        <Specimen caption='long item truncates with an ellipsis' span={3}>
          <Breadcrumb
            items={[
              { label: 'Results', to: '/results' },
              {
                label:
                  'external/bench/checkout-latency-regression-under-sustained-write-load-after-the-index-rebuild',
                to: '/tasks/3f9c2a1b7d04',
              },
              { label: 'Run 3f9c2a1b' },
            ]}
          />
        </Specimen>
      </div>

      <SectionDivider>TableOfContents · states</SectionDivider>
      <TableOfContentsStatesSpecimen />

      <SectionDivider>TableOfContents · scroll tracking</SectionDivider>
      <TableOfContentsScrollSpecimen />

      <SectionDivider>Avatar</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='initials · sm'>
          <Avatar
            size='sm'
            name='Ada Lovelace'
            surface={{
              id: 'gallery.avatar.ada',
              kind: 'entity',
              label: 'Ada Lovelace',
              askSuggestions: ['Who is this user?'],
              project: (data) => ({
                entities: [{ id: 'user-ada', type: 'user', label: data.name }],
                fields: [{ name: 'name', type: 'string', value: data.name }],
              }),
            }}
          />
        </Specimen>
        <Specimen caption='initials · md'>
          <Avatar size='md' name='Grace Hopper' />
        </Specimen>
        <Specimen caption='initials · lg'>
          <Avatar size='lg' name='Alan Turing' />
        </Specimen>
        <Specimen caption='icon fallback'>
          <Avatar size='md' name='User' icon={<UserOutlined />} />
        </Specimen>
        <Specimen caption='from image'>
          <Avatar size='lg' name='Linus Torvalds' src={AVATAR_SAMPLE_SRC} />
        </Specimen>
        <Specimen caption='status · online'>
          <Avatar size='lg' name='Margaret Hamilton' status='online' />
        </Specimen>
        <Specimen caption='status · busy'>
          <Avatar size='lg' name='Donald Knuth' status='busy' />
        </Specimen>
        <Specimen caption='status · away'>
          <Avatar size='lg' name='Edsger Dijkstra' status='away' />
        </Specimen>
        <Specimen caption='status · offline'>
          <Avatar size='lg' name='Barbara Liskov' status='offline' />
        </Specimen>
      </div>
      <div className='gallery__row'>
        {([1, 2, 3, 4, 5, 6] as const).map((slot) => (
          <Specimen key={slot} caption={`colorSlot={${String(slot)}} · sm`}>
            <Avatar size='sm' name={`model ${String(slot)}`} colorSlot={slot} />
          </Specimen>
        ))}
      </div>

      <SectionDivider
        extra={<MetricLabel>Body name · mono id or path</MetricLabel>}
      >
        IdentityCell
      </SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='avatar · colorSlot · link · mono secondary'>
          <IdentityCell
            avatar
            colorSlot={2}
            name='claude-opus-4-1'
            secondary='13c2dea9bcbb'
            to='#identity-cell'
          />
        </Specimen>
        <Specimen caption='no avatar · link · source path'>
          <IdentityCell
            name='checkout-latency-regression'
            secondary='external / bench / checkout-latency-regression'
            to='#identity-cell'
          />
        </Specimen>
        <Specimen caption='inline · plain name'>
          <IdentityCell
            avatar
            colorSlot={4}
            name='gpt-5'
            secondary='3f9c2a1b7d04'
            inline
          />
        </Specimen>
        <Specimen caption='long name and secondary truncate'>
          <div className='gallery__narrow-cell'>
            <IdentityCell
              avatar
              name='qwen3-coder-480b-a35b-instruct-preview'
              secondary='external/swe-bench/qwen3-coder-480b-a35b-instruct'
              to='#identity-cell'
            />
          </div>
        </Specimen>
      </div>
      <div className='gallery__row'>
        <Specimen caption='name only · avatar · colorSlot · link'>
          <IdentityCell
            avatar
            colorSlot={1}
            name='claude-opus-4-1'
            to='#identity-cell'
          />
        </Specimen>
        <Specimen caption='name only · plain text'>
          <IdentityCell avatar colorSlot={3} name='deepseek-v3.2' />
        </Specimen>
        <Specimen caption='name only · long name truncates'>
          <div className='gallery__narrow-cell'>
            <IdentityCell
              avatar
              colorSlot={5}
              name='qwen3-coder-480b-a35b-instruct-preview'
              to='#identity-cell'
            />
          </div>
        </Specimen>
        <Specimen caption='wrap · long name and secondary wrap'>
          <div className='gallery__narrow-cell'>
            <IdentityCell
              name='部署回滚后为批量导出审批执行计划'
              secondary='30434932d311 · external/dba-bench/tidb-sql-binding-approval-for-batch-export-after-rollback'
              to='#identity-cell'
              wrap
            />
          </div>
        </Specimen>
      </div>

      <SectionDivider>TextField</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='label · value · helper'>
          <TextField
            label='Experiment'
            defaultValue='checkout-latency'
            helperText='Shown in run lists.'
          />
        </Specimen>
        <Specimen caption='placeholder · helper'>
          <TextField
            label='Email'
            placeholder='you@example.com'
            helperText='We never share your email.'
          />
        </Specimen>
        <Specimen caption='with leading icon'>
          <TextField
            label='Username'
            placeholder='ada'
            leadingIcon={<UserOutlined />}
          />
        </Specimen>
        <Specimen caption='error'>
          <TextField
            label='Email'
            defaultValue='not-an-email'
            error='Enter a valid email address.'
          />
        </Specimen>
        <Specimen caption='disabled'>
          <TextField label='Read-only' defaultValue='aegis-001' disabled />
        </Specimen>
      </div>

      <SectionDivider>PasswordField</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='default'>
          <PasswordField
            label='Password'
            placeholder='••••••••'
            helperText='At least 8 characters.'
          />
        </Specimen>
        <Specimen caption='error'>
          <PasswordField
            label='Password'
            defaultValue='abc'
            error='Too short — minimum 8 characters.'
          />
        </Specimen>
      </div>

      <SectionDivider>AuthLayout</SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='login (preview)' span={3}>
          <div className='gallery__auth-preview'>
            <AuthLayout
              brand={
                <span
                  style={{
                    fontFamily: 'var(--font-brand)',
                    fontWeight: 600,
                    letterSpacing: 'var(--tracking-brand)',
                  }}
                >
                  AegisLab
                </span>
              }
              title='Sign in'
              description='Use your AegisLab credentials to continue.'
              footer={
                <>
                  Don&apos;t have an account? <a href='#signup'>Create one</a>
                </>
              }
            >
              <TextField label='Email' placeholder='you@example.com' />
              <PasswordField label='Password' placeholder='••••••••' />
              <Button type='primary' block>
                Sign in
              </Button>
            </AuthLayout>
          </div>
        </Specimen>
      </div>

      <SectionDivider>LoginForm</SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='default · with remember + forgot' span={3}>
          <div className='gallery__form-frame'>
            <LoginForm
              onSubmit={(values) => {
                console.warn('LoginForm submit', values);
              }}
              onForgotPassword={() => {
                console.warn('LoginForm forgot password');
              }}
            />
          </div>
        </Specimen>
        <Specimen caption='submitting' span={3}>
          <div className='gallery__form-frame'>
            <LoginForm onSubmit={() => undefined} submitting />
          </div>
        </Specimen>
        <Specimen caption='with error' span={3}>
          <div className='gallery__form-frame'>
            <LoginForm
              onSubmit={() => undefined}
              error='Invalid email or password.'
            />
          </div>
        </Specimen>
      </div>

      <SectionDivider>RegisterForm</SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='default' span={3}>
          <div className='gallery__form-frame'>
            <RegisterForm
              onSubmit={(values) => {
                console.warn('RegisterForm submit', values);
              }}
            />
          </div>
        </Specimen>
      </div>

      <SectionDivider>ForgotPasswordForm</SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='default' span={3}>
          <div className='gallery__form-frame'>
            <ForgotPasswordForm
              onSubmit={(values) => {
                console.warn('ForgotPasswordForm submit', values);
              }}
            />
          </div>
        </Specimen>
        <Specimen caption='success state' span={3}>
          <div className='gallery__form-frame'>
            <ForgotPasswordForm
              onSubmit={() => undefined}
              success="Check your inbox — we've sent a reset link."
            />
          </div>
        </Specimen>
      </div>

      <SectionDivider>ErrorState</SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='404 not found' span={3}>
          <ErrorState
            code={404}
            title='Page not found'
            description="The page you're looking for doesn't exist or has been moved."
            action={<AegisButton tone='primary'>Back to dashboard</AegisButton>}
          />
        </Specimen>
        <Specimen caption="size='compact' · inside a pane" span={2}>
          <ErrorState
            size='compact'
            title='Failed to load trajectory'
            description='ClickHouse returned 502 Bad Gateway.'
            action={<AegisButton tone='secondary'>Try again</AegisButton>}
          />
        </Specimen>
      </div>

      <SectionDivider>DropdownMenu</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='basic'>
          <DropdownMenu
            trigger={<Chip tone='ink'>Open menu</Chip>}
            items={[
              {
                key: 'view',
                label: 'View details',
                action: GALLERY_ACTIONS.dropdownView,
              },
              { key: 'edit', label: 'Edit' },
              { key: 'del', label: 'Delete', danger: true },
            ]}
          />
        </Specimen>
        <Specimen caption='with icons' span={2}>
          <DropdownMenu
            trigger={<Chip tone='default'>User menu</Chip>}
            items={[
              { key: 'profile', label: 'Profile', icon: <UserOutlined /> },
              {
                key: 'settings',
                label: 'Settings',
                icon: <SettingOutlined />,
              },
              {
                key: 'logout',
                label: 'Logout',
                icon: <LogoutOutlined />,
                danger: true,
              },
            ]}
          />
        </Specimen>
        <Specimen caption='header · footerItems · dividers'>
          <DropdownMenu
            trigger={<Chip tone='default'>Workspace</Chip>}
            header={<MetricLabel size='xs'>Switch workspace</MetricLabel>}
            items={[
              { key: 'aegis', label: 'aegis-lab' },
              { key: 'sandbox', label: 'sandbox' },
            ]}
            footerItems={[
              {
                key: 'new',
                label: 'New workspace',
                icon: <PlusOutlined />,
              },
            ]}
          />
        </Specimen>
        <Specimen
          caption='inside a Panel · trigger on its bottom edge · wide items escape the clip'
          span={2}
        >
          <Panel title='Run 4812' className='gallery__menu-host'>
            <div className='gallery__menu-host-foot'>
              <MetricLabel size='xs'>Actions</MetricLabel>
              <DropdownMenu
                trigger={<Chip tone='default'>More</Chip>}
                items={[
                  {
                    key: 'rerun',
                    label: 'Re-run with the same datapack and algorithm',
                    icon: <ReloadOutlined />,
                  },
                  {
                    key: 'export',
                    label: 'Export the trace bundle as Parquet',
                    icon: <DownloadOutlined />,
                  },
                  {
                    key: 'archive',
                    label: 'Archive',
                    disabled: true,
                  },
                  {
                    key: 'delete',
                    label: 'Delete run',
                    icon: <DeleteOutlined />,
                    danger: true,
                  },
                ]}
              />
            </div>
          </Panel>
        </Specimen>
      </div>

      <SectionDivider>ProjectSelector</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='with projects · search · meta slot' span={2}>
          <div style={{ width: '100%' }}>
            <ProjectSelector
              projects={[
                {
                  id: '1',
                  name: 'catalog-service',
                  action: GALLERY_ACTIONS.projectSelect,
                  meta: (
                    <>
                      <Chip tone='ink'>active</Chip>
                      <MonoValue size='sm'>128 inj</MonoValue>
                    </>
                  ),
                },
                {
                  id: '2',
                  name: 'order-platform',
                  meta: (
                    <>
                      <Chip tone='ghost'>archived</Chip>
                      <MonoValue size='sm'>12 inj</MonoValue>
                    </>
                  ),
                },
                { id: '3', name: 'inventory-v2' },
              ]}
              selectedId='1'
              onSelect={() => {
                /* gallery specimen — no-op */
              }}
            />
          </div>
        </Specimen>
        <Specimen caption='footerItems · view all + create' span={2}>
          <ProjectSelector
            projects={[
              { id: '1', name: 'catalog-service' },
              { id: '2', name: 'order-platform' },
            ]}
            selectedId='2'
            onSelect={() => {
              /* gallery specimen — no-op */
            }}
            footerItems={[
              {
                key: 'all',
                label: 'View all projects',
                icon: <AppstoreOutlined />,
              },
              {
                key: 'new',
                label: 'New project',
                icon: <PlusOutlined />,
              },
            ]}
          />
        </Specimen>
        <Specimen caption='empty state'>
          <ProjectSelector
            projects={[]}
            onSelect={() => {
              /* gallery specimen — no-op */
            }}
            placeholder='No projects'
          />
        </Specimen>
      </div>

      <SectionDivider>EnvironmentSwitcher</SectionDivider>
      <EnvironmentSwitcherSpecimen />

      <SectionDivider>PageSizeSelect</SectionDivider>
      <PageSizeSelectSpecimen />
    </Panel>
  );
}
