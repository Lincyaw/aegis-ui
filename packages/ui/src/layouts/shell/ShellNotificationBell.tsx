import type { ReactElement } from 'react';

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
  const { items, unreadCount } = useNotifications();
  const open = useOpenNotification();
  return (
    <NotificationBell
      items={items}
      unreadCount={unreadCount}
      onOpen={open}
      inboxPath={inboxPath}
      linkComponent={RouterLink}
    />
  );
}
