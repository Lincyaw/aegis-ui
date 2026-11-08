import { useState } from 'react';

import {
  Button,
  Chip,
  PageHeader,
  Panel,
  Select,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { ContainerType, PageSize } from '@lincyaw/portal';
import { App as AntdApp } from 'antd';

import { errMsg } from '../../../api/apiClient';
import { useContainersList } from '../api/containers';
import { useDatasetsList } from '../api/datasets';
import { useRunAlgorithm } from '../api/executions';
import { ProjectRequired } from '../components/ProjectRequired';
import { useActiveProject } from '../hooks/useActiveProject';

export default function ExecutionCreate() {
  const active = useActiveProject();
  const navigate = useAppNavigate();
  const { message: msg } = AntdApp.useApp();

  const containersQ = useContainersList({
    page: 1,
    size: PageSize.XLarge,
    type: ContainerType.Algorithm,
  });
  const datasetsQ = useDatasetsList({ page: 1, size: 100 });
  const runAlgorithm = useRunAlgorithm();

  const [algorithmName, setAlgorithmName] = useState('');
  const [datasetName, setDatasetName] = useState('');

  const { project, projectId } = active;
  const header = (
    <PageHeader
      title='Run algorithm'
      description={
        project?.name === undefined
          ? 'Submit an algorithm execution.'
          : `Submit an algorithm execution in ${project.name}.`
      }
      action={
        <Button tone='secondary' onClick={() => navigate('executions')}>
          Cancel
        </Button>
      }
    />
  );

  if (projectId === undefined) {
    return (
      <>
        {header}
        <ProjectRequired active={active} />
      </>
    );
  }

  const submit = (): void => {
    runAlgorithm.mutate(
      {
        projectId,
        projectName: project?.name ?? '',
        algorithmName,
        datasetName: datasetName || undefined,
      },
      {
        onSuccess: () => {
          void msg.success('Algorithm execution submitted');
          navigate('executions');
        },
        onError: (err) => {
          void msg.error(`Submit failed: ${errMsg(err)}`);
        },
      }
    );
  };

  return (
    <>
      {header}
      <Panel>
        <div className='page-stack'>
          <Select
            label='Algorithm'
            value={algorithmName}
            onChange={setAlgorithmName}
            disabled={containersQ.isLoading || containersQ.isError}
            placeholder={
              containersQ.isLoading
                ? 'Loading algorithms…'
                : 'Select an algorithm'
            }
            options={(containersQ.data?.items ?? []).map((c) => ({
              value: c.name ?? '',
              label: c.name ?? `#${String(c.id ?? '')}`,
            }))}
          />
          {containersQ.isError && (
            <Chip tone='warning'>
              {`Failed to load algorithms: ${errMsg(containersQ.error)}`}
            </Chip>
          )}
          <Select
            label='Dataset (optional)'
            value={datasetName}
            onChange={setDatasetName}
            allowClear
            disabled={datasetsQ.isLoading || datasetsQ.isError}
            placeholder={
              datasetsQ.isLoading ? 'Loading datasets…' : 'Select a dataset'
            }
            options={(datasetsQ.data?.items ?? []).map((d) => ({
              value: d.name ?? '',
              label: d.name ?? `#${String(d.id ?? '')}`,
            }))}
          />
          {datasetsQ.isError && (
            <Chip tone='warning'>
              {`Failed to load datasets: ${errMsg(datasetsQ.error)}`}
            </Chip>
          )}
        </div>
      </Panel>
      <div className='wizard-actions'>
        <Button
          tone='primary'
          onClick={submit}
          disabled={algorithmName === '' || runAlgorithm.isPending}
        >
          {runAlgorithm.isPending ? 'Submitting…' : 'Run'}
        </Button>
      </div>
    </>
  );
}
