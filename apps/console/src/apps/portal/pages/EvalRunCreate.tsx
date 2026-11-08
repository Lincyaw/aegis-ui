import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  Button,
  Chip,
  FormRow,
  PageHeader,
  Panel,
  Select,
  TextField,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { App as AntdApp } from 'antd';

import { errMsg } from '../../../api/apiClient';
import { useDatasetsList } from '../api/datasets';
import { useBatchEvaluateDataset } from '../api/evaluations';

export default function EvalRunCreate() {
  const navigate = useAppNavigate();
  const [params] = useSearchParams();
  const { message: msg } = AntdApp.useApp();

  const datasetsQ = useDatasetsList({ page: 1, size: 100 });

  const [algorithm, setAlgorithm] = useState('');
  const [algorithmError, setAlgorithmError] = useState<string>();
  const [algorithmVersion, setAlgorithmVersion] = useState('latest');
  const [datasetName, setDatasetName] = useState(params.get('dataset') ?? '');
  const [datasetVersion, setDatasetVersion] = useState('latest');

  const mutate = useBatchEvaluateDataset();

  const datasetNames = (datasetsQ.data?.items ?? [])
    .map((d) => d.name)
    .filter((name): name is string => Boolean(name));
  if (datasetName !== '' && !datasetNames.includes(datasetName)) {
    datasetNames.unshift(datasetName);
  }

  const submit = (): void => {
    if (!algorithm.trim()) {
      setAlgorithmError('Algorithm name is required');
      return;
    }
    mutate.mutate(
      {
        specs: [
          {
            algorithm: { name: algorithm.trim(), version: algorithmVersion },
            dataset: { name: datasetName, version: datasetVersion },
          },
        ],
      },
      {
        onSuccess: () => {
          void msg.success('Evaluation enqueued');
          navigate('eval');
        },
        onError: (err) => {
          void msg.error(`Failed to start the evaluation: ${errMsg(err)}`);
        },
      }
    );
  };

  return (
    <>
      <PageHeader
        title='New evaluation run'
        description='Launch an algorithm evaluation against a dataset.'
        action={
          <Button tone='secondary' onClick={() => navigate('eval')}>
            Cancel
          </Button>
        }
      />
      <Panel>
        <FormRow label='Algorithm name'>
          <TextField
            value={algorithm}
            error={algorithmError}
            onChange={(e) => {
              setAlgorithm(e.target.value);
              setAlgorithmError(undefined);
            }}
            placeholder='e.g. rca-baseline'
          />
        </FormRow>
        <FormRow label='Algorithm version'>
          <TextField
            value={algorithmVersion}
            onChange={(e) => setAlgorithmVersion(e.target.value)}
          />
        </FormRow>
        <FormRow label='Dataset'>
          <div className='page-stack'>
            <Select
              ariaLabel='Dataset'
              value={datasetName}
              onChange={setDatasetName}
              disabled={datasetsQ.isLoading}
              placeholder={
                datasetsQ.isLoading ? 'Loading datasets…' : 'Select a dataset'
              }
              options={datasetNames.map((name) => ({
                value: name,
                label: name,
              }))}
            />
            {datasetsQ.isError && (
              <Chip tone='warning'>
                {`Failed to load datasets: ${errMsg(datasetsQ.error)}`}
              </Chip>
            )}
          </div>
        </FormRow>
        <FormRow label='Dataset version'>
          <TextField
            value={datasetVersion}
            onChange={(e) => setDatasetVersion(e.target.value)}
          />
        </FormRow>
      </Panel>
      <div className='wizard-actions'>
        <Button
          tone='primary'
          onClick={submit}
          disabled={datasetName === '' || mutate.isPending}
        >
          {mutate.isPending ? 'Starting…' : 'Start'}
        </Button>
      </div>
    </>
  );
}
