import { useState } from 'react';

import {
  Alert,
  CodeBlock,
  MetricLabel,
  Panel,
  PanelTitle,
  Tabs,
} from '@lincyaw/aegis-ui';
import yaml from 'js-yaml';

import {
  type GuidedInjectionSpec,
  requestOptionsFor,
  toSubmitRequest,
} from '../../domain/injectSpec';

import type { SubmitMode } from './Step5Stage';

interface Props {
  spec: GuidedInjectionSpec;
  mode: SubmitMode;
  /** Drafts already staged, in order. */
  staged: GuidedInjectionSpec[];
  conflict: string | undefined;
}

export function Step6Review({ spec, mode, staged, conflict }: Props) {
  const [format, setFormat] = useState('yaml');

  if (mode === 'stage' && conflict !== undefined) {
    return (
      <Panel title={<PanelTitle size='base'>6. Review</PanelTitle>}>
        <Alert tone='warning'>{conflict}</Alert>
      </Panel>
    );
  }

  const batch = mode === 'stage' ? [...staged, spec] : [spec];
  const request = toSubmitRequest(batch, requestOptionsFor(batch[0] ?? spec));
  const caption =
    mode === 'stage'
      ? `Add to batch sends nothing. Submit batch then sends this request, with this draft as number ${String(batch.length)}.`
      : 'Inject now sends this request.';

  return (
    <Panel title={<PanelTitle size='base'>6. Review</PanelTitle>}>
      <div className='page-stack'>
        <MetricLabel>{caption}</MetricLabel>
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
