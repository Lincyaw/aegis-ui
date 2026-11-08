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
  useAuth,
} from '@lincyaw/aegis-ui';
import { App } from 'antd';

import { errMsg } from '../api/apiClient';
import {
  archive as archiveCall,
  listInbox,
  markAllRead as markAllReadCall,
  markRead as markReadCall,
  unreadCount as unreadCountCall,
} from '../api/notificationClient';
import { openSseStream } from '../api/sseClient';
import { gatewayUrlFor } from '../config/runtime';

interface Props {
  children: ReactNode;
  /**
   * Belt-and-suspenders polling interval. Real-time updates come from
   * the SSE stream (`/api/v2/inbox/stream`); this polls the cheap
   * /unread-count endpoint occasionally so a missed event still
   * eventually corrects. Default 60s.
   */
  pollMs?: number;
  /** How many rows to keep in the inbox state. */
  pageSize?: number;
}

const STREAM_URL = '/api/v2/inbox/stream';
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
// A stream that stays open this long, or delivers an event, counts as
// healthy and resets the backoff; one that opens and ends at once keeps it.
const STREAM_HEALTHY_MS = 10_000;

function toError(err: unknown): Error {
  return new Error(errMsg(err));
}

/**
 * Talks to aegis-notify /api/v2/inbox/*. Real-time freshness comes
 * from /inbox/stream (Server-Sent Events via fetch — EventSource can't
 * send Authorization headers, so we use a small stream reader). A
 * coarse 60s poll on /unread-count is kept as a safety net.
 */
export function RealNotificationProvider({
  children,
  pollMs = 60_000,
  pageSize = 50,
}: Props): ReactElement {
  const { status: authStatus } = useAuth();
  const isAuthed = authStatus === 'authenticated';
  const { message: msg } = App.useApp();
  const [items, setItems] = useState<AegisNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
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
      setError(null);
    } catch (err) {
      if (mounted.current) {
        setError(toError(err));
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, [pageSize]);

  const refetchUnread = useCallback(async (): Promise<void> => {
    try {
      const c = await unreadCountCall();
      if (mounted.current) {
        setUnread(c.unread_count);
      }
    } catch (err) {
      if (mounted.current) {
        setError(toError(err));
      }
    }
  }, []);

  // Initial load + safety-net polling. Independent of the stream lifecycle.
  useEffect(() => {
    if (!isAuthed) {
      setItems([]);
      setUnread(0);
      setLoading(false);
      setError(null);
      return;
    }
    void refetch();
    const id = window.setInterval(() => {
      void refetchUnread();
    }, pollMs);
    return () => {
      window.clearInterval(id);
    };
  }, [isAuthed, refetch, refetchUnread, pollMs]);

  // Live SSE stream. Reconnects with exponential backoff whenever the
  // stream fails or the server ends it, refetches after reconnecting to
  // pick up what arrived while it was down, closes cleanly on unmount, and
  // triggers a refetch each time a "notification" event arrives so the
  // new row is on screen instantly.
  useEffect(() => {
    if (!isAuthed) {
      return;
    }
    let stopped = false;
    let attempt = 0;
    let reconnecting = false;
    let timer: number | undefined;
    let healthyTimer: number | undefined;
    let controller: AbortController | undefined;

    const markHealthy = (): void => {
      window.clearTimeout(healthyTimer);
      attempt = 0;
    };

    const reconnect = (): void => {
      window.clearTimeout(healthyTimer);
      if (stopped) {
        return;
      }
      const delay = Math.min(
        RECONNECT_MAX_MS,
        RECONNECT_BASE_MS * 2 ** attempt
      );
      attempt += 1;
      reconnecting = true;
      timer = window.setTimeout(connect, delay);
    };

    const connect = (): void => {
      if (stopped) {
        return;
      }
      controller = openSseStream({
        url: gatewayUrlFor(STREAM_URL),
        onOpen: () => {
          healthyTimer = window.setTimeout(markHealthy, STREAM_HEALTHY_MS);
          if (reconnecting) {
            reconnecting = false;
            void refetch();
          }
        },
        onEvent: (e) => {
          markHealthy();
          if (e.event === 'notification') {
            void refetch();
          }
          // 'ping' heartbeats only mark the stream healthy.
        },
        onError: reconnect,
        onClose: reconnect,
      });
    };

    connect();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      window.clearTimeout(healthyTimer);
      controller?.abort();
    };
  }, [isAuthed, refetch]);

  const markRead = useCallback(
    async (id: string): Promise<void> => {
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnread((u) => Math.max(0, u - 1));
      try {
        await markReadCall(id);
      } catch (err) {
        void msg.error(
          `Couldn't mark the notification as read: ${errMsg(err)}`
        );
        void refetch();
      }
    },
    [msg, refetch]
  );

  const markAllRead = useCallback(async (): Promise<void> => {
    setItems((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
    setUnread(0);
    try {
      await markAllReadCall();
    } catch (err) {
      void msg.error(`Couldn't mark all notifications as read: ${errMsg(err)}`);
      void refetch();
    }
  }, [msg, refetch]);

  const archive = useCallback(
    async (id: string): Promise<void> => {
      setItems((prev) => prev.filter((n) => n.id !== id));
      try {
        await archiveCall(id);
      } catch (err) {
        void msg.error(`Couldn't archive the notification: ${errMsg(err)}`);
        void refetch();
      }
    },
    [msg, refetch]
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      items,
      unreadCount: unread,
      loading,
      error,
      markRead,
      markAllRead,
      archive,
      refetch,
    }),
    [items, unread, loading, error, markRead, markAllRead, archive, refetch]
  );

  return <NotificationProvider value={value}>{children}</NotificationProvider>;
}
