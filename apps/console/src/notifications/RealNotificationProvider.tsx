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
  // Keeping the list current fails on its own: a refresh, the count poll
  // and the stream each hold their last failure until they next succeed.
  const [refreshError, setRefreshError] = useState<Error | null>(null);
  const [pollError, setPollError] = useState<Error | null>(null);
  const [streamError, setStreamError] = useState<Error | null>(null);
  const hasList = useRef(false);
  // Reconnects the stream at once while it is waiting out its backoff.
  const reconnectStreamNow = useRef<(() => void) | null>(null);
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
      hasList.current = true;
      setItems(list.items);
      setUnread(list.unread_count);
      setError(null);
      setRefreshError(null);
      // The list carries the unread count, so the count is current again.
      setPollError(null);
    } catch (err) {
      if (!mounted.current) {
        return;
      }
      // `error` is a load with no list to show. Once a list has loaded, a
      // failed refresh or retry leaves it on screen as possibly out of date.
      if (hasList.current) {
        setRefreshError(
          new Error(`Couldn't refresh notifications: ${errMsg(err)}`)
        );
      } else {
        setError(new Error(errMsg(err)));
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
        setPollError(null);
      }
    } catch (err) {
      // `error` reports the items failing to load; the list is still what the
      // server last returned, so a failed count poll keeps the last count
      // and reports the inbox as possibly out of date instead.
      if (mounted.current) {
        setPollError(
          new Error(`Couldn't refresh the unread count: ${errMsg(err)}`)
        );
      }
    }
  }, []);

  // Initial load + safety-net polling. Independent of the stream lifecycle.
  useEffect(() => {
    if (!isAuthed) {
      hasList.current = false;
      setItems([]);
      setUnread(0);
      setLoading(false);
      setError(null);
      setRefreshError(null);
      setPollError(null);
      setStreamError(null);
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
      timer = undefined;
      if (stopped) {
        return;
      }
      controller = openSseStream({
        url: gatewayUrlFor(STREAM_URL),
        onOpen: () => {
          setStreamError(null);
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
        onError: (err) => {
          setStreamError(new Error(`Live updates stopped: ${errMsg(err)}`));
          reconnect();
        },
        onClose: reconnect,
      });
    };

    reconnectStreamNow.current = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        connect();
      }
    };
    connect();
    return () => {
      reconnectStreamNow.current = null;
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

  // A retry also cuts short the stream's wait to reconnect.
  const retry = useCallback(async (): Promise<void> => {
    reconnectStreamNow.current?.();
    await refetch();
  }, [refetch]);

  const liveError = refreshError ?? streamError ?? pollError;
  const value = useMemo<NotificationContextValue>(
    () => ({
      items,
      unreadCount: unread,
      loading,
      error,
      liveError,
      markRead,
      markAllRead,
      archive,
      refetch: retry,
    }),
    [
      items,
      unread,
      loading,
      error,
      liveError,
      markRead,
      markAllRead,
      archive,
      retry,
    ]
  );

  return <NotificationProvider value={value}>{children}</NotificationProvider>;
}
