import { useParams } from 'react-router-dom';

import {
  EmptyState,
  KeyValueList,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
  TimeDisplay,
} from '@lincyaw/aegis-ui';

import { useMockStore } from '../mocks';

export default function ContainerDetail() {
  const { containerId } = useParams<{ containerId: string }>();
  const container = useMockStore((s) =>
    s.containers.find((c) => c.id === containerId),
  );

  if (!container) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Container not found' />
        <Panel>
          <EmptyState title='Not found' description='Unknown container.' />
        </Panel>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <PageHeader title={container.name} description={container.algorithm} />
      <Panel title={<PanelTitle size='base'>Summary</PanelTitle>}>
        <KeyValueList
          items={[
            { k: 'id', v: <MonoValue size='sm'>{container.id}</MonoValue> },
            { k: 'image', v: <MonoValue size='sm'>{container.image}</MonoValue> },
            { k: 'algorithm', v: container.algorithm },
            { k: 'created', v: <TimeDisplay value={container.createdAt} /> },
          ]}
        />
      </Panel>
    </div>
  );
}
