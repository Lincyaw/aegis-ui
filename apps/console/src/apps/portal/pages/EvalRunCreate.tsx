import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  Button,
  EmptyState,
  FormRow,
  PageHeader,
  Panel,
  useAppNavigate,
} from '@lincyaw/aegis-ui';
import { useQuery } from '@tanstack/react-query';
import { App as AntdApp, Input, Select } from 'antd';

import { apiJson } from '../../../api/apiClient';
import { useBatchEvaluateDataset } from '../api/hooks/useEvaluations';

interface DatasetItem {
  id?: number;
  name?: string;
}

interface DatasetListResp {
  items: DatasetItem[];
}

interface GenericResponse<T> {
  code?: number;
  data?: T;
  message?: string;
}

export default function EvalRunCreate() {
  const navigate = useAppNavigate();
  const [params] = useSearchParams();
  const { message: msg } = AntdApp.useApp();

  const datasetsQ = useQuery({
    queryKey: ['datasets', { page: 1, size: 100 }],
    queryFn: async () => {
      const res = await apiJson<GenericResponse<DatasetListResp>>(
        '/api/v2/datasets?page=1&size=100'
      );
      return res.data?.items ?? [];
    },
  });
  const datasets = datasetsQ.data ?? [];

  const [algorithm, setAlgorithm] = useState('');
  const [algorithmVersion, setAlgorithmVersion] = useState('latest');
  const [datasetName, setDatasetName] = useState(params.get('dataset') ?? '');
  const [datasetVersion, setDatasetVersion] = useState('latest');

  const mutate = useBatchEvaluateDataset();

  const submit = (): void => {
    if (!algorithm) {
      void msg.error('algorithm name required');
      return;
    }
    if (!datasetName) {
      void msg.error('select a dataset');
      return;
    }
    mutate.mutate(
      {
        specs: [
          {
            algorithm: { name: algorithm, version: algorithmVersion },
            dataset: { name: datasetName, version: datasetVersion },
          },
        ],
      },
      {
        onSuccess: () => {
          void msg.success('Evaluation enqueued');
          navigate('eval');
        },
        onError: (e) => void msg.error(e.message),
      }
    );
  };

  return (
    <div className='page-wrapper'>
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
        {datasetsQ.isError ? (
          <EmptyState
            title='Could not load datasets'
            description={
              datasetsQ.error instanceof Error
                ? datasetsQ.error.message
                : 'Unknown error'
            }
          />
        ) : null}
        <FormRow label='Algorithm name'>
          <Input
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value)}
            placeholder='e.g. rca-baseline'
          />
        </FormRow>
        <FormRow label='Algorithm version'>
          <Input
            value={algorithmVersion}
            onChange={(e) => setAlgorithmVersion(e.target.value)}
          />
        </FormRow>
        <FormRow label='Dataset'>
          <Select
            style={{ width: '100%' }}
            value={datasetName || undefined}
            onChange={setDatasetName}
            loading={datasetsQ.isLoading}
            options={datasets.map((d) => ({
              value: d.name ?? '',
              label: d.name ?? `#${String(d.id ?? '')}`,
            }))}
          />
        </FormRow>
        <FormRow label='Dataset version'>
          <Input
            value={datasetVersion}
            onChange={(e) => setDatasetVersion(e.target.value)}
          />
        </FormRow>
      </Panel>
      <Button tone='primary' onClick={submit} disabled={mutate.isPending}>
        {mutate.isPending ? 'Starting…' : 'Start'}
      </Button>
    </div>
  );
}
