import { useCallback, useEffect, useState } from 'react';

import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  Chip,
  CodeBlock,
  DataTable,
  type DataTableColumn,
  EmptyState,
  ErrorState,
  MonoValue,
  PageHeader,
  Panel,
  TextField,
} from '@lincyaw/aegis-ui';
import { App as AntdApp, Button, DatePicker, Form, Modal, Pagination } from 'antd';
import type { Dayjs } from 'dayjs';

import { ApiError } from '../../../api/apiClient';
import {
  type ApiKey,
  createApiKey,
  deleteApiKey,
  disableApiKey,
  enableApiKey,
  listApiKeys,
  revokeApiKey,
  rotateApiKey,
} from '../../../api/apiKeyClient';

const PAGE_SIZE = 20;

interface KeyFormValues {
  name: string;
  description?: string;
  scopes?: string;
  expiry?: Dayjs;
}

const actionsCellStyle = {
  display: 'flex',
  gap: 'var(--space-1)',
  justifyContent: 'flex-end',
  flexWrap: 'wrap' as const,
};

function errMsg(e: unknown): string {
  if (e instanceof ApiError || e instanceof Error) {
    return e.message;
  }
  return 'unknown error';
}

function statusChip(key: ApiKey) {
  if (key.revoked_at) {
    return <Chip tone='warning'>revoked</Chip>;
  }
  if (key.status === 1) {
    return <Chip tone='ink'>enabled</Chip>;
  }
  return <Chip tone='default'>disabled</Chip>;
}

function fmtDate(value?: string | null): string {
  return value ? new Date(value).toLocaleString() : '—';
}

export default function ApiKeys() {
  const { message: msg, modal } = AntdApp.useApp();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm<KeyFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState<{
    keyId: string;
    secret: string;
    label: string;
  } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listApiKeys({ page, size: PAGE_SIZE });
      setKeys(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openCreate = (): void => {
    setCreateOpen(true);
  };
  const closeCreate = (): void => {
    setCreateOpen(false);
    form.resetFields();
  };

  const handleCreate = (): void => {
    form
      .validateFields()
      .then(async (values) => {
        setSubmitting(true);
        try {
          const scopes = values.scopes
            ? values.scopes
                .split(/[\s,]+/)
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined;
          const resp = await createApiKey({
            name: values.name.trim(),
            description: values.description?.trim() || undefined,
            scopes,
            expires_at: values.expiry?.toISOString(),
          });
          setRevealed({
            keyId: resp.key_id,
            secret: resp.key_secret,
            label: `API key "${resp.name}" created`,
          });
          closeCreate();
          await refresh();
        } catch (e) {
          void msg.error(`Create failed: ${errMsg(e)}`);
        } finally {
          setSubmitting(false);
        }
      })
      .catch(() => {
        /* validation handled inline */
      });
  };

  const handleRotate = (row: ApiKey): void => {
    modal.confirm({
      title: `Rotate secret for "${row.name}"?`,
      content:
        'The existing secret will be invalidated immediately. Any client using this key must be updated.',
      okText: 'Rotate',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const resp = await rotateApiKey(row.id);
          setRevealed({
            keyId: resp.key_id,
            secret: resp.key_secret,
            label: `Secret rotated for "${row.name}"`,
          });
          await refresh();
        } catch (e) {
          void msg.error(`Rotate failed: ${errMsg(e)}`);
        }
      },
    });
  };

  const handleToggle = (row: ApiKey): void => {
    const enabled = row.status === 1 && !row.revoked_at;
    void (async () => {
      try {
        if (enabled) {
          await disableApiKey(row.id);
          void msg.success('API key disabled');
        } else {
          await enableApiKey(row.id);
          void msg.success('API key enabled');
        }
        await refresh();
      } catch (e) {
        void msg.error(`Update failed: ${errMsg(e)}`);
      }
    })();
  };

  const handleRevoke = (row: ApiKey): void => {
    modal.confirm({
      title: `Revoke "${row.name}"?`,
      content:
        'A revoked key can no longer be re-enabled or used to exchange tokens.',
      okText: 'Revoke',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await revokeApiKey(row.id);
          void msg.success('API key revoked');
          await refresh();
        } catch (e) {
          void msg.error(`Revoke failed: ${errMsg(e)}`);
        }
      },
    });
  };

  const handleDelete = (row: ApiKey): void => {
    modal.confirm({
      title: `Delete "${row.name}"?`,
      content: `${row.key_id} will be removed permanently.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteApiKey(row.id);
          void msg.success('API key deleted');
          await refresh();
        } catch (e) {
          void msg.error(`Delete failed: ${errMsg(e)}`);
        }
      },
    });
  };

  const columns: Array<DataTableColumn<ApiKey>> = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => row.name,
    },
    {
      key: 'key_id',
      header: 'Key ID',
      render: (row) => <MonoValue size='sm'>{row.key_id}</MonoValue>,
    },
    {
      key: 'scopes',
      header: 'Scopes',
      render: (row) => (
        <span style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
          {(row.scopes ?? []).map((s) => (
            <Chip key={s} tone='ghost'>
              {s}
            </Chip>
          ))}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => statusChip(row),
    },
    {
      key: 'created',
      header: 'Created',
      render: (row) => <MonoValue size='sm'>{fmtDate(row.created_at)}</MonoValue>,
    },
    {
      key: 'lastUsed',
      header: 'Last used',
      render: (row) => <MonoValue size='sm'>{fmtDate(row.last_used_at)}</MonoValue>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      truncate: false,
      render: (row) => {
        const revoked = Boolean(row.revoked_at);
        const enabled = row.status === 1 && !revoked;
        return (
          <div style={actionsCellStyle}>
            <Button
              size='small'
              type='text'
              disabled={revoked}
              onClick={() => {
                handleRotate(row);
              }}
            >
              Rotate
            </Button>
            <Button
              size='small'
              type='text'
              disabled={revoked}
              onClick={() => {
                handleToggle(row);
              }}
            >
              {enabled ? 'Disable' : 'Enable'}
            </Button>
            <Button
              size='small'
              type='text'
              danger
              disabled={revoked}
              onClick={() => {
                handleRevoke(row);
              }}
            >
              Revoke
            </Button>
            <Button
              size='small'
              type='text'
              danger
              onClick={() => {
                handleDelete(row);
              }}
            >
              Delete
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title='API Keys'
        description='Manage SDK and service credentials for programmatic access.'
        action={
          <span style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                void refresh();
              }}
            >
              Refresh
            </Button>
            <Button type='primary' icon={<PlusOutlined />} onClick={openCreate}>
              Generate key
            </Button>
          </span>
        }
      />
      {error !== null ? (
        <Panel>
          <ErrorState
            title='Could not load API keys'
            description={error}
            action={
              <Button
                onClick={() => {
                  void refresh();
                }}
              >
                Try again
              </Button>
            }
          />
        </Panel>
      ) : (
        <Panel padded={false}>
          <DataTable
            columns={columns}
            data={keys}
            rowKey={(row) => row.id.toString()}
            loading={loading}
            emptyTitle='No API keys'
            emptyDescription='Generate your first key to start using the API.'
          />
          {!loading && keys.length === 0 ? (
            <div style={{ padding: 'var(--space-6)' }}>
              <EmptyState
                title='No API keys yet'
                description='Generate your first key to start using the API.'
                action={
                  <Button
                    type='primary'
                    icon={<PlusOutlined />}
                    onClick={openCreate}
                  >
                    Generate key
                  </Button>
                }
              />
            </div>
          ) : null}
          {total > PAGE_SIZE ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: 'var(--space-3)',
              }}
            >
              <Pagination
                current={page}
                pageSize={PAGE_SIZE}
                total={total}
                showSizeChanger={false}
                onChange={setPage}
              />
            </div>
          ) : null}
        </Panel>
      )}

      <Modal
        title='Generate API key'
        open={createOpen}
        onCancel={closeCreate}
        onOk={handleCreate}
        okText='Generate'
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout='vertical'>
          <Form.Item
            name='name'
            label='Name'
            rules={[{ required: true, message: 'Give the key a name.' }]}
          >
            <TextField placeholder='e.g. Production SDK' />
          </Form.Item>
          <Form.Item name='description' label='Description'>
            <TextField placeholder='Optional note about where this key is used' />
          </Form.Item>
          <Form.Item
            name='scopes'
            label='Scopes (space or comma separated)'
            help='Leave empty for full access (*).'
          >
            <TextField placeholder='*' />
          </Form.Item>
          <Form.Item name='expiry' label='Expiry'>
            <DatePicker style={{ width: '100%' }} showTime />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={revealed?.label ?? 'API key secret'}
        open={revealed !== null}
        onCancel={() => {
          setRevealed(null);
        }}
        onOk={() => {
          setRevealed(null);
        }}
        okText='Got it'
        cancelButtonProps={{ style: { display: 'none' } }}
        destroyOnClose
      >
        <p style={{ marginTop: 0 }}>
          Copy the secret now — it will not be shown again.
        </p>
        <CodeBlock
          language='bash'
          code={`KEY_ID=${revealed?.keyId ?? ''}\nKEY_SECRET=${revealed?.secret ?? ''}`}
        />
      </Modal>
    </>
  );
}
