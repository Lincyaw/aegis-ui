import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Avatar,
  Chip,
  DataTable,
  type DataTableColumn,
  EmptyState,
  ErrorState,
  FormRow,
  PageHeader,
  Panel,
  StatusDot,
} from '@lincyaw/aegis-ui';
import { App, Button, Form, Input, Modal, Pagination, Select } from 'antd';

import { ApiError } from '../../../api/apiClient';
import {
  createUser,
  deleteUser,
  type IamUser,
  listUsers,
  updateUser,
} from '../../../api/iamClient';

import './Users.css';

const PAGE_SIZE = 20;

function errMsg(e: unknown): string {
  if (e instanceof ApiError || e instanceof Error) {
    return e.message;
  }
  return 'unknown error';
}

function statusTone(status: string, active: boolean): 'ink' | 'muted' | 'warning' {
  if (!active) {
    return 'muted';
  }
  if (status === 'pending') {
    return 'warning';
  }
  return 'ink';
}

function statusLabel(u: IamUser): string {
  if (!u.is_active) {
    return 'Disabled';
  }
  if (u.status) {
    return u.status[0].toUpperCase() + u.status.slice(1);
  }
  return 'Active';
}

function displayName(u: IamUser): string {
  return u.full_name || u.username;
}

function roleNames(u: IamUser): string[] {
  return (u.roles ?? []).map((r) => r.name);
}

interface InviteForm {
  username: string;
  email: string;
  full_name: string;
  password: string;
}

interface EditForm {
  full_name: string;
  email: string;
}

export default function Users() {
  const { modal, message: msg } = App.useApp();
  const [users, setUsers] = useState<IamUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>(
    'all'
  );

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm] = Form.useForm<InviteForm>();
  const [editTarget, setEditTarget] = useState<IamUser | null>(null);
  const [editForm] = Form.useForm<EditForm>();
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listUsers({ page, size: PAGE_SIZE });
      setUsers(res.items);
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

  const roleOptions = useMemo(() => {
    const names = new Set<string>();
    users.forEach((u) => roleNames(u).forEach((n) => names.add(n)));
    return [
      { value: 'all', label: 'All roles' },
      ...[...names].sort().map((n) => ({ value: n, label: n })),
    ];
  }, [users]);

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && !roleNames(u).includes(roleFilter)) {
      return false;
    }
    if (statusFilter === 'active' && !u.is_active) {
      return false;
    }
    if (statusFilter === 'disabled' && u.is_active) {
      return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (
        !displayName(u).toLowerCase().includes(q) &&
        !u.email.toLowerCase().includes(q) &&
        !u.username.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const handleToggleActive = (u: IamUser): void => {
    const disable = u.is_active;
    modal.confirm({
      title: disable ? `Disable ${displayName(u)}?` : `Enable ${displayName(u)}?`,
      content: disable
        ? 'They will lose access to this workspace immediately.'
        : 'They will regain access to this workspace.',
      okText: disable ? 'Disable' : 'Enable',
      okButtonProps: { danger: disable },
      onOk: async () => {
        try {
          await updateUser(u.id, { is_active: !u.is_active });
          void msg.success(disable ? 'User disabled' : 'User enabled');
          await refresh();
        } catch (e) {
          void msg.error(`Update failed: ${errMsg(e)}`);
        }
      },
    });
  };

  const handleDelete = (u: IamUser): void => {
    modal.confirm({
      title: `Delete ${displayName(u)}?`,
      content: `${u.username} will be removed permanently.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteUser(u.id);
          void msg.success('User deleted');
          await refresh();
        } catch (e) {
          void msg.error(`Delete failed: ${errMsg(e)}`);
        }
      },
    });
  };

  const handleInvite = (): void => {
    inviteForm
      .validateFields()
      .then(async (values) => {
        setSubmitting(true);
        try {
          await createUser({
            username: values.username.trim(),
            email: values.email.trim(),
            full_name: values.full_name.trim(),
            password: values.password,
          });
          void msg.success('User created');
          setInviteOpen(false);
          inviteForm.resetFields();
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

  const handleEdit = (): void => {
    if (editTarget === null) {
      return;
    }
    const target = editTarget;
    editForm
      .validateFields()
      .then(async (values) => {
        setSubmitting(true);
        try {
          await updateUser(target.id, {
            full_name: values.full_name.trim(),
            email: values.email.trim(),
          });
          void msg.success('User updated');
          setEditTarget(null);
          await refresh();
        } catch (e) {
          void msg.error(`Update failed: ${errMsg(e)}`);
        } finally {
          setSubmitting(false);
        }
      })
      .catch(() => {
        /* validation handled inline */
      });
  };

  const columns: Array<DataTableColumn<IamUser>> = [
    {
      key: 'user',
      header: 'User',
      minWidth: 220,
      resizable: true,
      render: (u) => (
        <div className='users-page__user'>
          <Avatar name={displayName(u)} size='md' />
          <div className='users-page__user-text'>
            <span className='users-page__user-name'>{displayName(u)}</span>
            <span className='users-page__user-email'>{u.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Roles',
      minWidth: 120,
      truncate: false,
      resizable: true,
      render: (u) => {
        const names = roleNames(u);
        if (names.length === 0) {
          return <Chip tone='ghost'>none</Chip>;
        }
        return (
          <span style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
            {names.map((n) => (
              <Chip key={n} tone='default'>
                {n}
              </Chip>
            ))}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: 130,
      truncate: false,
      resizable: true,
      render: (u) => (
        <span className='users-page__status'>
          <StatusDot size={6} tone={statusTone(u.status, u.is_active)} />
          <span>{statusLabel(u)}</span>
        </span>
      ),
    },
    {
      key: 'lastActive',
      header: 'Last login',
      minWidth: 140,
      resizable: true,
      render: (u) => (
        <span className='users-page__last-active'>
          {u.last_login_at
            ? new Date(u.last_login_at).toLocaleString()
            : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 220,
      truncate: false,
      render: (u) => (
        <div className='users-page__actions'>
          <Button
            type='text'
            size='small'
            onClick={() => {
              setEditTarget(u);
              editForm.setFieldsValue({
                full_name: u.full_name,
                email: u.email,
              });
            }}
          >
            Edit
          </Button>
          <Button
            type='text'
            size='small'
            danger={u.is_active}
            onClick={() => {
              handleToggleActive(u);
            }}
          >
            {u.is_active ? 'Disable' : 'Enable'}
          </Button>
          <Button
            type='text'
            size='small'
            danger
            onClick={() => {
              handleDelete(u);
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title='Users'
        description='Manage members and their access.'
        action={
          <Button
            type='primary'
            onClick={() => {
              setInviteOpen(true);
            }}
          >
            + Invite user
          </Button>
        }
      />
      {error !== null ? (
        <Panel>
          <ErrorState
            title='Could not load users'
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
        <Panel>
          <div className='users-page__filters'>
            <Input.Search
              allowClear
              placeholder='Search by name or email'
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              className='users-page__search'
            />
            <Select<string>
              value={roleFilter}
              onChange={setRoleFilter}
              className='users-page__select'
              options={roleOptions}
            />
            <Select<'all' | 'active' | 'disabled'>
              value={statusFilter}
              onChange={setStatusFilter}
              className='users-page__select'
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'active', label: 'Active' },
                { value: 'disabled', label: 'Disabled' },
              ]}
            />
          </div>
          <DataTable<IamUser>
            columns={columns}
            data={filtered}
            rowKey={(u) => u.id.toString()}
            persistKey='settings.users'
            loading={loading}
            emptyTitle='No matching users'
            emptyDescription='Adjust the filters or invite someone new.'
          />
          {!loading && users.length === 0 ? (
            <EmptyState
              title='No users yet'
              description='Invite someone to get started.'
            />
          ) : null}
          {total > PAGE_SIZE ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                paddingTop: 'var(--space-3)',
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
        title='Invite user'
        open={inviteOpen}
        onCancel={() => {
          setInviteOpen(false);
          inviteForm.resetFields();
        }}
        onOk={handleInvite}
        okText='Create user'
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={inviteForm} layout='vertical'>
          <Form.Item
            name='username'
            label='Username'
            rules={[{ required: true, message: 'username is required' }]}
          >
            <Input placeholder='ada.lovelace' />
          </Form.Item>
          <Form.Item
            name='email'
            label='Email'
            rules={[
              { required: true, message: 'email is required' },
              { type: 'email', message: 'must be a valid email' },
            ]}
          >
            <Input placeholder='teammate@example.com' />
          </Form.Item>
          <Form.Item
            name='full_name'
            label='Display name'
            rules={[{ required: true, message: 'display name is required' }]}
          >
            <Input placeholder='Ada Lovelace' />
          </Form.Item>
          <Form.Item
            name='password'
            label='Initial password'
            rules={[
              { required: true, message: 'password is required' },
              { min: 8, message: 'at least 8 characters' },
            ]}
          >
            <Input.Password placeholder='at least 8 characters' />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editTarget ? `Edit ${displayName(editTarget)}` : 'Edit user'}
        open={editTarget !== null}
        onCancel={() => {
          setEditTarget(null);
        }}
        onOk={handleEdit}
        okText='Save'
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={editForm} layout='vertical'>
          <FormRow label='Display name'>
            <Form.Item name='full_name' noStyle>
              <Input />
            </Form.Item>
          </FormRow>
          <FormRow label='Email'>
            <Form.Item
              name='email'
              noStyle
              rules={[{ type: 'email', message: 'must be a valid email' }]}
            >
              <Input />
            </Form.Item>
          </FormRow>
        </Form>
      </Modal>
    </>
  );
}
