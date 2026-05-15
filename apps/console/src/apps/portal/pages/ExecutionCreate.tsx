import { App as AntdApp, Select } from 'antd';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  Button,
  FormRow,
  PageHeader,
  Panel,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { useMockStore } from '../mocks';

export default function ExecutionCreate() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();

  const containers = useMockStore((s) => s.containers);
  const datasets = useMockStore((s) => s.datasets);

  const [containerId, setContainerId] = useState(containers[0]?.id ?? '');
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? '');

  const submit = (): void => {
    if (!containerId || !datasetId) {
      void msg.error('container and dataset are required');
      return;
    }
    void msg.success('Algorithm execution queued (mocked)');
    navigate(`projects/${projectId ?? 'proj-catalog'}/executions`);
  };

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Run algorithm'
        description={`Submit an algorithm execution for project ${projectId ?? ''}.`}
        action={
          <Button
            tone='secondary'
            onClick={() => navigate(`projects/${projectId ?? 'proj-catalog'}/executions`)}
          >
            Cancel
          </Button>
        }
      />
      <Panel>
        <FormRow label='Algorithm container'>
          <Select
            style={{ width: '100%' }}
            value={containerId}
            onChange={setContainerId}
            options={containers.map((c) => ({ value: c.id, label: `${c.name} (${c.algorithm})` }))}
          />
        </FormRow>
        <FormRow label='Dataset'>
          <Select
            style={{ width: '100%' }}
            value={datasetId}
            onChange={setDatasetId}
            options={datasets.map((d) => ({ value: d.id, label: d.name }))}
          />
        </FormRow>
      </Panel>
      <Button tone='primary' onClick={submit}>
        Run
      </Button>
    </div>
  );
}
