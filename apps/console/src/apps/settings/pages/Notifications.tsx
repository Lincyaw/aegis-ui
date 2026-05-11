import { Switch } from 'antd';

import {
  FormRow,
  PageHeader,
  Panel,
  SettingsSection,
  TextField,
} from '@OperationsPAI/aegis-ui';

const noop = (): void => undefined;

const EVENTS: Array<{ key: string; label: string; description: string }> = [
  {
    key: 'injection-completed',
    label: 'Injection completed',
    description: 'A fault injection finished successfully.',
  },
  {
    key: 'injection-failed',
    label: 'Injection failed',
    description: 'A fault injection errored out or timed out.',
  },
  {
    key: 'dataset-build',
    label: 'Dataset build finished',
    description: 'A dataset assembly job reached a terminal state.',
  },
  {
    key: 'trace-anomaly',
    label: 'Trace anomaly detected',
    description: 'The detector flagged an outlier trace.',
  },
  {
    key: 'api-key-rotation',
    label: 'API key rotation due',
    description: 'A live key is within 7 days of its rotation window.',
  },
  {
    key: 'audit-critical',
    label: 'Audit log critical event',
    description: 'A high-severity audit event was recorded.',
  },
];

const quietHoursStyle = {
  display: 'flex',
  gap: 'var(--space-4)',
  flexWrap: 'wrap' as const,
};

const quietFieldStyle = {
  flex: '1 1 12rem',
};

export default function Notifications() {
  return (
    <>
      <PageHeader
        title='Notifications'
        description='Choose what events you want to be notified about and how.'
      />
      <Panel>
        <SettingsSection
          title='Channels'
          description='Where notifications are delivered.'
        >
          <FormRow label='Email' description='user@example.com'>
            <Switch defaultChecked onChange={noop} />
          </FormRow>
          <FormRow
            label='Slack'
            description='Connected workspace: aegislab'
          >
            <Switch defaultChecked onChange={noop} />
          </FormRow>
          <FormRow
            label='Webhook'
            description='Configure a custom HTTP endpoint.'
          >
            <Switch onChange={noop} />
          </FormRow>
        </SettingsSection>

        <SettingsSection
          title='Events'
          description='Which events trigger notifications.'
        >
          {EVENTS.map((event) => (
            <FormRow
              key={event.key}
              label={event.label}
              description={event.description}
            >
              <Switch defaultChecked onChange={noop} />
            </FormRow>
          ))}
        </SettingsSection>

        <SettingsSection
          title='Quiet hours'
          description='Suppress non-critical notifications during these hours.'
        >
          <FormRow
            label='Window'
            description='Times are interpreted in your local timezone.'
          >
            <div style={quietHoursStyle}>
              <div style={quietFieldStyle}>
                <TextField label='From' type='time' defaultValue='22:00' />
              </div>
              <div style={quietFieldStyle}>
                <TextField label='To' type='time' defaultValue='07:00' />
              </div>
            </div>
          </FormRow>
        </SettingsSection>
      </Panel>
    </>
  );
}
