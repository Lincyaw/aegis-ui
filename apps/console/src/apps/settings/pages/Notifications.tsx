import { useMemo } from 'react';

import {
  Button,
  ErrorState,
  FormRow,
  PageHeader,
  Panel,
  SettingsSection,
  SkeletonText,
} from '@lincyaw/aegis-ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App as AntdApp, Switch } from 'antd';

import { ApiError, errMsg } from '../../../api/apiClient';
import {
  listSubscriptions,
  setSubscription,
  type SubscriptionRow,
} from '../../../api/notificationClient';
import { settingsKeys } from '../queryKeys';

import './Notifications.css';

// Categories the console understands. Backend may know more — we render
// any extra ones it returns at the bottom.
const KNOWN_CATEGORIES: Array<{
  key: string;
  label: string;
  description: string;
}> = [
  {
    key: 'injection.completed',
    label: 'Injection completed',
    description: 'A fault injection finished (success or failure).',
  },
  {
    key: 'dataset.build.failed',
    label: 'Dataset build failed',
    description: 'A dataset assembly job errored out.',
  },
  {
    key: 'system.update',
    label: 'System updates',
    description: 'Maintenance windows and platform announcements.',
  },
  {
    key: 'user.invited',
    label: 'User invited',
    description: 'Someone invited you to a project or team.',
  },
  {
    key: 'role.changed',
    label: 'Role changed',
    description: 'Your role in a workspace was modified.',
  },
];

const KNOWN_CHANNELS = ['inbox', 'email', 'slack'] as const;

function key(category: string, channel: string): string {
  return `${category}::${channel}`;
}

/** The user's subscriptions; a notify service without any yet answers 404. */
async function readSubscriptions(): Promise<SubscriptionRow[]> {
  try {
    return await listSubscriptions();
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      return [];
    }
    throw e;
  }
}

function withSubscription(
  rows: SubscriptionRow[] | undefined,
  row: SubscriptionRow
): SubscriptionRow[] {
  const others = (rows ?? []).filter(
    (r) => key(r.category, r.channel) !== key(row.category, row.channel)
  );
  return [...others, row];
}

export default function Notifications() {
  const { message: msg } = AntdApp.useApp();
  const queryClient = useQueryClient();
  const subscriptions = useQuery({
    queryKey: settingsKeys.subscriptions,
    queryFn: readSubscriptions,
  });
  const toggle = useMutation({
    mutationKey: settingsKeys.subscriptions,
    mutationFn: setSubscription,
    onMutate: async (row) => {
      await queryClient.cancelQueries({
        queryKey: settingsKeys.subscriptions,
      });
      const previous = queryClient.getQueryData<SubscriptionRow[]>(
        settingsKeys.subscriptions
      );
      queryClient.setQueryData<SubscriptionRow[]>(
        settingsKeys.subscriptions,
        (rows) => withSubscription(rows, row)
      );
      return { previous };
    },
    onError: (e, row, context) => {
      const before = context?.previous?.find(
        (r) => key(r.category, r.channel) === key(row.category, row.channel)
      );
      queryClient.setQueryData<SubscriptionRow[]>(
        settingsKeys.subscriptions,
        (rows) => withSubscription(rows, before ?? { ...row, enabled: false })
      );
      void msg.error(
        `Could not update ${row.category} / ${row.channel}: ${errMsg(e)}`
      );
    },
    onSettled: () => {
      // A refetch while another toggle is still saving would read the
      // server before that write lands and flip its switch back.
      if (
        queryClient.isMutating({ mutationKey: settingsKeys.subscriptions }) ===
        1
      ) {
        void queryClient.invalidateQueries({
          queryKey: settingsKeys.subscriptions,
        });
      }
    },
  });

  const subs = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const r of subscriptions.data ?? []) {
      m.set(key(r.category, r.channel), r.enabled);
    }
    return m;
  }, [subscriptions.data]);

  // Unknown categories returned by server but not in our list — render
  // them so admins don't lose visibility.
  const extraCategories = useMemo(() => {
    const known = new Set(KNOWN_CATEGORIES.map((c) => c.key));
    const seen = new Set<string>();
    for (const k of subs.keys()) {
      const [cat] = k.split('::');
      if (cat && !known.has(cat)) {
        seen.add(cat);
      }
    }
    return Array.from(seen);
  }, [subs]);

  const categories = [
    ...KNOWN_CATEGORIES,
    ...extraCategories.map((cat) => ({
      key: cat,
      label: cat,
      description: 'Category surfaced by the backend.',
    })),
  ];

  return (
    <>
      <PageHeader
        title='Notifications'
        description='Choose which events notify you, and on which channel.'
      />
      <Panel>
        <SettingsSection
          title='Events'
          description='Per-category × channel toggles. Backed by aegis-notify /inbox/subscriptions.'
        >
          {subscriptions.isError ? (
            <ErrorState
              title='Could not load your subscriptions'
              description={errMsg(subscriptions.error)}
              action={
                <Button
                  tone='secondary'
                  onClick={() => {
                    void subscriptions.refetch();
                  }}
                >
                  Retry
                </Button>
              }
            />
          ) : subscriptions.isPending ? (
            <SkeletonText lines={5} />
          ) : (
            categories.map((c) => (
              <FormRow key={c.key} label={c.label} description={c.description}>
                <div className='notifications-page__channels'>
                  {KNOWN_CHANNELS.map((ch) => (
                    <label key={ch} className='notifications-page__channel'>
                      <Switch
                        size='small'
                        checked={subs.get(key(c.key, ch)) ?? false}
                        onChange={(enabled) => {
                          toggle.mutate({
                            category: c.key,
                            channel: ch,
                            enabled,
                          });
                        }}
                      />
                      {ch}
                    </label>
                  ))}
                </div>
              </FormRow>
            ))
          )}
        </SettingsSection>
      </Panel>
    </>
  );
}
