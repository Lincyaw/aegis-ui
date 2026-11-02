import {
  Chip,
  ColumnLayout,
  DangerZone,
  FormRow,
  IdentityCell,
  MetricLabel,
  MonoValue,
  PageHeader,
  PageWrapper,
  Panel,
  PanelTitle,
  SectionDivider,
  SettingsSection,
  SiteAnchorNav,
  SiteFooter,
  type SiteFooterColumn,
  SiteLayout,
  SiteNav,
  type SiteNavItem,
  SiteSection,
  SiteSectionHeader,
  ThemeToggle,
} from '@lincyaw/aegis-ui';

import { GalleryRouterLink, Specimen } from '../shared';

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

export function LayoutsSection() {
  return (
    <Panel title={<PanelTitle size='lg'>Layouts</PanelTitle>}>
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
        <Specimen caption='with action' span={2}>
          <PageHeader
            title='Teams'
            description='Organize members into teams.'
            action={<Chip tone='ink'>+ Create team</Chip>}
          />
        </Specimen>
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
                    <MonoValue size='sm'>10/11</MonoValue> checks passed
                  </span>
                  <span>
                    Outcome <MonoValue size='sm'>0.82</MonoValue>
                  </span>
                </>
              }
              description={
                <IdentityCell
                  avatar
                  colorSlot={2}
                  name='claude-opus-4-1'
                  secondary='claude-code · 2026-10-27 09:14 UTC'
                  inline
                />
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

      <SectionDivider>FormRow</SectionDivider>
      <div className='gallery__stack'>
        <FormRow label='Display name' description='Shown across the platform.'>
          <input
            type='text'
            defaultValue='Ada Lovelace'
            className='gallery__demo-input'
          />
        </FormRow>
        <FormRow label='API key' description='Treat as a secret.'>
          <input
            type='password'
            defaultValue='secret-token-xxx'
            className='gallery__demo-input'
          />
        </FormRow>
      </div>

      <SectionDivider>SettingsSection</SectionDivider>
      <SettingsSection
        title='Profile'
        description='Update your personal information and preferences.'
      >
        <FormRow label='Display name' description='Shown across the platform.'>
          <input
            type='text'
            defaultValue='Ada Lovelace'
            className='gallery__demo-input'
          />
        </FormRow>
        <FormRow label='Email' description='Used for notifications and login.'>
          <input
            type='text'
            defaultValue='ada@aegislab.io'
            className='gallery__demo-input'
          />
        </FormRow>
        <FormRow
          label='Timezone'
          description='All times are displayed in this zone.'
        >
          <select className='gallery__demo-input'>
            <option>UTC</option>
            <option>Asia/Shanghai</option>
            <option>America/New_York</option>
          </select>
        </FormRow>
      </SettingsSection>
      <SettingsSection
        title='Notifications'
        description='Choose what you want to be notified about.'
      >
        <FormRow
          label='Email alerts'
          description='Receive email for critical events.'
        >
          <label className='gallery__demo-toggle'>
            <input type='checkbox' defaultChecked />
            <span className='gallery__demo-toggle-track' />
          </label>
        </FormRow>
        <FormRow
          label='Slack integration'
          description='Push notifications to your Slack channel.'
        >
          <label className='gallery__demo-toggle'>
            <input type='checkbox' />
            <span className='gallery__demo-toggle-track' />
          </label>
        </FormRow>
      </SettingsSection>

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
          <button type='button' className='gallery__danger-btn'>
            Delete project
          </button>
        </div>
      </DangerZone>
    </Panel>
  );
}
