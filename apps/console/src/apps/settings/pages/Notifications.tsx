import { useCallback, useEffect, useMemo, useState } from 'react';

import { App as AntdApp, Switch } from 'antd';

import {
  FormRow,
  PageHeader,
  Panel,
  SettingsSection,
  TextField,
} from '@OperationsPAI/aegis-ui';

import { ApiError } from '../../../api/apiClient';
import {
  listSubscriptions,
  setSubscription,
  type SubscriptionRow,
} from '../../../api/notificationClient';

const noop = (): void => undefined;

// Categories the console understands. Backend may know more — we render
// any extra ones it returns at the bottom.
const KNOWN_CATEGORIES: Array<{ key: string; label: string; description: string }> = [
  {
    key: 'injection.completed',
    label: 'Injection completed',
    description: 'A fault injection finished (success or failure).',
  },
  {
    key: 'dataset.build.failed',
    label: 'Dataset build failed',
    description: 'A dataset assembly job errored out.',
  },
  {
    key: 'system.update',
    label: 'System updates',
    description: 'Maintenance windows and platform announcements.',
  },
  {
    key: 'user.invited',
    label: 'User invited',
    description: 'Someone invited you to a project or team.',
  },
  {
    key: 'role.changed',
    label: 'Role changed',
    description: 'Your role in a workspace was modified.',
  },
];

const KNOWN_CHANNELS = ['inbox', 'email', 'slack'] as const;
type Channel = (typeof KNOWN_CHANNELS)[number];

const quietHoursStyle = {
  display: 'flex',
  gap: 'var(--space-4)',
  flexWrap: 'wrap' as const,
};

const quietFieldStyle = {
  flex: '1 1 12rem',
};

function key(category: string, channel: string): string {
  return `${category}::${channel}`;
}

export default function Notifications() {
  const { message: msg } = AntdApp.useApp();
  const [subs, setSubs] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const rows = await listSubscriptions();
      const m = new Map<string, boolean>();
      for (const r of rows) {
        m.set(key(r.category, r.channel), r.enabled);
      }
      setSubs(m);
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 404) {
        void msg.error('Failed to load subscriptions');
      }
    } finally {
      setLoading(false);
    }
  }, [msg]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggle = useCallback(
    (row: SubscriptionRow) => {
      setSubs((prev) => {
        const next = new Map(prev);
        next.set(key(row.category, row.channel), row.enabled);
        return next;
      });
      void setSubscription(row).catch(() => {
        void msg.error(`Could not update ${row.category} / ${row.channel}`);
        void load();
      });
    },
    [load, msg],
  );

  // Unknown categories returned by server but not in our list — render
  // them so admins don't lose visibility.
  const extraCategories = useMemo(() => {
    const known = new Set(KNOWN_CATEGORIES.map((c) => c.key));
    const seen = new Set<string>();
    for (const k of subs.keys()) {
      const [cat] = k.split('::');
      if (cat && !known.has(cat)) {
        seen.add(cat);
      }
    }
    return Array.from(seen);
  }, [subs]);

  return (
    <>
      <PageHeader
        title='Notifications'
        description='Choose what events you want to be notified about and how.'
      />
      <Panel>
        <SettingsSection
          title='Channels'
          description='Where notifications are delivered. Inbox is always on; per-event toggles below.'
        >
          <FormRow label='Email' description='user@example.com'>
            <Switch defaultChecked onChange={noop} />
          </FormRow>
          <FormRow label='Slack' description='Connected workspace: aegislab'>
            <Switch defaultChecked onChange={noop} />
          </FormRow>
          <FormRow label='Webhook' description='Configure a custom HTTP endpoint.'>
            <Switch onChange={noop} />
          </FormRow>
        </SettingsSection>

        <SettingsSection
          title='Events'
          description='Per-category × channel toggles. Backed by aegis-notify /inbox/subscriptions.'
        >
          {KNOWN_CATEGORIES.map((c) => (
            <FormRow key={c.key} label={c.label} description={c.description}>
              <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                {KNOWN_CHANNELS.map((ch) => (
                  <label
                    key={ch}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-1)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--fs-11)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <Switch
                      size='small'
                      disabled={loading}
                      checked={subs.get(key(c.key, ch)) ?? false}
                      onChange={(enabled) => {
                        handleToggle({
                          category: c.key,
                          channel: ch,
                          enabled,
                        });
                      }}
                    />
                    {ch}
                  </label>
                ))}
              </div>
            </FormRow>
          ))}
          {extraCategories.map((cat) => (
            <FormRow
              key={cat}
              label={cat}
              description='Category surfaced by the backend.'
            >
              <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                {KNOWN_CHANNELS.map((ch: Channel) => (
                  <label
                    key={ch}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-1)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--fs-11)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <Switch
                      size='small'
                      disabled={loading}
                      checked={subs.get(key(cat, ch)) ?? false}
                      onChange={(enabled) => {
                        handleToggle({ category: cat, channel: ch, enabled });
                      }}
                    />
                    {ch}
                  </label>
                ))}
              </div>
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
