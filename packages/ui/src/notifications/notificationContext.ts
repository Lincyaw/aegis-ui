import { createContext } from 'react';

/**
 * Minimal notification shape consumed by the shell + inbox primitives.
 * Callers can extend with a custom generic on `NotificationContextValue`.
 */
export interface AegisNotification {
  id: string;
  title: string;
  body?: string;
  /** ISO timestamp. Use string, not Date — easier to serialize. */
  timestamp: string;
  read: boolean;
  /** Optional route path the inbox item links to. */
  to?: string;
  /** Optional category (used for filtering & icon mapping). */
  category?: string;
  /** Optional severity for tone. */
  severity?: 'info' | 'success' | 'warning' | 'error';
  /** Optional actor name for items like "Alice invited you". */
  actor?: string;
}

/**
 * Contract every notification integration implements. The library does
 * not own state — callers wire their own polling / SSE / Novu / Knock
 * adapter and pass the resulting value through
 * `<NotificationProvider value={...}>`.
 */
export interface NotificationContextValue<TItem = AegisNotification> {
  items: TItem[];
  unreadCount: number;
  /** True while initial load or refetch is pending. */
  loading: boolean;
  markRead?: (id: string) => Promise<void> | void;
  markAllRead?: () => Promise<void> | void;
  archive?: (id: string) => Promise<void> | void;
  refetch?: () => Promise<void> | void;
}

export const defaultNotificationContextValue: NotificationContextValue<unknown> =
  {
    items: [],
    unreadCount: 0,
    loading: false,
  };

export const NotificationContext = createContext<
  NotificationContextValue<unknown>
>(defaultNotificationContextValue);
