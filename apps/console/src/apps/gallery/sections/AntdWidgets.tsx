import { type ReactNode, useState } from 'react';

import {
  Chip,
  DataTable,
  KeyValueList,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
  SectionDivider,
  Terminal,
} from '@lincyaw/aegis-ui';
import {
  Button,
  Form,
  Input,
  Modal,
  Progress,
  Select,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';

import { GALLERY_RUN_COLUMNS } from '../columns';
import { GALLERY_RUNS, KV_PARAMS, TERMINAL_LINES } from '../fixtures';
import { Specimen } from '../shared';

const TABLE_DATA = [
  {
    key: 1,
    id: 'INJ-0001',
    type: 'NetworkLatency',
    target: 'order-svc',
    duration: '120 s',
    state: 'running',
  },
  {
    key: 2,
    id: 'INJ-0002',
    type: 'CPUStress',
    target: 'cart-svc',
    duration: '300 s',
    state: 'queued',
  },
  {
    key: 3,
    id: 'INJ-0003',
    type: 'PodKill',
    target: 'inventory',
    duration: '—',
    state: 'failed',
  },
];

const TABLE_COLUMNS = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    render: (v: string) => (
      <MonoValue size='sm' weight='regular'>
        {v}
      </MonoValue>
    ),
  },
  { title: 'Type', dataIndex: 'type', key: 'type' },
  { title: 'Target', dataIndex: 'target', key: 'target' },
  {
    title: 'Duration',
    dataIndex: 'duration',
    key: 'duration',
    render: (v: string) => (
      <MonoValue size='sm' weight='regular'>
        {v}
      </MonoValue>
    ),
  },
  {
    title: 'State',
    dataIndex: 'state',
    key: 'state',
    render: (v: string) => {
      const tone =
        v === 'running' ? 'ink' : v === 'failed' ? 'warning' : 'default';
      return <Chip tone={tone}>{v}</Chip>;
    },
  },
];

function DataTableSelectionSpecimen(): ReactNode {
  const [selectedKeys, setSelectedKeys] = useState<Array<string | number>>([]);
  return (
    <div className='gallery__stack'>
      <Panel title='Runs' padded={false}>
        <DataTable
          framed={false}
          columns={GALLERY_RUN_COLUMNS}
          data={GALLERY_RUNS.slice(0, 5)}
          rowKey={(row) => row.id}
          selectable
          selectedKeys={selectedKeys}
          onSelectedKeysChange={setSelectedKeys}
        />
      </Panel>
      <MetricLabel as='div' size='xs'>
        {`已选 ${selectedKeys.length.toString()} 行 · header checkbox tracks partial selection`}
      </MetricLabel>
    </div>
  );
}

export function AntdWidgetsSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [switchOn, setSwitchOn] = useState(true);

  return (
    <Panel
      title={<PanelTitle size='lg'>AntD widgets · themed</PanelTitle>}
      extra={<MetricLabel>ConfigProvider</MetricLabel>}
    >
      <SectionDivider>Buttons</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='primary'>
          <Button type='primary'>Initialize Lab</Button>
        </Specimen>
        <Specimen caption='default'>
          <Button>Cancel</Button>
        </Specimen>
        <Specimen caption='dashed'>
          <Button type='dashed'>+ Add target</Button>
        </Specimen>
        <Specimen caption='text'>
          <Button type='text'>Skip</Button>
        </Specimen>
        <Specimen caption='primary · loading'>
          <Button type='primary' loading>
            Running
          </Button>
        </Specimen>
        <Specimen caption='primary · disabled'>
          <Button type='primary' disabled>
            Locked
          </Button>
        </Specimen>
      </div>

      <SectionDivider>Inputs</SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='Input' span={2}>
          <Input placeholder='experiment-name' />
        </Specimen>
        <Specimen caption='Input.Search' span={2}>
          <Input.Search placeholder='search injections…' allowClear />
        </Specimen>
        <Specimen caption='Select' span={2}>
          <Select
            placeholder='select target'
            style={{ width: '100%' }}
            options={[
              { value: 'order', label: 'order-svc' },
              { value: 'cart', label: 'cart-svc' },
              { value: 'inv', label: 'inventory-svc' },
            ]}
          />
        </Specimen>
        <Specimen caption='Switch'>
          <Switch checked={switchOn} onChange={setSwitchOn} />
        </Specimen>
      </div>

      <SectionDivider>Tags &amp; Progress</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='Tag — neutral'>
          <Tag>queued</Tag>
        </Specimen>
        <Specimen caption='Tag — primary'>
          <Tag color='black'>running</Tag>
        </Specimen>
        <Specimen caption='Tag — error'>
          <Tag color='error'>failed</Tag>
        </Specimen>
        <Specimen caption='Progress 30%' span={2}>
          <Progress percent={30} />
        </Specimen>
        <Specimen caption='Progress 78%' span={2}>
          <Progress percent={78} />
        </Specimen>
      </div>

      <SectionDivider>Tabs</SectionDivider>
      <Tabs
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <p className='gallery__panel-body'>
                Tab content uses the same base typography as panels.
              </p>
            ),
          },
          {
            key: 'params',
            label: 'Parameters',
            children: <KeyValueList items={KV_PARAMS} />,
          },
          {
            key: 'log',
            label: 'Log',
            children: <Terminal lines={TERMINAL_LINES.slice(0, 3)} />,
          },
        ]}
      />

      <SectionDivider>Table</SectionDivider>
      <DataTableSelectionSpecimen />
      <Table
        dataSource={TABLE_DATA}
        columns={TABLE_COLUMNS}
        pagination={false}
        size='middle'
        scroll={{ x: 'max-content' }}
      />

      <SectionDivider>Tooltip &amp; Modal</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='Tooltip on hover'>
          <Tooltip title='Inverted spotlight tooltip' placement='top'>
            <Button>Hover me</Button>
          </Tooltip>
        </Specimen>
        <Specimen caption='Modal'>
          <Button onClick={() => setModalOpen(true)}>Open modal</Button>
          <Modal
            title='Confirm injection'
            open={modalOpen}
            onOk={() => setModalOpen(false)}
            onCancel={() => setModalOpen(false)}
            okText='Inject'
          >
            <p>
              This will execute <MonoValue size='sm'>Clock Drift</MonoValue>{' '}
              against <MonoValue size='sm'>EU‑WEST‑01</MonoValue>.
            </p>
          </Modal>
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>Vertical layout</MetricLabel>}>
        Form
      </SectionDivider>
      <Form
        layout='vertical'
        initialValues={{
          name: 'playing-the-world',
          cluster: 'EU-WEST-01',
          autoRestart: true,
        }}
        requiredMark
        className='gallery__form'
      >
        <Form.Item
          label='Experiment name'
          name='name'
          required
          tooltip='Lower-case slug, used as the run identifier.'
          rules={[{ required: true, message: 'name is required' }]}
        >
          <Input placeholder='experiment-name' />
        </Form.Item>

        <Form.Item
          label='Target service'
          name='target'
          required
          validateStatus='error'
          help='Target service is required.'
        >
          <Select
            placeholder='select target'
            options={[
              { value: 'order', label: 'order-svc' },
              { value: 'cart', label: 'cart-svc' },
              { value: 'inv', label: 'inventory-svc' },
            ]}
          />
        </Form.Item>

        <Form.Item label='Run on cluster' name='cluster'>
          <Input />
        </Form.Item>

        <Form.Item
          label='Auto-restart on failure'
          name='autoRestart'
          valuePropName='checked'
          extra='If a worker fails mid-run, restart it once and continue.'
        >
          <Switch />
        </Form.Item>

        <Form.Item className='gallery__form-actions'>
          <Button>Cancel</Button>
          <Button type='primary'>Save &amp; queue</Button>
        </Form.Item>
      </Form>
    </Panel>
  );
}
