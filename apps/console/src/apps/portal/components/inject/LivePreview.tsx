import {
  CodeBlock,
  KeyValueList,
  MonoValue,
  Panel,
  PanelTitle,
} from '@lincyaw/aegis-ui';

import type { GuidedInjectionSpec } from '../../mocks/types';

import { specToYaml } from './paramSchema';

interface Props {
  spec: GuidedInjectionSpec;
}

export function LivePreview({ spec }: Props) {
  return (
    <Panel title={<PanelTitle size='base'>Live preview</PanelTitle>}>
      <KeyValueList
        items={[
          {
            k: 'namespace',
            v:
              spec.namespaceMode === 'specific'
                ? spec.namespace || '—'
                : `<auto:${spec.namespaceMode}>`,
          },
          {
            k: 'system',
            v: <MonoValue size='sm'>{spec.systemCode || '—'}</MonoValue>,
          },
          { k: 'app', v: <MonoValue size='sm'>{spec.app || '—'}</MonoValue> },
          {
            k: 'chaos_type',
            v: <MonoValue size='sm'>{spec.chaosType || '—'}</MonoValue>,
          },
          { k: 'duration', v: `${spec.durationSec}s` },
        ]}
      />
      <div style={{ marginTop: 'var(--space-3)' }}>
        <CodeBlock language='yaml' code={specToYaml(spec) || '# (empty)'} />
      </div>
    </Panel>
  );
}
