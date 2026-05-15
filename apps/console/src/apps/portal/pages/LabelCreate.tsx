import { App as AntdApp, Select } from 'antd';
import { useState } from 'react';

import {
  Button,
  FormRow,
  PageHeader,
  Panel,
  TextField,
  useAppNavigate,
} from '@lincyaw/aegis-ui';

import { useMockStore } from '../mocks';

const COLORS = ['ink', 'ghost', 'warning'];

export default function LabelCreate() {
  const navigate = useAppNavigate();
  const createLabel = useMockStore((s) => s.createLabel);
  const { message: msg } = AntdApp.useApp();

  const [name, setName] = useState('');
  const [color, setColor] = useState('ghost');

  const submit = (): void => {
    if (!name.trim()) {
      void msg.error('name is required');
      return;
    }
    const created = createLabel({ name, color });
    void msg.success(`Label ${created.name} created`);
    navigate('labels');
  };

  return (
    <div className='page-wrapper'>
      <PageHeader
        title='New label'
        description='Create a custom label for organizing resources.'
        action={
          <Button tone='secondary' onClick={() => navigate('labels')}>
            Cancel
          </Button>
        }
      />
      <Panel>
        <FormRow label='Name'>
          <TextField value={name} onChange={(e) => setName(e.target.value)} />
        </FormRow>
        <FormRow label='Color'>
          <Select
            style={{ width: '100%' }}
            value={color}
            onChange={setColor}
            options={COLORS.map((c) => ({ value: c, label: c }))}
          />
        </FormRow>
      </Panel>
      <Button tone='primary' onClick={submit}>
        Create
      </Button>
    </div>
  );
}
