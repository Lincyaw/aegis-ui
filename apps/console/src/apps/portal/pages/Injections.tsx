import { App as AntdApp, Modal, Radio, Select } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import {
  Button,
  DataTable,
  MonoValue,
  PageHeader,
  Panel,
  TextField,
  TimeDisplay,
  useAppHref,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { StatusChip } from '../components/StatusChip';
import { useMockStore } from '../mocks';

interface InjectionRow {
  id: string;
  name: string;
  systemCode: string;
  contractId: string;
  status: string;
  createdAt: string;
}

export default function Injections() {
  const { projectId } = useParams<{ projectId: string }>();
  const [params] = useSearchParams();
  const navigate = useAppNavigate();
  const href = useAppHref();
  const { message: msg } = AntdApp.useApp();

  const injections = useMockStore((s) => s.injections);
  const datasets = useMockStore((s) => s.datasets);
  const addInjectionsToDataset = useMockStore((s) => s.addInjectionsToDataset);

  const filtered = useMemo<InjectionRow[]>(
    () =>
      injections
        .filter((i) => !projectId || i.projectId === projectId)
        .map((i) => ({
          id: i.id,
          name: i.name,
          systemCode: i.systemCode,
          contractId: i.contractId,
          status: i.status,
          createdAt: i.createdAt,
        })),
    [injections, projectId],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [datasetModalOpen, setDatasetModalOpen] = useState(false);
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [datasetName, setDatasetName] = useState('');
  const [datasetDesc, setDatasetDesc] = useState('');
  const [datasetId, setDatasetId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const sel = params.get('select');
    if (sel) {
      setSelected((s) => {
        const next = new Set(s);
        next.add(sel);
        return next;
      });
    }
  }, [params]);

  const toggle = (id: string): void => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const submitDataset = (): void => {
    if (selected.size === 0) {
      return;
    }
    if (mode === 'new' && !datasetName.trim()) {
      void msg.error('dataset name is required');
      return;
    }
    if (mode === 'existing' && !datasetId) {
      void msg.error('select a dataset');
      return;
    }
    const created = addInjectionsToDataset(Array.from(selected), {
      datasetId: mode === 'existing' ? datasetId : undefined,
      newName: mode === 'new' ? datasetName : undefined,
      description: datasetDesc,
    });
    void msg.success(
      `${selected.size} injection${selected.size === 1 ? '' : 's'} added to ${created.name}`,
    );
    setDatasetModalOpen(false);
    setSelected(new Set());
    setDatasetName('');
    setDatasetDesc('');
    navigate(`datasets/${created.id}`);
  };

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Injections'
        description={`Fault injections for project ${projectId ?? ''}.`}
        action={
          <Button
            tone='primary'
            onClick={() => navigate(`projects/${projectId ?? 'proj-catalog'}/injections/new`)}
          >
            + Inject
          </Button>
        }
      />

      {selected.size > 0 && (
        <div className='page-bulk-bar'>
          <span>
            {selected.size} selected
          </span>
          <div className='page-bulk-bar__actions'>
            <Button
              tone='primary'
              onClick={() => setDatasetModalOpen(true)}
            >
              Add to dataset
            </Button>
            <Button
              tone='ghost'
              onClick={() => {
                void msg.info('Tag flow not wired in prototype');
              }}
            >
              Tag
            </Button>
            <Button
              tone='ghost'
              onClick={() => {
                void msg.success('Export queued');
              }}
            >
              Export
            </Button>
            <Button tone='ghost' onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <Panel>
        <DataTable<InjectionRow>
          data={filtered}
          rowKey={(r) => r.id}
          emptyTitle='No injections'
          emptyDescription='Click + Inject to create one.'
          columns={[
            {
              key: 'sel',
              header: '',
              render: (r) => (
                <input
                  type='checkbox'
                  checked={selected.has(r.id)}
                  onChange={() => toggle(r.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`select ${r.id}`}
                />
              ),
            },
            {
              key: 'id',
              header: 'Injection',
              render: (r) => (
                <Link
                  to={href(`projects/${projectId ?? 'proj-catalog'}/injections/${r.id}`)}
                >
                  <MonoValue size='sm'>{r.id}</MonoValue>
                </Link>
              ),
            },
            { key: 'name', header: 'Name', render: (r) => r.name },
            {
              key: 'sys',
              header: 'System',
              render: (r) => <MonoValue size='sm'>{r.systemCode}</MonoValue>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => <StatusChip status={r.status} />,
            },
            {
              key: 'created',
              header: 'Created',
              render: (r) => <TimeDisplay value={r.createdAt} />,
            },
          ]}
        />
      </Panel>

      <Modal
        title='Add to dataset'
        open={datasetModalOpen}
        onCancel={() => setDatasetModalOpen(false)}
        onOk={submitDataset}
        okText='Add'
      >
        <Radio.Group
          value={mode}
          onChange={(e) => setMode(e.target.value as 'new' | 'existing')}
          style={{ marginBottom: 12 }}
        >
          <Radio value='new'>Create new</Radio>
          <Radio value='existing'>Append to existing</Radio>
        </Radio.Group>
        {mode === 'new' ? (
          <div>
            <TextField
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              placeholder='dataset name'
            />
            <div style={{ marginTop: 8 }}>
              <TextField
                value={datasetDesc}
                onChange={(e) => setDatasetDesc(e.target.value)}
                placeholder='description (optional)'
              />
            </div>
          </div>
        ) : (
          <Select
            style={{ width: '100%' }}
            value={datasetId}
            onChange={setDatasetId}
            placeholder='select dataset'
            options={datasets.map((d) => ({ value: d.id, label: d.name }))}
          />
        )}
      </Modal>
    </div>
  );
}
