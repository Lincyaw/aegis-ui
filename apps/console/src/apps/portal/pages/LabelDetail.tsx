import { useParams } from 'react-router-dom';

import {
  Chip,
  EmptyState,
  KeyValueList,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  SkeletonText,
  TimeDisplay,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { App as AntdApp } from 'antd';

import { useDeleteLabel, useLabel } from '../api/labels';
import { DeleteButton } from '../components/DeleteButton';
import { LoadError } from '../components/LoadError';

export default function LabelDetail() {
  const { labelId: rawId } = useParams<{ labelId: string }>();
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();
  const labelId = rawId !== undefined ? Number(rawId) : undefined;
  const { data: label, isLoading, isError, error } = useLabel(labelId);
  const del = useDeleteLabel();

  if (isLoading || isError || label?.id === undefined) {
    return (
      <>
        <PageHeader title={`Label ${rawId ?? ''}`} />
        <Panel>
          {isLoading ? (
            <SkeletonText />
          ) : isError ? (
            <LoadError
              error={error}
              title='Failed to load label'
              notFound={{
                title: 'Label not found',
                description: 'This label no longer exists.',
              }}
            />
          ) : (
            <EmptyState
              title='Label not found'
              description={`"${rawId ?? ''}" is not a label id.`}
            />
          )}
        </Panel>
      </>
    );
  }

  const id = label.id;
  const name = `${label.key ?? ''}=${label.value ?? ''}`;

  return (
    <>
      <PageHeader
        title={name}
        description={label.description ?? 'Label details and uses.'}
        action={
          <DeleteButton
            tone='ghost'
            subject={`label ${name}`}
            disabled={label.is_system === true}
            onDelete={async () => {
              await del.mutateAsync(id);
              void msg.success('Label deleted');
              navigate('labels');
            }}
          />
        }
      />
      <Panel title={<PanelTitle size='base'>Summary</PanelTitle>}>
        <KeyValueList
          items={[
            { k: 'id', v: <MonoValue size='sm'>{String(label.id)}</MonoValue> },
            {
              k: 'key',
              v: <MonoValue size='sm'>{label.key ?? '—'}</MonoValue>,
            },
            {
              k: 'value',
              v: <MonoValue size='sm'>{label.value ?? '—'}</MonoValue>,
            },
            {
              k: 'category',
              v: <Chip tone='ghost'>{label.category ?? '—'}</Chip>,
            },
            { k: 'system', v: label.is_system ? 'yes' : 'no' },
            { k: 'color', v: label.color ?? '—' },
            { k: 'status', v: label.status ?? '—' },
            {
              k: 'uses',
              v: <MonoValue size='sm'>{label.usage ?? 0}</MonoValue>,
            },
            {
              k: 'created',
              v: label.created_at ? (
                <TimeDisplay value={label.created_at} />
              ) : (
                '—'
              ),
            },
            {
              k: 'updated',
              v: label.updated_at ? (
                <TimeDisplay value={label.updated_at} />
              ) : (
                '—'
              ),
            },
          ]}
        />
      </Panel>
    </>
  );
}
