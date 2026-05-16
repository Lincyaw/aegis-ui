import { useState } from 'react';

import {
  Chip,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
} from '@lincyaw/aegis-ui';
import { Tabs } from 'antd';

import type { GuidedInjectionSpec } from '../../mocks/types';

import { CHAOS_BY_NAME, CHAOS_TYPES, FAMILIES } from './paramSchema';

interface Props {
  spec: GuidedInjectionSpec;
  update: (patch: Partial<GuidedInjectionSpec>) => void;
}

export function Step2ChaosType({ spec, update }: Props) {
  const firstFamily = FAMILIES[0]?.id ?? 'pod';
  const initialFamily = spec.chaosType
    ? (CHAOS_BY_NAME[spec.chaosType]?.family ?? firstFamily)
    : firstFamily;
  const [activeFamily, setActiveFamily] = useState<string>(initialFamily);

  return (
    <Panel title={<PanelTitle size='base'>2. Chaos type</PanelTitle>}>
      <Tabs
        activeKey={activeFamily}
        onChange={setActiveFamily}
        items={FAMILIES.map((fam) => ({
          key: fam.id,
          label: fam.label,
          children: (
            <div>
              <MetricLabel>{fam.description}</MetricLabel>
              <div className='wizard-contract-grid'>
                {CHAOS_TYPES.filter((c) => c.family === fam.id).map((c) => (
                  <button
                    key={c.name}
                    type='button'
                    className='wizard-card'
                    data-active={spec.chaosType === c.name}
                    onClick={() => update({ chaosType: c.name })}
                  >
                    <div className='wizard-card__head'>
                      <MonoValue size='sm'>{c.name}</MonoValue>
                      <Chip tone='ghost'>{c.blastHint}</Chip>
                    </div>
                    <div className='wizard-card__desc'>{c.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ),
        }))}
      />
    </Panel>
  );
}
