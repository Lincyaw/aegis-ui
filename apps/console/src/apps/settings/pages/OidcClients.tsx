import { useCallback, useEffect, useMemo, useState } from 'react';

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
import { App as AntdApp, Button, Form, Modal, Select } from 'antd';

import { ApiError } from '../../../api/apiClient';
import {
  createClient,
  type CreateClientReq,
  deleteClient,
  listClients,
  type OidcClient,
  rotateSecret,
} from '../../../api/ssoAdminClient';

const GRANTS = [
  { value: 'authorization_code', label: 'authorization_code' },
  { value: 'refresh_token', label: 'refresh_token' },
  { value: 'client_credentials', label: 'client_credentials' },
  { value: 'password', label: 'password' },
];

interface CreateFormValues {
  client_id: string;
  name: string;
  service: string;
  redirect_uris: string;
  grants: string[];
  scopes: string;
  is_confidential: boolean;
}

const actionsCellStyle = {
  display: 'flex',
  gap: 'var(--space-1)',
  justifyContent: 'flex-end',
};

function statusChip(status: number) {
  if (status === 1) {
    return <Chip tone='ink'>active</Chip>;
  }
  return <Chip tone='warning'>disabled</Chip>;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiError) {
    return e.message;
  }
  if (e instanceof Error) {
    return e.message;
  }
  return 'unknown error';
}

export default function OidcClients() {
  const { message: msg, modal } = AntdApp.useApp();
  const [clients, setClients] = useState<OidcClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm<CreateFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<{
    clientId: string;
    secret: string;
    label: string;
  } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listClients();
      setClients(data);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openCreate = (): void => {
    setCreateOpen(true);
  };
  const closeCreate = (): void => {
    setCreateOpen(false);
    createForm.resetFields();
  };

  const handleCreate = (): void => {
    createForm
      .validateFields()
      .then(async (values) => {
        setSubmitting(true);
        try {
          const req: CreateClientReq = {
            client_id: values.client_id.trim(),
            name: values.name.trim(),
            service: values.service.trim(),
            redirect_uris: values.redirect_uris
              .split(/[\s,]+/)
              .map((s) => s.trim())
              .filter(Boolean),
            grants: values.grants,
            scopes: values.scopes
              .split(/[\s,]+/)
              .map((s) => s.trim())
              .filter(Boolean),
            is_confidential: values.is_confidential,
          };
          const resp = await createClient(req);
          setRevealedSecret({
            clientId: resp.client_id,
            secret: resp.client_secret,
            label: `Client "${resp.name}" created`,
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

  const handleRotate = (row: OidcClient): void => {
    modal.confirm({
      title: `Rotate secret for "${row.name}"?`,
      content:
        'The existing secret will be invalidated immediately. All downstream services using this client must be updated.',
      okText: 'Rotate',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const resp = await rotateSecret(row.id);
          setRevealedSecret({
            clientId: resp.client_id,
            secret: resp.client_secret,
            label: `Secret rotated for "${row.name}"`,
          });
        } catch (e) {
          void msg.error(`Rotate failed: ${errMsg(e)}`);
        }
      },
    });
  };

  const handleDelete = (row: OidcClient): void => {
    modal.confirm({
      title: `Delete client "${row.name}"?`,
      content: `client_id ${row.client_id} will be removed permanently.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteClient(row.id);
          void msg.success('Client deleted');
          await refresh();
        } catch (e) {
          void msg.error(`Delete failed: ${errMsg(e)}`);
        }
      },
    });
  };

  const columns = useMemo<Array<DataTableColumn<OidcClient>>>(
    () => [
      {
        key: 'name',
        header: 'Name',
        render: (row) => row.name,
      },
      {
        key: 'client_id',
        header: 'client_id',
        render: (row) => <MonoValue size='sm'>{row.client_id}</MonoValue>,
      },
      {
        key: 'service',
        header: 'Service',
        render: (row) => <Chip tone='default'>{row.service}</Chip>,
      },
      {
        key: 'grants',
        header: 'Grants',
        render: (row) => (
          <span
            style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}
          >
            {row.grants.map((g) => (
              <Chip key={g} tone='ghost'>
                {g}
              </Chip>
            ))}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => statusChip(row.status),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (row) => (
          <div style={actionsCellStyle}>
            <Button
              size='small'
              type='text'
              onClick={() => {
                handleRotate(row);
              }}
            >
              Rotate
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
        ),
      },
    ],
    // handlers are stable for the lifetime of the component; deps array
    // would also pull modal/message which are stable from AntdApp.useApp.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <>
      <PageHeader
        title='OIDC clients'
        description='Manage clients registered against aegis-sso. Used by first-party UIs and downstream services.'
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
              Register client
            </Button>
          </span>
        }
      />
      {error !== null ? (
        <Panel>
          <ErrorState
            title='Could not load clients'
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
            data={clients}
            rowKey={(row) => row.id.toString()}
            loading={loading}
            emptyTitle='No OIDC clients'
            emptyDescription='Register a client to let a UI or service authenticate users.'
          />
          {!loading && clients.length === 0 ? (
            <div style={{ padding: 'var(--space-6)' }}>
              <EmptyState
                title='No OIDC clients yet'
                description='Register a client to let a UI or service authenticate users.'
                action={
                  <Button
                    type='primary'
                    icon={<PlusOutlined />}
                    onClick={openCreate}
                  >
                    Register client
                  </Button>
                }
              />
            </div>
          ) : null}
        </Panel>
      )}

      <Modal
        title='Register OIDC client'
        open={createOpen}
        onCancel={closeCreate}
        onOk={handleCreate}
        okText='Create'
        confirmLoading={submitting}
        destroyOnClose
        width={560}
      >
        <Form
          form={createForm}
          layout='vertical'
          initialValues={{
            grants: ['authorization_code', 'refresh_token'],
            scopes: 'openid profile email',
            is_confidential: true,
            redirect_uris: 'http://localhost:3100/auth/callback',
          }}
        >
          <Form.Item
            name='client_id'
            label='client_id'
            rules={[{ required: true, message: 'client_id is required' }]}
          >
            <TextField placeholder='aegis-console' />
          </Form.Item>
          <Form.Item
            name='name'
            label='Display name'
            rules={[{ required: true, message: 'name is required' }]}
          >
            <TextField placeholder='Aegis Console' />
          </Form.Item>
          <Form.Item
            name='service'
            label='Service'
            rules={[{ required: true, message: 'service is required' }]}
          >
            <TextField placeholder='aegis-portal' />
          </Form.Item>
          <Form.Item
            name='redirect_uris'
            label='Redirect URIs (whitespace or comma separated)'
            rules={[{ required: true, message: 'at least one redirect URI' }]}
          >
            <TextField placeholder='http://localhost:3100/auth/callback' />
          </Form.Item>
          <Form.Item
            name='grants'
            label='Grants'
            rules={[{ required: true, message: 'pick at least one grant' }]}
          >
            <Select mode='multiple' options={GRANTS} />
          </Form.Item>
          <Form.Item name='scopes' label='Scopes (space separated)'>
            <TextField placeholder='openid profile email' />
          </Form.Item>
          <Form.Item
            name='is_confidential'
            label='Confidential client'
            valuePropName='checked'
          >
            <input type='checkbox' />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={revealedSecret?.label ?? 'Client secret'}
        open={revealedSecret !== null}
        onCancel={() => {
          setRevealedSecret(null);
        }}
        onOk={() => {
          setRevealedSecret(null);
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
          code={`CLIENT_ID=${revealedSecret?.clientId ?? ''}\nCLIENT_SECRET=${revealedSecret?.secret ?? ''}`}
        />
      </Modal>
    </>
  );
}
