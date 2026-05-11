import { useState } from 'react';

import { Button, Input, Modal, Select } from 'antd';

import {
  Avatar,
  Chip,
  DataTable,
  type DataTableColumn,
  FormRow,
  PageHeader,
  Panel,
  StatusDot,
} from '@OperationsPAI/aegis-ui';

import './Users.css';

type Role = 'admin' | 'editor' | 'viewer';
type Status = 'active' | 'pending' | 'disabled';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  online: boolean;
  lastActive: string;
}

const MOCK_USERS: UserRow[] = [
  {
    id: 'u-1',
    name: 'Grace Hopper',
    email: 'grace.hopper@aegislab.io',
    role: 'admin',
    status: 'active',
    online: true,
    lastActive: '2 min ago',
  },
  {
    id: 'u-2',
    name: 'Linus Torvalds',
    email: 'linus@aegislab.io',
    role: 'admin',
    status: 'active',
    online: true,
    lastActive: '14 min ago',
  },
  {
    id: 'u-3',
    name: 'Ada Lovelace',
    email: 'ada.lovelace@aegislab.io',
    role: 'editor',
    status: 'active',
    online: false,
    lastActive: '3 hours ago',
  },
  {
    id: 'u-4',
    name: 'Alan Turing',
    email: 'alan.turing@aegislab.io',
    role: 'editor',
    status: 'active',
    online: false,
    lastActive: 'Yesterday',
  },
  {
    id: 'u-5',
    name: 'Margaret Hamilton',
    email: 'margaret@aegislab.io',
    role: 'editor',
    status: 'active',
    online: true,
    lastActive: 'Just now',
  },
  {
    id: 'u-6',
    name: 'Edsger Dijkstra',
    email: 'dijkstra@aegislab.io',
    role: 'viewer',
    status: 'active',
    online: false,
    lastActive: '2 days ago',
  },
  {
    id: 'u-7',
    name: 'Barbara Liskov',
    email: 'barbara.liskov@aegislab.io',
    role: 'viewer',
    status: 'active',
    online: false,
    lastActive: '5 days ago',
  },
  {
    id: 'u-8',
    name: 'Donald Knuth',
    email: 'donald.knuth@aegislab.io',
    role: 'viewer',
    status: 'disabled',
    online: false,
    lastActive: '3 weeks ago',
  },
  {
    id: 'u-9',
    name: 'Katherine Johnson',
    email: 'katherine@aegislab.io',
    role: 'viewer',
    status: 'pending',
    online: false,
    lastActive: 'Never',
  },
  {
    id: 'u-10',
    name: 'Tim Berners-Lee',
    email: 'tim.bl@aegislab.io',
    role: 'editor',
    status: 'pending',
    online: false,
    lastActive: 'Never',
  },
];

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

const ROLE_TONE: Record<Role, 'ink' | 'default' | 'ghost'> = {
  admin: 'ink',
  editor: 'default',
  viewer: 'ghost',
};

function statusTone(status: Status): 'ink' | 'muted' | 'warning' {
  switch (status) {
    case 'active':
      return 'ink';
    case 'pending':
      return 'warning';
    case 'disabled':
      return 'muted';
  }
}

export default function Users() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);

  const filtered = MOCK_USERS.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) {
      return false;
    }
    if (statusFilter !== 'all' && u.status !== statusFilter) {
      return false;
    }
    if (
      search &&
      !u.name.toLowerCase().includes(search.toLowerCase()) &&
      !u.email.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleDisable = (user: UserRow): void => {
    Modal.confirm({
      title: `Disable ${user.name}?`,
      content: 'They will lose access to this workspace immediately.',
      okText: 'Disable',
      okButtonProps: { danger: true },
      onOk: () => {
        console.warn('disable user', user.id);
      },
    });
  };

  const columns: Array<DataTableColumn<UserRow>> = [
    {
      key: 'user',
      header: 'User',
      render: (u) => (
        <div className='users-page__user'>
          <Avatar
            name={u.name}
            size='md'
            status={u.online ? 'online' : 'offline'}
          />
          <div className='users-page__user-text'>
            <span className='users-page__user-name'>{u.name}</span>
            <span className='users-page__user-email'>{u.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => <Chip tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Chip>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <span className='users-page__status'>
          <StatusDot size={6} tone={statusTone(u.status)} />
          <span>{u.status[0].toUpperCase() + u.status.slice(1)}</span>
        </span>
      ),
    },
    {
      key: 'lastActive',
      header: 'Last active',
      render: (u) => (
        <span className='users-page__last-active'>{u.lastActive}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (u) => (
        <div className='users-page__actions'>
          <Button type='text' size='small' onClick={() => setEditTarget(u)}>
            Edit
          </Button>
          <Button
            type='text'
            size='small'
            danger
            onClick={() => handleDisable(u)}
          >
            Disable
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
          <Button type='primary' onClick={() => setInviteOpen(true)}>
            + Invite user
          </Button>
        }
      />
      <Panel>
        <div className='users-page__filters'>
          <Input.Search
            allowClear
            placeholder='Search by name or email'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='users-page__search'
          />
          <Select<Role | 'all'>
            value={roleFilter}
            onChange={setRoleFilter}
            className='users-page__select'
            options={[
              { value: 'all', label: 'All roles' },
              { value: 'admin', label: 'Admin' },
              { value: 'editor', label: 'Editor' },
              { value: 'viewer', label: 'Viewer' },
            ]}
          />
          <Select<Status | 'all'>
            value={statusFilter}
            onChange={setStatusFilter}
            className='users-page__select'
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'pending', label: 'Pending' },
              { value: 'disabled', label: 'Disabled' },
            ]}
          />
        </div>
        <DataTable<UserRow>
          columns={columns}
          data={filtered}
          rowKey={(u) => u.id}
          emptyTitle='No matching users'
          emptyDescription='Adjust the filters or invite someone new.'
        />
      </Panel>

      <Modal
        title='Invite user'
        open={inviteOpen}
        onCancel={() => setInviteOpen(false)}
        onOk={() => {
          console.warn('invite submitted');
          setInviteOpen(false);
        }}
        okText='Send invite'
      >
        <FormRow label='Email' description='Where the invite is sent.'>
          <Input placeholder='teammate@example.com' />
        </FormRow>
        <FormRow label='Role' description='Can be changed later.'>
          <Select
            defaultValue='viewer'
            style={{ width: '100%' }}
            options={[
              { value: 'admin', label: 'Admin' },
              { value: 'editor', label: 'Editor' },
              { value: 'viewer', label: 'Viewer' },
            ]}
          />
        </FormRow>
        <FormRow label='Welcome message' description='Optional.'>
          <Input.TextArea rows={3} placeholder='A short note for the invitee' />
        </FormRow>
      </Modal>

      <Modal
        title={editTarget ? `Edit ${editTarget.name}` : 'Edit user'}
        open={editTarget !== null}
        onCancel={() => setEditTarget(null)}
        onOk={() => {
          console.warn('edit saved', editTarget?.id);
          setEditTarget(null);
        }}
        okText='Save'
      >
        {editTarget !== null && (
          <>
            <FormRow label='Display name'>
              <Input defaultValue={editTarget.name} />
            </FormRow>
            <FormRow label='Role'>
              <Select
                defaultValue={editTarget.role}
                style={{ width: '100%' }}
                options={[
                  { value: 'admin', label: 'Admin' },
                  { value: 'editor', label: 'Editor' },
                  { value: 'viewer', label: 'Viewer' },
                ]}
              />
            </FormRow>
          </>
        )}
      </Modal>
    </>
  );
}
