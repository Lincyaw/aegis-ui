import { type ReactElement, useMemo, useRef, useState } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/core/usePrimitiveSurface';
import type { AegisNotification } from '../../notifications';
import { Alert } from './Alert';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Chip } from './Chip';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import './InboxPage.css';
import { PageHeader } from './PageHeader';
import { Tabs } from './Tabs';
import { relativeTime } from './relativeTime';

type Filter = 'all' | 'unread';

export type InboxPageSurface = PrimitiveSurface<AegisNotification[]>;

export interface InboxPageProps {
  items: AegisNotification[];
  /** Shown on the Unread tab. Defaults to the number of unread `items`. */
  unreadCount?: number;
  /**
   * Fired when the user opens an item. The host marks it read and
   * navigates to `item.to`.
   */
  onOpen?: (item: AegisNotification) => void;
  /** Renders "Mark all as read" while anything is unread. */
  onMarkAllRead?: () => void;
  /**
   * Set when loading failed. With no `items` it is shown in place of the
   * list; items from an earlier load stay under a notice, as for
   * `liveError`.
   */
  error?: Error | null;
  /**
   * Set while keeping the items current is failing; a notice above the
   * list says it may be out of date, and the list stays.
   */
  liveError?: Error | null;
  /** Renders a retry button alongside `error` and `liveError`. */
  onRetry?: () => void;
  defaultFilter?: Filter;
  surface?: InboxPageSurface;
}

const SEVERITY_TONE: Record<
  NonNullable<AegisNotification['severity']>,
  'default' | 'caution' | 'warning' | 'ghost'
> = {
  info: 'ghost',
  success: 'default',
  warning: 'caution',
  error: 'warning',
};

export function InboxPage({
  items,
  unreadCount = items.filter((n) => !n.read).length,
  onOpen,
  onMarkAllRead,
  error,
  liveError,
  onRetry,
  defaultFilter = 'all',
  surface,
}: InboxPageProps): ReactElement {
  const [filter, setFilter] = useState<Filter>(defaultFilter);
  const wrapRef = useRef<HTMLDivElement>(null);
  const agentAttrs = usePrimitiveSurface(surface, items, 'list', wrapRef);

  const visible = useMemo(
    () => (filter === 'unread' ? items.filter((n) => !n.read) : items),
    [items, filter],
  );
  const loadError = items.length === 0 ? error : null;
  const staleError = liveError ?? (items.length === 0 ? null : error);

  return (
    <div ref={wrapRef} className="aegis-inbox" {...agentAttrs}>
      <PageHeader
        title="Inbox"
        description="Workspace activity, alerts, and invites in one place."
        action={
          onMarkAllRead && unreadCount > 0 ? (
            <Button tone="secondary" onClick={onMarkAllRead}>
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      <Tabs
        activeKey={filter}
        onChange={(key) => {
          setFilter(key === 'unread' ? 'unread' : 'all');
        }}
        items={[
          { key: 'all', label: 'All' },
          {
            key: 'unread',
            label: `Unread${unreadCount > 0 ? ` (${String(unreadCount)})` : ''}`,
          },
        ]}
      >
        {loadError ? (
          <ErrorState
            size="compact"
            title="Couldn't load notifications"
            description={loadError.message}
            action={
              onRetry && (
                <Button tone="secondary" onClick={onRetry}>
                  Try again
                </Button>
              )
            }
          />
        ) : (
          <div className="aegis-inbox__panel">
            {staleError && (
              <Alert tone="warning" title="This list may be out of date">
                {staleError.message}
                {onRetry && (
                  <span className="aegis-inbox__stale-action">
                    <Button tone="secondary" onClick={onRetry}>
                      Try again
                    </Button>
                  </span>
                )}
              </Alert>
            )}
            {visible.length === 0 ? (
              <EmptyState
                title={
                  filter === 'unread' ? 'No unread items' : 'No notifications'
                }
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
                        onOpen?.(item);
                      }}
                    >
                      <Avatar name={item.actor ?? item.title} size="md" />
                      <div className="aegis-inbox__row-body">
                        <div className="aegis-inbox__row-head">
                          <span className="aegis-inbox__row-title">
                            {item.title}
                          </span>
                          <span className="aegis-inbox__row-time">
                            {relativeTime(item.timestamp)}
                          </span>
                        </div>
                        {item.body && (
                          <div className="aegis-inbox__row-text">
                            {item.body}
                          </div>
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
        )}
      </Tabs>
    </div>
  );
}
