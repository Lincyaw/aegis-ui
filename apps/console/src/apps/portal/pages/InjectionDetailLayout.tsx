import { useMemo } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';

import {
  Button,
  EmptyState,
  PageHeader,
  Panel,
  SkeletonText,
  Tabs,
  useAppHref,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { App as AntdApp } from 'antd';

import { errMsg } from '../../../api/apiClient';
import { useCancelInjection, useInjectionDetail } from '../api/injections';
import { LoadError } from '../components/LoadError';
import { StatusChip } from '../components/StatusChip';
import { isActive } from '../domain/status';

interface TabSpec {
  key: string;
  label: string;
  path: string;
}

const TAB_SPECS: TabSpec[] = [
  { key: 'overview', label: 'Overview', path: '' },
  { key: 'process', label: 'Process', path: 'process' },
  { key: 'data', label: 'Data', path: 'data' },
];

export default function InjectionDetailLayout() {
  const { injectionId } = useParams<{ injectionId: string }>();
  const navigate = useAppNavigate();
  const href = useAppHref();
  const location = useLocation();
  const { message: msg } = AntdApp.useApp();

  const idNum = injectionId ? Number.parseInt(injectionId, 10) : Number.NaN;
  const {
    data: injection,
    isLoading,
    isError,
    error,
  } = useInjectionDetail(Number.isNaN(idNum) ? undefined : idNum);
  const cancel = useCancelInjection();

  const activeTabKey = useMemo(() => {
    if (Number.isNaN(idNum)) {
      return 'overview';
    }
    const basePath = href(`injections/${String(idNum)}`);
    const tail = location.pathname.startsWith(basePath)
      ? location.pathname.slice(basePath.length).replace(/^\/+/, '')
      : '';
    const match = TAB_SPECS.find((t) =>
      t.path === ''
        ? tail === ''
        : tail === t.path || tail.startsWith(`${t.path}/`)
    );
    return match?.key ?? 'overview';
  }, [href, idNum, location.pathname]);

  if (Number.isNaN(idNum)) {
    return (
      <>
        <PageHeader title={`Injection ${injectionId ?? ''}`} />
        <Panel>
          <EmptyState
            title='Invalid injection id'
            description={injectionId ?? ''}
          />
        </Panel>
      </>
    );
  }

  if (isLoading || isError || !injection) {
    return (
      <>
        <PageHeader title={`Injection ${String(idNum)}`} />
        <Panel>
          {isError ? (
            <LoadError
              error={error}
              title='Failed to load injection'
              notFound={{
                title: 'Injection not found',
                description: 'It may have been removed or never existed.',
              }}
            />
          ) : (
            <SkeletonText />
          )}
        </Panel>
      </>
    );
  }

  const state = injection.state;
  const cancellable = isActive(state) && Boolean(injection.task_id);

  const onCancel = (id: number): void => {
    cancel.mutate(id, {
      onSuccess: () => {
        void msg.success('Injection cancelled');
      },
      onError: (err) => {
        void msg.error(`Cancel failed: ${errMsg(err)}`);
      },
    });
  };

  const onTabChange = (key: string): void => {
    const spec = TAB_SPECS.find((t) => t.key === key);
    if (!spec) {
      return;
    }
    const base = `injections/${String(idNum)}`;
    navigate(spec.path === '' ? base : `${base}/${spec.path}`);
  };

  return (
    <>
      <PageHeader
        title={`Injection ${String(injection.id ?? idNum)}`}
        description={injection.name}
        action={
          <div className='page-action-row'>
            <StatusChip status={state} />
            {cancellable && (
              <Button
                tone='secondary'
                disabled={cancel.isPending}
                onClick={() => {
                  if (typeof injection.id === 'number') {
                    onCancel(injection.id);
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
    </>
  );
}
