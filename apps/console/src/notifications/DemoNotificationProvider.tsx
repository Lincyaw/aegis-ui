import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  type AegisNotification,
  type NotificationContextValue,
  NotificationProvider,
} from '@OperationsPAI/aegis-ui';

const STORAGE_KEY = 'aegis.console.notifications.items';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function isoFrom(now: number, offsetMs: number): string {
  return new Date(now - offsetMs).toISOString();
}

function seed(): AegisNotification[] {
  const now = Date.now();
  return [
    {
      id: 'n-1',
      title: 'Injection INJ-29F1 completed',
      body: 'kafka loadgen drift finished on EU-WEST-01 with blast radius 42%.',
      timestamp: isoFrom(now, 4 * 60 * 1000),
      read: false,
      category: 'injection.completed',
      severity: 'success',
      to: '/portal',
    },
    {
      id: 'n-2',
      title: 'Dataset build failed',
      body: "Build of 'orders-shadow-v3' failed: 2 of 14 partitions missing schemas.",
      timestamp: isoFrom(now, 35 * 60 * 1000),
      read: false,
      category: 'dataset.build.failed',
      severity: 'error',
      to: '/datasets',
    },
    {
      id: 'n-3',
      title: 'Alice invited you to "Payments SRE"',
      body: 'You can now view experiments and dashboards in the Payments workspace.',
      timestamp: isoFrom(now, 3 * HOUR),
      read: false,
      category: 'user.invited',
      severity: 'info',
      actor: 'Alice Chen',
      to: '/settings/teams',
    },
    {
      id: 'n-4',
      title: 'API key "ci-runner" expires in 7 days',
      body: 'Rotate the key before May 18 to avoid pipeline failures.',
      timestamp: isoFrom(now, 8 * HOUR),
      read: true,
      category: 'api_key.expiring',
      severity: 'warning',
      to: '/settings/api-keys',
    },
    {
      id: 'n-5',
      title: 'Your role changed to Admin',
      body: 'Bob Liu promoted you in workspace "AegisLab".',
      timestamp: isoFrom(now, DAY + 2 * HOUR),
      read: true,
      category: 'role.changed',
      severity: 'info',
      actor: 'Bob Liu',
      to: '/settings/roles',
    },
    {
      id: 'n-6',
      title: 'Scheduled maintenance Saturday 02:00 UTC',
      body: 'Control plane will be read-only for ~15 minutes during the upgrade.',
      timestamp: isoFrom(now, 2 * DAY),
      read: false,
      category: 'system.update',
      severity: 'info',
    },
    {
      id: 'n-7',
      title: 'Injection INJ-2812 failed to start',
      body: 'order-svc pod was not ready within the 60s startup window.',
      timestamp: isoFrom(now, 4 * DAY),
      read: true,
      category: 'injection.completed',
      severity: 'error',
      to: '/portal',
    },
    {
      id: 'n-8',
      title: 'Dataset "checkout-baseline" published',
      body: 'Tagged v1.2 by Carmen Lee. 12.4M rows, 38 features.',
      timestamp: isoFrom(now, 6 * DAY),
      read: true,
      category: 'dataset.build.failed',
      severity: 'success',
      actor: 'Carmen Lee',
      to: '/datasets',
    },
  ];
}

function read(): AegisNotification[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  return JSON.parse(raw) as AegisNotification[];
}

function write(items: AegisNotification[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

interface DemoNotificationProviderProps {
  children: ReactNode;
}

export function DemoNotificationProvider({
  children,
}: DemoNotificationProviderProps): ReactElement {
  const [items, setItems] = useState<AegisNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setItems(read());
    setLoading(false);
  }, []);

  const markRead = useCallback((id: string): void => {
    setItems((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      write(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback((): void => {
    setItems((prev) => {
      const next = prev.map((n) => (n.read ? n : { ...n, read: true }));
      write(next);
      return next;
    });
  }, []);

  const archive = useCallback((id: string): void => {
    setItems((prev) => {
      const next = prev.filter((n) => n.id !== id);
      write(next);
      return next;
    });
  }, []);

  const refetch = useCallback(async (): Promise<void> => {
    await Promise.resolve();
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      items,
      unreadCount: items.filter((n) => !n.read).length,
      loading,
      markRead,
      markAllRead,
      archive,
      refetch,
    }),
    [items, loading, markRead, markAllRead, archive, refetch],
  );

  return <NotificationProvider value={value}>{children}</NotificationProvider>;
}
