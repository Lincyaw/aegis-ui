import {
  type AegisNotification,
  InboxPage,
  NotificationBell,
  type NotificationContextValue,
  NotificationProvider,
  Panel,
  PanelTitle,
  SectionDivider,
} from '@lincyaw/aegis-ui';

import { GALLERY_ACTIONS, GALLERY_NOW } from '../fixtures';
import { Specimen } from '../shared';

const MOCK_NOTIFS: AegisNotification[] = [
  {
    id: 'g-1',
    title: 'Injection INJ-29F1 completed',
    body: 'kafka loadgen drift finished on EU-WEST-01 with blast radius 42%.',
    timestamp: new Date(GALLERY_NOW - 4 * 60_000).toISOString(),
    read: false,
    category: 'injection.completed',
    severity: 'success',
  },
  {
    id: 'g-2',
    title: 'Dataset build failed',
    body: "Build of 'orders-shadow-v3' failed: 2 of 14 partitions missing schemas.",
    timestamp: new Date(GALLERY_NOW - 35 * 60_000).toISOString(),
    read: false,
    category: 'dataset.build.failed',
    severity: 'error',
  },
  {
    id: 'g-3',
    title: 'Alice invited you to "Payments SRE"',
    body: 'You can now view experiments in the Payments workspace.',
    timestamp: new Date(GALLERY_NOW - 3 * 60 * 60_000).toISOString(),
    read: false,
    category: 'user.invited',
    severity: 'info',
    actor: 'Alice Chen',
  },
  {
    id: 'g-4',
    title: 'API key "ci-runner" expires in 7 days',
    timestamp: new Date(GALLERY_NOW - 8 * 60 * 60_000).toISOString(),
    read: true,
    category: 'api_key.expiring',
    severity: 'warning',
  },
];

const MOCK_NOTIF_VALUE: NotificationContextValue = {
  items: MOCK_NOTIFS,
  unreadCount: MOCK_NOTIFS.filter((n) => !n.read).length,
  loading: false,
};

export function NotificationsSection() {
  return (
    <Panel title={<PanelTitle size='lg'>Notifications</PanelTitle>}>
      <SectionDivider>NotificationBell</SectionDivider>
      <NotificationProvider value={MOCK_NOTIF_VALUE}>
        <div className='gallery__row'>
          <Specimen caption='trigger · click to open'>
            <div className='gallery__notif-bell-host'>
              <NotificationBell
                inboxPath='/inbox'
                action={GALLERY_ACTIONS.notifOpen}
              />
            </div>
          </Specimen>
        </div>
      </NotificationProvider>

      <SectionDivider>InboxPage</SectionDivider>
      <NotificationProvider value={MOCK_NOTIF_VALUE}>
        <div className='gallery__inbox-frame'>
          <InboxPage
            surface={{
              id: 'gallery.inbox',
              kind: 'list',
              label: 'Inbox',
              askSuggestions: ['Any unread alerts?'],
              project: (items) => ({
                entities: items.slice(0, 3).map((n) => ({
                  id: n.id,
                  type: 'notification',
                  label: n.title,
                  data: { severity: n.severity, read: n.read },
                })),
              }),
            }}
          />
        </div>
      </NotificationProvider>
    </Panel>
  );
}
