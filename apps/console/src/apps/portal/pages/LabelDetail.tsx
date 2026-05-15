import { useParams } from 'react-router-dom';

import {
  Chip,
  EmptyState,
  KeyValueList,
  MonoValue,
  PageHeader,
  Panel,
  PanelTitle,
} from '@lincyaw/aegis-ui';

import { useMockStore } from '../mocks';

export default function LabelDetail() {
  const { labelId } = useParams<{ labelId: string }>();
  const label = useMockStore((s) => s.labels.find((l) => l.id === labelId));

  if (!label) {
    return (
      <div className='page-wrapper'>
        <PageHeader title='Label not found' />
        <Panel>
          <EmptyState title='Not found' description='Unknown label.' />
        </Panel>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <PageHeader title={label.name} description='Label details and uses.' />
      <Panel title={<PanelTitle size='base'>Summary</PanelTitle>}>
        <KeyValueList
          items={[
            { k: 'id', v: <MonoValue size='sm'>{label.id}</MonoValue> },
            { k: 'color', v: <Chip tone='ghost'>{label.color}</Chip> },
            { k: 'uses', v: <MonoValue size='sm'>{label.count}</MonoValue> },
          ]}
        />
      </Panel>
    </div>
  );
}
