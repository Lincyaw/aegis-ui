import { useState } from 'react';

import {
  CodeBlock,
  MetricLabel,
  Panel,
  PanelTitle,
  Tabs,
} from '@lincyaw/aegis-ui';
import yaml from 'js-yaml';

import {
  type GuidedInjectionSpec,
  submitOptionsFor,
  toSubmitRequest,
} from '../../domain/injectSpec';

interface Props {
  spec: GuidedInjectionSpec;
}

export function Step6Review({ spec }: Props) {
  const [format, setFormat] = useState('yaml');
  const request = toSubmitRequest([spec], submitOptionsFor(spec));
  return (
    <Panel title={<PanelTitle size='base'>6. Review</PanelTitle>}>
      <div className='page-stack'>
        <MetricLabel>The request body that is sent on confirm.</MetricLabel>
        <Tabs
          listOnly
          size='sm'
          activeKey={format}
          onChange={setFormat}
          items={[
            { key: 'yaml', label: 'YAML' },
            { key: 'json', label: 'JSON' },
          ]}
        />
        {format === 'json' ? (
          <CodeBlock language='json' code={JSON.stringify(request, null, 2)} />
        ) : (
          <CodeBlock language='yaml' code={yaml.dump(request)} />
        )}
      </div>
    </Panel>
  );
}
