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

import { gatewayUrlFor } from '../config/runtime';

import {
  archive as archiveCall,
  listInbox,
  markAllRead as markAllReadCall,
  markRead as markReadCall,
  unreadCount as unreadCountCall,
} from '../api/notificationClient';
import { openSseStream } from '../api/sseClient';
import { readTokens } from '../auth/tokenStore';

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

  // Initial load + safety-net polling. Independent of the stream lifecycle.
  useEffect(() => {
    if (!isAuthed) {
      setItems([]);
      setUnread(0);
      setLoading(false);
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

  // Live SSE stream. Reconnects with exponential backoff on error,
  // closes cleanly on unmount, and triggers a refetch each time a
  // "notification" event arrives so the new row is on screen instantly.
  useEffect(() => {
    if (!isAuthed) {
      return;
    }
    let stopped = false;
    let attempt = 0;
    let timer: number | undefined;
    let controller: AbortController | undefined;

    const connect = (): void => {
      if (stopped) {
        return;
      }
      const tokens = readTokens();
      if (!tokens) {
        // No token yet — try again after the next backoff tick. The
        // SsoAuthProvider may still be hydrating.
        timer = window.setTimeout(connect, RECONNECT_BASE_MS);
        return;
      }
      controller = openSseStream({
        url: gatewayUrlFor(STREAM_URL),
        token: tokens.accessToken,
        onOpen: () => {
          attempt = 0;
        },
        onEvent: (e) => {
          if (e.event === 'notification') {
            void refetch();
          }
          // 'ping' heartbeats are intentionally ignored.
        },
        onError: () => {
          if (stopped) {
            return;
          }
          const delay = Math.min(
            RECONNECT_MAX_MS,
            RECONNECT_BASE_MS * 2 ** attempt,
          );
          attempt += 1;
          timer = window.setTimeout(connect, delay);
        },
      });
    };

    connect();
    return () => {
      stopped = true;
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
      controller?.abort();
    };
  }, [isAuthed, refetch]);

  const markRead = useCallback(
    async (id: string): Promise<void> => {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
      try {
        await markReadCall(id);
      } catch {
        void refetch();
      }
    },
    [refetch],
  );

  const markAllRead = useCallback(async (): Promise<void> => {
    setItems((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
    setUnread(0);
    try {
      await markAllReadCall();
    } catch {
      void refetch();
    }
  }, [refetch]);

  const archive = useCallback(
    async (id: string): Promise<void> => {
      setItems((prev) => prev.filter((n) => n.id !== id));
      try {
        await archiveCall(id);
      } catch {
        void refetch();
      }
    },
    [refetch],
  );

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
