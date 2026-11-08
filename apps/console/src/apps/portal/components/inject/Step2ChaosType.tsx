import { useState } from 'react';

import {
  ChoiceCardGroup,
  MetricLabel,
  Panel,
  PanelTitle,
  Tabs,
} from '@lincyaw/aegis-ui';

import {
  CHAOS_BY_NAME,
  CHAOS_TYPES,
  FAMILIES,
  type FaultFamily,
  type GuidedInjectionSpec,
  withChaosType,
} from '../../domain/injectSpec';

interface Props {
  spec: GuidedInjectionSpec;
  update: (patch: Partial<GuidedInjectionSpec>) => void;
}

export function Step2ChaosType({ spec, update }: Props) {
  const [activeFamily, setActiveFamily] = useState<string>(
    CHAOS_BY_NAME[spec.chaosType]?.family ?? 'pod'
  );
  const family: FaultFamily | undefined = FAMILIES.find(
    (f) => f.id === activeFamily
  );

  return (
    <Panel title={<PanelTitle size='base'>2. Chaos type</PanelTitle>}>
      <Tabs
        activeKey={activeFamily}
        onChange={setActiveFamily}
        items={FAMILIES.map((fam) => ({ key: fam.id, label: fam.label }))}
      >
        {family && (
          <div className='page-stack'>
            <MetricLabel>{family.description}</MetricLabel>
            <ChoiceCardGroup
              ariaLabel={`${family.label} faults`}
              value={spec.chaosType}
              onChange={(chaosType) => update(withChaosType(spec, chaosType))}
              options={CHAOS_TYPES.filter((c) => c.family === family.id).map(
                (c) => ({
                  value: c.name,
                  title: c.name,
                  description: c.description,
                  meta: c.blastHint,
                })
              )}
            />
          </div>
        )}
      </Tabs>
    </Panel>
  );
}
