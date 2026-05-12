import { useState } from 'react';

import { PlusOutlined } from '@ant-design/icons';
import { Button, DatePicker, Form, Modal, Select } from 'antd';

import {
  Chip,
  DataTable,
  type DataTableColumn,
  MonoValue,
  PageHeader,
  Panel,
  TextField,
} from '@lincyaw/aegis-ui';

interface ApiKey {
  id: string;
  name: string;
  masked: string;
  scope: 'read-only' | 'read-write' | 'admin';
  created: string;
  lastUsed: string;
}

interface KeyFormValues {
  name: string;
  scope: ApiKey['scope'];
  expiry?: { format: (pattern: string) => string };
}

const MOCK_KEYS: ApiKey[] = [
  {
    id: 'key-prod',
    name: 'Production SDK',
    masked: 'ak_live_••••••••8f2a',
    scope: 'read-write',
    created: '2025-09-12',
    lastUsed: '3 min ago',
  },
  {
    id: 'key-staging',
    name: 'Staging CI',
    masked: 'ak_test_••••••••44d1',
    scope: 'read-write',
    created: '2025-10-03',
    lastUsed: '2 hours ago',
  },
  {
    id: 'key-ci',
    name: 'GitHub Actions',
    masked: 'ak_live_••••••••0b9c',
    scope: 'read-only',
    created: '2025-11-21',
    lastUsed: 'yesterday',
  },
  {
    id: 'key-analytics',
    name: 'Analytics Pipeline',
    masked: 'ak_live_••••••••72ee',
    scope: 'admin',
    created: '2026-01-15',
    lastUsed: '15 min ago',
  },
  {
    id: 'key-archive',
    name: 'Legacy Importer',
    masked: 'ak_live_••••••••a017',
    scope: 'read-only',
    created: '2024-06-30',
    lastUsed: 'never',
  },
];

function scopeChipTone(scope: ApiKey['scope']): 'ink' | 'default' | 'warning' {
  switch (scope) {
    case 'admin':
      return 'warning';
    case 'read-write':
      return 'ink';
    case 'read-only':
      return 'default';
  }
}

function scopeLabel(scope: ApiKey['scope']): string {
  switch (scope) {
    case 'admin':
      return 'Admin';
    case 'read-write':
      return 'Read-write';
    case 'read-only':
      return 'Read-only';
  }
}

const actionsCellStyle = {
  display: 'flex',
  gap: 'var(--space-1)',
  justifyContent: 'flex-end',
};

export default function ApiKeys() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<KeyFormValues>();

  const openModal = (): void => {
    setModalOpen(true);
  };
  const closeModal = (): void => {
    setModalOpen(false);
    form.resetFields();
  };

  const handleSubmit = (): void => {
    form
      .validateFields()
      .then((values) => {
        const payload = {
          name: values.name,
          scope: values.scope,
          expiry: values.expiry?.format('YYYY-MM-DD'),
        };
        console.warn('generate api key (demo)', payload);
        closeModal();
      })
      .catch(() => {
        /* validation errors are shown inline */
      });
  };

  const columns: Array<DataTableColumn<ApiKey>> = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => row.name,
    },
    {
      key: 'key',
      header: 'Key',
      render: (row) => <MonoValue size='sm'>{row.masked}</MonoValue>,
    },
    {
      key: 'scope',
      header: 'Scope',
      render: (row) => (
        <Chip tone={scopeChipTone(row.scope)}>{scopeLabel(row.scope)}</Chip>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (row) => <MonoValue size='sm'>{row.created}</MonoValue>,
    },
    {
      key: 'lastUsed',
      header: 'Last used',
      render: (row) => <MonoValue size='sm'>{row.lastUsed}</MonoValue>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: () => (
        <div style={actionsCellStyle}>
          <Button size='small' type='text'>
            Reveal
          </Button>
          <Button size='small' type='text'>
            Rotate
          </Button>
          <Button size='small' type='text' danger>
            Revoke
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title='API Keys'
        description='Manage SDK and service credentials for programmatic access.'
        action={
          <Button type='primary' icon={<PlusOutlined />} onClick={openModal}>
            Generate key
          </Button>
        }
      />
      <Panel padded={false}>
        <DataTable
          columns={columns}
          data={MOCK_KEYS}
          rowKey={(row) => row.id}
          emptyTitle='No API keys'
          emptyDescription='Generate your first key to start using the API.'
        />
      </Panel>

      <Modal
        title='Generate API key'
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSubmit}
        okText='Generate'
        destroyOnClose
      >
        <Form
          form={form}
          layout='vertical'
          initialValues={{ scope: 'read-only' }}
        >
          <Form.Item
            name='name'
            label='Name'
            rules={[{ required: true, message: 'Give the key a name.' }]}
          >
            <TextField placeholder='e.g. Production SDK' />
          </Form.Item>
          <Form.Item name='scope' label='Scope' rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'read-only', label: 'Read-only' },
                { value: 'read-write', label: 'Read-write' },
                { value: 'admin', label: 'Admin' },
              ]}
            />
          </Form.Item>
          <Form.Item name='expiry' label='Expiry'>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
