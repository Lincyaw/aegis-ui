import type { ReactElement, ReactNode } from 'react';

import {
  type AegisNotification,
  NotificationContext,
  type NotificationContextValue,
} from './notificationContext';

interface NotificationProviderProps<TItem = AegisNotification> {
  value: NotificationContextValue<TItem>;
  children: ReactNode;
}

/**
 * Thin context wrapper. The library deliberately holds no notification
 * state — the host owns fetching, polling, real-time subscriptions, and
 * feeds the resulting value in.
 */
export function NotificationProvider<TItem = AegisNotification>({
  value,
  children,
}: NotificationProviderProps<TItem>): ReactElement {
  return (
    <NotificationContext.Provider
      value={value as NotificationContextValue<unknown>}
    >
      {children}
    </NotificationContext.Provider>
  );
}
