import { type ReactElement, useCallback } from 'react';

import {
  InboxPage,
  type InboxPageSurface,
} from '../../components/ui/InboxPage';
import { useNotifications } from '../../notifications';
import { useOpenNotification } from './useOpenNotification';

interface NotificationInboxPageProps {
  defaultFilter?: 'all' | 'unread';
  surface?: InboxPageSurface;
}

/**
 * The InboxPage filled from `<NotificationProvider>`: opening an item marks
 * it read and follows its `to`. Mount it on the route `inboxPath` names.
 */
export function NotificationInboxPage({
  defaultFilter,
  surface,
}: NotificationInboxPageProps): ReactElement {
  const { items, unreadCount, markAllRead, error, refetch } =
    useNotifications();
  const open = useOpenNotification();
  const markAll = useCallback(() => {
    void markAllRead?.();
  }, [markAllRead]);
  const retry = useCallback(() => {
    void refetch?.();
  }, [refetch]);
  return (
    <InboxPage
      items={items}
      unreadCount={unreadCount}
      onOpen={open}
      onMarkAllRead={markAllRead ? markAll : undefined}
      error={error}
      onRetry={refetch ? retry : undefined}
      defaultFilter={defaultFilter}
      surface={surface}
    />
  );
}
