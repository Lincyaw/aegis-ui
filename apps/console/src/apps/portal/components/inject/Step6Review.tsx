import { Radio } from 'antd';
import { useState } from 'react';

import { CodeBlock, MetricLabel, Panel, PanelTitle } from '@lincyaw/aegis-ui';

import type { GuidedInjectionSpec } from '../../mocks/types';
import { specToYaml } from './paramSchema';

interface Props {
  spec: GuidedInjectionSpec;
}

export function Step6Review({ spec }: Props) {
  const [format, setFormat] = useState<'json' | 'yaml'>('json');
  return (
    <Panel title={<PanelTitle size='base'>6. Review</PanelTitle>}>
      <MetricLabel>
        Resolved session config — equivalent to ~/.aegisctl/inject-guided/session.yaml.
      </MetricLabel>
      <Radio.Group
        value={format}
        onChange={(e) => setFormat(e.target.value as 'json' | 'yaml')}
        style={{ margin: 'var(--space-3) 0' }}
      >
        <Radio value='json'>JSON</Radio>
        <Radio value='yaml'>YAML</Radio>
      </Radio.Group>
      {format === 'json' ? (
        <CodeBlock language='json' code={JSON.stringify(spec, null, 2)} />
      ) : (
        <CodeBlock language='yaml' code={specToYaml(spec)} />
      )}
    </Panel>
  );
}
