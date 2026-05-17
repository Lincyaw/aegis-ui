import { useState } from 'react';

import {
  Button,
  FormRow,
  PageHeader,
  Panel,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { App as AntdApp, Select } from 'antd';

import { useActiveProjectIdNum } from '../hooks/useActiveProject';
import {
  useContainersList,
  useDatasetsList,
} from '../hooks/useContainersAndDatasets';
import { useRunAlgorithm } from '../hooks/useExecutions';
import { useProject } from '../hooks/useProjects';

export default function ExecutionCreate() {
  const projectId = useActiveProjectIdNum();
  const projectQ = useProject(projectId > 0 ? projectId : undefined);
  const projectName = projectQ.data?.name ?? '';
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();

  const containersQ = useContainersList();
  const datasetsQ = useDatasetsList();
  const runAlgorithm = useRunAlgorithm();

  const [containerName, setContainerName] = useState<string | undefined>(
    undefined
  );
  const [datasetName, setDatasetName] = useState<string | undefined>(undefined);

  const submit = (): void => {
    if (!containerName) {
      void msg.error('container is required');
      return;
    }
    runAlgorithm.mutate(
      {
        projectId,
        projectName,
        algorithmName: containerName,
        datasetName: datasetName ?? undefined,
      },
      {
        onSuccess: () => {
          void msg.success('Algorithm execution submitted');
          navigate('executions');
        },
        onError: (err) => {
          void msg.error(err instanceof Error ? err.message : 'Submit failed');
        },
      }
    );
  };

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='Run algorithm'
        description={`Submit an algorithm execution for project ${projectName}.`}
        action={
          <Button
            tone='secondary'
            onClick={() => {
              navigate('executions');
            }}
          >
            Cancel
          </Button>
        }
      />
      <Panel>
        <FormRow label='Algorithm container'>
          <Select
            style={{ width: '100%' }}
            value={containerName}
            onChange={setContainerName}
            loading={containersQ.isLoading}
            placeholder='Select an algorithm container'
            options={(containersQ.data ?? []).map((c) => ({
              value: c.name ?? '',
              label: c.name ?? `#${String(c.id ?? '')}`,
            }))}
          />
        </FormRow>
        <FormRow label='Dataset'>
          <Select
            style={{ width: '100%' }}
            value={datasetName}
            onChange={setDatasetName}
            loading={datasetsQ.isLoading}
            allowClear
            placeholder='Optional — select a dataset'
            options={(datasetsQ.data ?? []).map((d) => ({
              value: d.name ?? '',
              label: d.name ?? `#${String(d.id ?? '')}`,
            }))}
          />
        </FormRow>
      </Panel>
      <Button tone='primary' onClick={submit} disabled={runAlgorithm.isPending}>
        {runAlgorithm.isPending ? 'Submitting…' : 'Run'}
      </Button>
    </div>
  );
}
