import { useCallback, useEffect, useMemo, useState } from 'react';

import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  Chip,
  DataTable,
  type DataTableColumn,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  TextField,
} from '@lincyaw/aegis-ui';
import { App as AntdApp, Button, Collapse, Form, Input, Modal, Select } from 'antd';

import { ApiError } from '../../../api/apiClient';
import {
  createProvider,
  type CreateProviderReq,
  deleteProvider,
  type IdentityProvider,
  listProviders,
  updateProvider,
} from '../../../api/identityProviderClient';

interface CreateFormValues {
  name: string;
  display_name: string;
  type?: 'oidc' | 'oauth2';
  client_id: string;
  client_secret: string;
  discovery_url?: string;
  authorize_url?: string;
  token_url?: string;
  userinfo_url?: string;
  scopes?: string;
  default_roles?: string;
}

const actionsCellStyle = {
  display: 'flex',
  gap: 'var(--space-1)',
  justifyContent: 'flex-end',
};

function errMsg(e: unknown): string {
  if (e instanceof ApiError) {
    return e.message;
  }
  if (e instanceof Error) {
    return e.message;
  }
  return 'unknown error';
}

export default function IdentityProviders() {
  const { message: msg, modal } = AntdApp.useApp();
  const [providers, setProviders] = useState<IdentityProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm<CreateFormValues>();
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProviders(await listProviders());
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
          // For name=google/github the backend fills type + endpoints + scopes
          // from presets, so only the entered fields are sent.
          const req: CreateProviderReq = {
            name: values.name.trim(),
            display_name: values.display_name.trim(),
            client_id: values.client_id.trim(),
            client_secret: values.client_secret,
          };
          if (values.type) req.type = values.type;
          if (values.discovery_url?.trim())
            req.discovery_url = values.discovery_url.trim();
          if (values.authorize_url?.trim())
            req.authorize_url = values.authorize_url.trim();
          if (values.token_url?.trim()) req.token_url = values.token_url.trim();
          if (values.userinfo_url?.trim())
            req.userinfo_url = values.userinfo_url.trim();
          if (values.scopes?.trim()) req.scopes = values.scopes.trim();
          if (values.default_roles?.trim())
            req.default_roles = values.default_roles.trim();

          await createProvider(req);
          void msg.success(`Provider "${req.name}" added`);
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

  const handleToggle = (row: IdentityProvider): void => {
    void (async () => {
      try {
        await updateProvider(row.id, { enabled: !row.enabled });
        void msg.success(row.enabled ? 'Provider disabled' : 'Provider enabled');
        await refresh();
      } catch (e) {
        void msg.error(`Update failed: ${errMsg(e)}`);
      }
    })();
  };

  const handleDelete = (row: IdentityProvider): void => {
    modal.confirm({
      title: `Delete provider "${row.display_name}"?`,
      content: `Provider "${row.name}" will be removed. Users who signed in through it keep their accounts but can no longer use it to log in.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteProvider(row.id);
          void msg.success('Provider deleted');
          await refresh();
        } catch (e) {
          void msg.error(`Delete failed: ${errMsg(e)}`);
        }
      },
    });
  };

  const columns = useMemo<Array<DataTableColumn<IdentityProvider>>>(
    () => [
      { key: 'display_name', header: 'Display name', render: (r) => r.display_name },
      { key: 'name', header: 'Name', render: (r) => r.name },
      {
        key: 'type',
        header: 'Type',
        render: (r) => <Chip tone='default'>{r.type}</Chip>,
      },
      {
        key: 'auto_provision',
        header: 'Auto-provision',
        render: (r) => (
          <Chip tone={r.auto_provision ? 'ink' : 'ghost'}>
            {r.auto_provision ? 'yes' : 'no'}
          </Chip>
        ),
      },
      {
        key: 'enabled',
        header: 'Status',
        render: (r) =>
          r.enabled ? (
            <Chip tone='ink'>enabled</Chip>
          ) : (
            <Chip tone='warning'>disabled</Chip>
          ),
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
                handleToggle(row);
              }}
            >
              {row.enabled ? 'Disable' : 'Enable'}
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
    // handlers are stable; modal/message come from the stable AntdApp.useApp.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <>
      <PageHeader
        title='Identity providers'
        description='Federated login providers (Google, GitHub, custom OIDC/OAuth2). For google/github only client_id and client_secret are needed — endpoints are auto-filled.'
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
              Add provider
            </Button>
          </span>
        }
      />
      {error !== null ? (
        <Panel>
          <ErrorState
            title='Could not load identity providers'
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
            data={providers}
            rowKey={(row) => row.id.toString()}
            loading={loading}
            emptyTitle='No identity providers'
            emptyDescription='Add Google or GitHub to enable social login.'
          />
          {!loading && providers.length === 0 ? (
            <div style={{ padding: 'var(--space-6)' }}>
              <EmptyState
                title='No identity providers yet'
                description='Add Google or GitHub to enable social login.'
                action={
                  <Button
                    type='primary'
                    icon={<PlusOutlined />}
                    onClick={openCreate}
                  >
                    Add provider
                  </Button>
                }
              />
            </div>
          ) : null}
        </Panel>
      )}

      <Modal
        title='Add identity provider'
        open={createOpen}
        onCancel={closeCreate}
        onOk={handleCreate}
        okText='Add'
        confirmLoading={submitting}
        destroyOnClose
        width={560}
      >
        <Form form={createForm} layout='vertical'>
          <Form.Item
            name='name'
            label='Name'
            rules={[{ required: true, message: 'name is required' }]}
            extra='Use "google" or "github" for auto-filled endpoints, or any key for a custom provider.'
          >
            <TextField placeholder='github' />
          </Form.Item>
          <Form.Item
            name='display_name'
            label='Display name'
            rules={[{ required: true, message: 'display name is required' }]}
          >
            <TextField placeholder='GitHub' />
          </Form.Item>
          <Form.Item
            name='client_id'
            label='Client ID'
            rules={[{ required: true, message: 'client_id is required' }]}
          >
            <TextField placeholder='Ov23li...' />
          </Form.Item>
          <Form.Item
            name='client_secret'
            label='Client Secret'
            rules={[{ required: true, message: 'client_secret is required' }]}
          >
            <Input.Password placeholder='client secret' />
          </Form.Item>
          <Collapse
            ghost
            items={[
              {
                key: 'advanced',
                label: 'Advanced (custom providers only)',
                children: (
                  <>
                    <Form.Item name='type' label='Type'>
                      <Select
                        allowClear
                        placeholder='auto for google/github'
                        options={[
                          { value: 'oidc', label: 'oidc' },
                          { value: 'oauth2', label: 'oauth2' },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item name='discovery_url' label='Discovery URL'>
                      <TextField placeholder='https://issuer/.well-known/openid-configuration' />
                    </Form.Item>
                    <Form.Item name='authorize_url' label='Authorize URL'>
                      <TextField />
                    </Form.Item>
                    <Form.Item name='token_url' label='Token URL'>
                      <TextField />
                    </Form.Item>
                    <Form.Item name='userinfo_url' label='Userinfo URL'>
                      <TextField />
                    </Form.Item>
                    <Form.Item
                      name='scopes'
                      label='Scopes (comma separated)'
                    >
                      <TextField placeholder='openid,email,profile' />
                    </Form.Item>
                    <Form.Item
                      name='default_roles'
                      label='Default roles (comma separated)'
                    >
                      <TextField placeholder='user' />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
        </Form>
      </Modal>
    </>
  );
}
