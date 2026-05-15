import { App as AntdApp } from 'antd';
import { Link, useParams } from 'react-router-dom';

import {
  Button,
  Chip,
  CodeBlock,
  EmptyState,
  KeyValueList,
  MetricLabel,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  SectionDivider,
  TimeDisplay,
  useAppHref,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { specToYaml } from '../components/inject/paramSchema';

import { StatusChip } from '../components/StatusChip';
import { useMockStore } from '../mocks';

export default function InjectionDetail() {
  const { injectionId } = useParams<{ injectionId: string }>();
  const href = useAppHref();
  const navigate = useAppNavigate();
  const { message: msg, modal } = AntdApp.useApp();

  const injection = useMockStore((s) =>
    s.injections.find((i) => i.id === injectionId),
  );
  const contracts = useMockStore((s) => s.contracts);
  const cancelInjection = useMockStore((s) => s.cancelInjection);

  if (!injection) {
    return (
      <div className='page-wrapper'>
        <PageHeader title={`Injection ${injectionId ?? ''}`} />
        <Panel>
          <EmptyState
            title='Injection not found'
            description='It may have been removed or never existed.'
          />
        </Panel>
      </div>
    );
  }

  const contract = contracts.find((c) => c.id === injection.contractId);
  const traceReady = injection.status === 'running' || injection.status === 'completed';
  const cancellable =
    injection.status === 'pending' || injection.status === 'running';

  const onCancel = (): void => {
    modal.confirm({
      title: 'Cancel this injection?',
      content: 'The backing task will be marked cancelled.',
      okText: 'Cancel injection',
      cancelText: 'Keep running',
      okButtonProps: { danger: true },
      onOk: () => {
        cancelInjection(injection.id);
        void msg.success(`Injection ${injection.id} cancelled`);
      },
    });
  };

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`Injection ${injection.id}`}
        description={injection.name}
        action={
          <div className='page-action-row'>
            <StatusChip status={injection.status} />
            {cancellable && (
              <Button tone='secondary' onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        }
      />

      <Panel title={<PanelTitle size='base'>Provenance</PanelTitle>}>
        <KeyValueList
          items={[
            {
              k: 'target system',
              v: <Link to={href(`systems/${injection.systemCode}`)}>{injection.systemCode}</Link>,
            },
            {
              k: 'contract',
              v: (
                <Link to={href(`contracts/${injection.contractId}`)}>
                  {contract?.name ?? injection.contractId}
                </Link>
              ),
            },
            {
              k: 'originating task',
              v: (
                <Link to={href(`tasks/${injection.taskId}`)}>{injection.taskId}</Link>
              ),
            },
            {
              k: 'trace',
              v: traceReady && injection.traceId ? (
                <Link to={href(`traces/${injection.traceId}`)}>
                  {injection.traceId}
                </Link>
              ) : (
                <Chip tone='ghost'>pending — trace appears after injection lands</Chip>
              ),
            },
            { k: 'project', v: <MonoValue size='sm'>{injection.projectId}</MonoValue> },
            { k: 'created', v: <TimeDisplay value={injection.createdAt} /> },
          ]}
        />
      </Panel>

      <Panel title={<PanelTitle size='base'>Parameters</PanelTitle>}>
        <KeyValueList
          items={[
            { k: 'blast radius', v: injection.blastRadius },
            { k: 'duration', v: `${injection.durationSec}s` },
            { k: 'intensity', v: `${injection.intensity}%` },
          ]}
        />
      </Panel>

      {injection.spec && (
        <Panel title={<PanelTitle size='base'>Spec</PanelTitle>}>
          <CodeBlock language='yaml' code={specToYaml(injection.spec)} />
        </Panel>
      )}

      <SectionDivider>Actions</SectionDivider>
      <div className='page-action-row'>
        <Button
          tone='primary'
          disabled={!traceReady || !injection.traceId}
          onClick={() => {
            if (injection.traceId) {
              navigate(`traces/${injection.traceId}`);
            }
          }}
        >
          View trace
        </Button>
        <Button
          tone='secondary'
          onClick={() => navigate('observations')}
        >
          View observations
        </Button>
        <Button
          tone='secondary'
          onClick={() => navigate(`injections?select=${injection.id}`)}
        >
          Add to dataset
        </Button>
      </div>

      <Panel>
        <MetricLabel>live status — page reflects store mutations</MetricLabel>
      </Panel>
    </div>
  );
}
