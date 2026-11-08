import { useState } from 'react';

import {
  type AegisNotification,
  InboxPage,
  NotificationBell,
  Panel,
  PanelTitle,
  SectionDivider,
} from '@lincyaw/aegis-ui';

import { GALLERY_ACTIONS, GALLERY_NOW } from '../fixtures';
import { GalleryRouterLink, Specimen } from '../shared';

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

const INBOX_LOAD_ERROR = new Error(
  'GET /api/v2/inbox answered HTTP 503 Service Unavailable.'
);

export function NotificationsSection() {
  const [items, setItems] = useState(MOCK_NOTIFS);
  const [loadError, setLoadError] = useState<Error | null>(INBOX_LOAD_ERROR);
  const markRead = (item: AegisNotification): void => {
    setItems((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
  };
  const markAllRead = (): void => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <Panel title={<PanelTitle size='lg'>Notifications</PanelTitle>}>
      <SectionDivider>NotificationBell</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='trigger · click to open, an item to mark it read'>
          <div className='gallery__notif-bell-host'>
            <NotificationBell
              items={items}
              onOpen={markRead}
              inboxPath='/inbox'
              linkComponent={GalleryRouterLink}
              action={GALLERY_ACTIONS.notifOpen}
            />
          </div>
        </Specimen>
      </div>

      <SectionDivider>InboxPage</SectionDivider>
      <div className='gallery__inbox-frame'>
        <InboxPage
          items={items}
          onOpen={markRead}
          onMarkAllRead={markAllRead}
          surface={{
            id: 'gallery.inbox',
            kind: 'list',
            label: 'Inbox',
            askSuggestions: ['Any unread alerts?'],
            project: (list) => ({
              entities: list.slice(0, 3).map((n) => ({
                id: n.id,
                type: 'notification',
                label: n.title,
                data: { severity: n.severity, read: n.read },
              })),
            }),
          }}
        />
      </div>
      <div className='gallery__row'>
        <Specimen caption='load failed · Try again clears the error'>
          <div className='gallery__stack gallery__stack--fill'>
            <InboxPage
              items={loadError ? [] : items}
              onOpen={markRead}
              error={loadError}
              onRetry={() => {
                setLoadError(null);
              }}
            />
          </div>
        </Specimen>
      </div>
    </Panel>
  );
}
