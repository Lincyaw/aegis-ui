import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  type AegisNotification,
  type NotificationContextValue,
  NotificationProvider,
} from '@OperationsPAI/aegis-ui';

import {
  archive as archiveCall,
  listInbox,
  markAllRead as markAllReadCall,
  markRead as markReadCall,
  unreadCount as unreadCountCall,
} from '../api/notificationClient';

interface Props {
  children: ReactNode;
  /** Polling interval in ms; default 20s. */
  pollMs?: number;
  /** How many rows to keep in the inbox state. */
  pageSize?: number;
}

/**
 * Talks to aegis-notify /api/v2/inbox/*. Uses polling (every pollMs) for
 * freshness — `InboxStream` SSE needs a different auth path (EventSource
 * cannot send Authorization headers), so we keep it simple for now and
 * leave the SSE upgrade for a follow-up.
 */
export function RealNotificationProvider({
  children,
  pollMs = 20_000,
  pageSize = 50,
}: Props): ReactElement {
  const [items, setItems] = useState<AegisNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refetch = useCallback(async (): Promise<void> => {
    try {
      const list = await listInbox({ limit: pageSize });
      if (!mounted.current) {
        return;
      }
      setItems(list.items);
      setUnread(list.unread_count);
    } catch {
      // Surface as empty inbox; don't blow up the shell.
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, [pageSize]);

  // Cheap unread-count refresh between full list fetches.
  const refetchUnread = useCallback(async (): Promise<void> => {
    try {
      const c = await unreadCountCall();
      if (mounted.current) {
        setUnread(c.unread_count);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refetch();
    const id = window.setInterval(() => {
      void refetchUnread();
    }, pollMs);
    return () => {
      window.clearInterval(id);
    };
  }, [refetch, refetchUnread, pollMs]);

  const markRead = useCallback(async (id: string): Promise<void> => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await markReadCall(id);
    } catch {
      void refetch();
    }
  }, [refetch]);

  const markAllRead = useCallback(async (): Promise<void> => {
    setItems((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
    setUnread(0);
    try {
      await markAllReadCall();
    } catch {
      void refetch();
    }
  }, [refetch]);

  const archive = useCallback(async (id: string): Promise<void> => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    try {
      await archiveCall(id);
    } catch {
      void refetch();
    }
  }, [refetch]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      items,
      unreadCount: unread,
      loading,
      markRead,
      markAllRead,
      archive,
      refetch,
    }),
    [items, unread, loading, markRead, markAllRead, archive, refetch],
  );

  return <NotificationProvider value={value}>{children}</NotificationProvider>;
}
