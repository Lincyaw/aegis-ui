import {
  CodeBlock,
  KeyValueList,
  MonoValue,
  Panel,
  PanelTitle,
} from '@lincyaw/aegis-ui';
import yaml from 'js-yaml';

import {
  type ContainerChoice,
  type GuidedInjectionSpec,
  toGuidedSpec,
} from '../../domain/injectSpec';

interface Props {
  spec: GuidedInjectionSpec;
}

const NAMESPACE_LABEL = {
  auto: 'auto-allocated',
  'auto-bootstrap': 'auto-allocated, bootstrap allowed',
} as const;

function containerText({ name, version }: ContainerChoice): string {
  if (name === '') {
    return '—';
  }
  return version === '' ? `${name} (latest)` : `${name} ${version}`;
}

export function LivePreview({ spec }: Props) {
  return (
    <Panel title={<PanelTitle size='base'>Live preview</PanelTitle>}>
      <div className='page-stack'>
        <KeyValueList
          items={[
            {
              k: 'namespace',
              v:
                spec.namespaceMode === 'specific'
                  ? spec.namespace || '—'
                  : NAMESPACE_LABEL[spec.namespaceMode],
            },
            {
              k: 'system',
              v: <MonoValue size='sm'>{spec.systemCode || '—'}</MonoValue>,
            },
            {
              k: 'app',
              v: <MonoValue size='sm'>{spec.app || '—'}</MonoValue>,
            },
            {
              k: 'chaos_type',
              v: <MonoValue size='sm'>{spec.chaosType || '—'}</MonoValue>,
            },
            {
              k: 'pedestal',
              v: (
                <MonoValue size='sm'>{containerText(spec.pedestal)}</MonoValue>
              ),
            },
            {
              k: 'benchmark',
              v: (
                <MonoValue size='sm'>{containerText(spec.benchmark)}</MonoValue>
              ),
            },
          ]}
        />
        <CodeBlock language='yaml' code={yaml.dump(toGuidedSpec(spec))} />
      </div>
    </Panel>
  );
}
