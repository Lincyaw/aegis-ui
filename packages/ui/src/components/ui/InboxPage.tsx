import { type ReactElement, useMemo, useState } from 'react';

import { Button, Segmented } from 'antd';
import { useNavigate } from 'react-router-dom';

import { type AegisNotification, useNotifications } from '../../notifications';
import { Avatar } from './Avatar';
import { Chip } from './Chip';
import { EmptyState } from './EmptyState';
import './InboxPage.css';
import { PageHeader } from './PageHeader';
import { relativeTime } from './relativeTime';

type Filter = 'all' | 'unread';

interface InboxPageProps {
  defaultFilter?: Filter;
}

const SEVERITY_TONE: Record<
  NonNullable<AegisNotification['severity']>,
  'default' | 'ink' | 'warning' | 'ghost'
> = {
  info: 'ghost',
  success: 'default',
  warning: 'warning',
  error: 'warning',
};

export function InboxPage({
  defaultFilter = 'all',
}: InboxPageProps): ReactElement {
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<Filter>(defaultFilter);
  const navigate = useNavigate();

  const visible = useMemo(
    () => (filter === 'unread' ? items.filter((n) => !n.read) : items),
    [items, filter],
  );

  const handleRowClick = (item: AegisNotification): void => {
    if (!item.read && markRead) {
      void markRead(item.id);
    }
    if (item.to) {
      navigate(item.to);
    }
  };

  return (
    <div className="aegis-inbox">
      <PageHeader
        title="Inbox"
        description="Workspace activity, alerts, and invites in one place."
        action={
          markAllRead && unreadCount > 0 ? (
            <Button
              onClick={() => {
                void markAllRead();
              }}
            >
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      <div className="aegis-inbox__filter">
        <Segmented<Filter>
          value={filter}
          onChange={(v) => {
            setFilter(v);
          }}
          options={[
            { label: 'All', value: 'all' },
            {
              label: `Unread${unreadCount > 0 ? ` (${String(unreadCount)})` : ''}`,
              value: 'unread',
            },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={filter === 'unread' ? 'No unread items' : 'No notifications'}
          description={
            filter === 'unread'
              ? "You're all caught up."
              : 'Activity will appear here as it happens.'
          }
        />
      ) : (
        <ul className="aegis-inbox__list">
          {visible.map((item) => (
            <li key={item.id} className="aegis-inbox__row-wrap">
              <button
                type="button"
                className={[
                  'aegis-inbox__row',
                  item.read ? '' : 'aegis-inbox__row--unread',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  handleRowClick(item);
                }}
              >
                <Avatar name={item.actor ?? item.title} size="md" />
                <div className="aegis-inbox__row-body">
                  <div className="aegis-inbox__row-head">
                    <span className="aegis-inbox__row-title">{item.title}</span>
                    <span className="aegis-inbox__row-time">
                      {relativeTime(item.timestamp)}
                    </span>
                  </div>
                  {item.body && (
                    <div className="aegis-inbox__row-text">{item.body}</div>
                  )}
                  {(item.category ?? item.severity) && (
                    <div className="aegis-inbox__row-meta">
                      {item.severity && (
                        <Chip tone={SEVERITY_TONE[item.severity]}>
                          {item.severity}
                        </Chip>
                      )}
                      {item.category && (
                        <Chip tone="ghost">{item.category}</Chip>
                      )}
                    </div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default InboxPage;
