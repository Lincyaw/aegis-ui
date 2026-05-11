import { useContext } from 'react';

import {
  type AegisNotification,
  NotificationContext,
  type NotificationContextValue,
} from './notificationContext';

/**
 * Read the current notification context. Returns the default empty
 * state when no `<NotificationProvider>` is mounted, so render code
 * does not have to special-case "notifications not wired yet".
 */
export function useNotifications<
  TItem = AegisNotification,
>(): NotificationContextValue<TItem> {
  return useContext(NotificationContext) as NotificationContextValue<TItem>;
}
