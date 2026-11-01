import {
  Chip,
  ColumnLayout,
  DangerZone,
  FormRow,
  IdentityCell,
  MonoValue,
  PageHeader,
  PageWrapper,
  Panel,
  PanelTitle,
  SectionDivider,
  SettingsSection,
} from '@lincyaw/aegis-ui';

import { Specimen } from '../shared';

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
