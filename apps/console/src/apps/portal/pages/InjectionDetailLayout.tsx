import { useMemo } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';

import {
  Button,
  EmptyState,
  PageHeader,
  Panel,
  Tabs,
  useAppHref,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App as AntdApp } from 'antd';

import { useInjectionDetail } from '../api/injections';
import { injectionsApi } from '../api/portal-client';
import { StatusChip } from '../components/StatusChip';

const CANCELLABLE_STATES = new Set([
  'Pending',
  'Rescheduled',
  'Running',
  'pending',
  'rescheduled',
  'running',
]);

interface TabSpec {
  key: string;
  label: string;
  path: string;
}

const TAB_SPECS: TabSpec[] = [
  { key: 'overview', label: 'Overview', path: '' },
  { key: 'traces', label: 'Traces', path: 'traces' },
  { key: 'observations', label: 'Observations', path: 'observations' },
  { key: 'metrics', label: 'Metrics', path: 'metrics' },
];

export default function InjectionDetailLayout() {
  const { injectionId } = useParams<{ injectionId: string }>();
  const navigate = useAppNavigate();
  const href = useAppHref();
  const location = useLocation();
  const { message: msg } = AntdApp.useApp();
  const qc = useQueryClient();

  const idNum = injectionId ? Number.parseInt(injectionId, 10) : Number.NaN;
  const {
    data: injection,
    isLoading,
    isError,
    error,
  } = useInjectionDetail(Number.isNaN(idNum) ? null : idNum);

  const cancel = useMutation({
    mutationFn: async (id: number) => {
      const res = await injectionsApi.cancelInjection({ id });
      return res.data.data;
    },
    onSuccess: () => {
      void msg.success('Injection cancelled');
      void qc.invalidateQueries({ queryKey: ['portal', 'injection'] });
      void qc.invalidateQueries({ queryKey: ['portal', 'injections'] });
    },
    onError: (e: unknown) => {
      void msg.error(e instanceof Error ? e.message : 'Cancel failed');
    },
  });

  const activeTabKey = useMemo(() => {
    if (Number.isNaN(idNum)) {
      return 'overview';
    }
    const basePath = href(`injections/${String(idNum)}`);
    const tail = location.pathname.startsWith(basePath)
      ? location.pathname.slice(basePath.length).replace(/^\/+/, '')
      : '';
    const match = TAB_SPECS.find(
      (t) => (t.path === '' ? tail === '' : tail === t.path || tail.startsWith(`${t.path}/`)),
    );
    return match?.key ?? 'overview';
  }, [href, idNum, location.pathname]);

  if (Number.isNaN(idNum)) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={`Injection ${injectionId ?? ''}`} />
        <Panel>
          <EmptyState
            title='Invalid injection id'
            description={injectionId ?? ''}
          />
        </Panel>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={`Injection ${idNum}`} description='Loading…' />
      </div>
    );
  }

  if (isError || !injection) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={`Injection ${idNum}`} />
        <Panel>
          <EmptyState
            title='Injection not found'
            description={
              error instanceof Error
                ? error.message
                : 'It may have been removed or never existed.'
            }
          />
        </Panel>
      </div>
    );
  }

  const status = injection.status ?? injection.state ?? 'unknown';
  const cancellable = CANCELLABLE_STATES.has(status) && injection.task_id;

  const onTabChange = (key: string): void => {
    const spec = TAB_SPECS.find((t) => t.key === key);
    if (!spec) {
      return;
    }
    const base = `injections/${String(idNum)}`;
    navigate(spec.path === '' ? base : `${base}/${spec.path}`);
  };

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Injection ${injection.id ?? idNum}`}
        description={injection.name}
        action={
          <div className='page-action-row'>
            <StatusChip status={status} />
            {cancellable && (
              <Button
                tone='secondary'
                disabled={cancel.isPending}
                onClick={() => {
                  if (typeof injection.id === 'number') {
                    cancel.mutate(injection.id);
                  }
                }}
              >
                {cancel.isPending ? 'Cancelling…' : 'Cancel injection'}
              </Button>
            )}
          </div>
        }
      />

      <Tabs
        activeKey={activeTabKey}
        onChange={onTabChange}
        items={TAB_SPECS.map((t) => ({ key: t.key, label: t.label }))}
      />

      <Outlet />
    </div>
  );
}
