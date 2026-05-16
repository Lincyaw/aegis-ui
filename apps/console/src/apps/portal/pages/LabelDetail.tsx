import { App as AntdApp, Spin } from 'antd';
import { useParams } from 'react-router-dom';

import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  KeyValueList,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  TimeDisplay,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { useDeleteLabel, useLabel } from '../api/labels';

export default function LabelDetail() {
  const { labelId: rawId } = useParams<{ labelId: string }>();
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();
  const labelId = rawId !== undefined ? Number(rawId) : undefined;
  const { data: label, isLoading, isError, error } = useLabel(labelId);
  const del = useDeleteLabel();

  if (isLoading) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Loading…' />
        <Panel>
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6)' }}>
            <Spin />
          </div>
        </Panel>
      </div>
    );
  }

  if (isError) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Label' />
        <Panel>
          <ErrorState
            title='Failed to load label'
            description={error instanceof Error ? error.message : 'Unknown error'}
          />
        </Panel>
      </div>
    );
  }

  if (!label || label.id === undefined) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Label not found' />
        <Panel>
          <EmptyState title='Not found' description='Unknown label.' />
        </Panel>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <PageHeader
        title={`${label.key ?? ''}=${label.value ?? ''}`}
        description={label.description ?? 'Label details and uses.'}
        action={
          <Button
            tone='ghost'
            disabled={del.isPending || label.is_system === true}
            onClick={() => {
              if (label.id === undefined) {
                return;
              }
              del.mutate(label.id, {
                onSuccess: () => {
                  void msg.success('Label deleted');
                  navigate('labels');
                },
                onError: (err) => {
                  void msg.error(
                    err instanceof Error ? err.message : 'Failed to delete label',
                  );
                },
              });
            }}
          >
            Delete
          </Button>
        }
      />
      <Panel title={<PanelTitle size='base'>Summary</PanelTitle>}>
        <KeyValueList
          items={[
            { k: 'id', v: <MonoValue size='sm'>{String(label.id)}</MonoValue> },
            { k: 'key', v: <MonoValue size='sm'>{label.key ?? '—'}</MonoValue> },
            { k: 'value', v: <MonoValue size='sm'>{label.value ?? '—'}</MonoValue> },
            { k: 'category', v: <Chip tone='ghost'>{label.category ?? '—'}</Chip> },
            { k: 'system', v: label.is_system ? 'yes' : 'no' },
            { k: 'color', v: label.color ?? '—' },
            { k: 'status', v: label.status ?? '—' },
            { k: 'uses', v: <MonoValue size='sm'>{label.usage ?? 0}</MonoValue> },
            {
              k: 'created',
              v: label.created_at ? <TimeDisplay value={label.created_at} /> : '—',
            },
            {
              k: 'updated',
              v: label.updated_at ? <TimeDisplay value={label.updated_at} /> : '—',
            },
          ]}
        />
      </Panel>
    </div>
  );
}
