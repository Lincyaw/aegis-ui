import { type ReactElement, useCallback } from 'react';

import { NotificationBell } from '../../components/ui/NotificationBell';
import { useNotifications } from '../../notifications';
import { RouterLink } from './RouterLink';
import { useOpenNotification } from './useOpenNotification';

/** The NotificationBell filled from `<NotificationProvider>`. */
export function ShellNotificationBell({
  inboxPath,
}: {
  inboxPath: string;
}): ReactElement {
  const { items, unreadCount, error, liveError, refetch } = useNotifications();
  const open = useOpenNotification();
  const retry = useCallback(() => {
    void refetch?.();
  }, [refetch]);
  return (
    <NotificationBell
      items={items}
      unreadCount={unreadCount}
      error={error}
      liveError={liveError}
      onRetry={refetch ? retry : undefined}
      onOpen={open}
      inboxPath={inboxPath}
      linkComponent={RouterLink}
    />
  );
}
