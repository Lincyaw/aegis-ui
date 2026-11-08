import { type ReactNode, useState } from 'react';

import {
  ChoiceCardGroup,
  type ChoiceCardOption,
  ControlListItem,
  MetricLabel,
  SectionDivider,
  StatusDot,
} from '@lincyaw/aegis-ui';

import { GALLERY_ACTIONS } from '../fixtures';
import { GallerySection, Specimen } from '../shared';

function ControlListItemDescriptionSpecimen(): ReactNode {
  const [chart, setChart] = useState('ranking');
  const options = [
    {
      key: 'ranking',
      title: 'Model ranking',
      description: 'One metric per model, sorted, each row opening its model.',
    },
    {
      key: 'pareto',
      title: 'Pareto front',
      description:
        'Two metrics at once; the front marks the models no other beats on both.',
    },
  ];
  return (
    <div className='gallery__list'>
      {options.map((option) => (
        <ControlListItem
          key={option.key}
          active={option.key === chart}
          onClick={() => {
            setChart(option.key);
          }}
          left={option.title}
          description={option.description}
        />
      ))}
    </div>
  );
}

const GALLERY_CHAOS_CHOICES: ChoiceCardOption[] = [
  {
    value: 'PodKill',
    title: 'PodKill',
    description: 'Hard delete the pod.',
    meta: 'pod',
  },
  {
    value: 'NetworkDelay',
    title: 'NetworkDelay',
    description: 'Add egress or ingress latency between services.',
    meta: 'service',
  },
  {
    value: 'NetworkPartition',
    title: 'NetworkPartition',
    description: 'Sever traffic across the namespace.',
    meta: 'namespace',
  },
  {
    value: 'TimeSkew',
    title: 'TimeSkew',
    description: 'Not available on this system.',
    meta: 'pod',
    disabled: true,
  },
];

function ChoiceCardGroupSpecimen(): ReactNode {
  const [chaosType, setChaosType] = useState('NetworkDelay');
  const [plan, setPlan] = useState('');
  return (
    <div className='gallery__row'>
      <Specimen
        caption={`one choice · the chosen card inverts · arrow keys move it · disabled card · value=${chaosType}`}
        span={3}
      >
        <ChoiceCardGroup
          ariaLabel='Chaos type'
          className='gallery__stack--fill'
          options={GALLERY_CHAOS_CHOICES}
          value={chaosType}
          onChange={setChaosType}
        />
      </Specimen>
      <Specimen caption="value='' · nothing chosen yet · title only">
        <ChoiceCardGroup
          ariaLabel='Namespace allocation'
          className='gallery__stack--fill'
          options={[
            { value: 'auto', title: 'Auto-allocate from pool' },
            { value: 'specific', title: 'Specific namespace' },
          ]}
          value={plan}
          onChange={setPlan}
        />
      </Specimen>
    </div>
  );
}

export function ListsRowsSection() {
  const [active, setActive] = useState<string>('item-2');

  return (
    <GallerySection title='Lists & rows'>
      <SectionDivider extra={<MetricLabel>Click any row</MetricLabel>}>
        ControlListItem
      </SectionDivider>
      <div className='gallery__list'>
        {[
          {
            id: 'item-1',
            name: 'Network Partition',
            desc: 'Isolate node clusters',
          },
          { id: 'item-2', name: 'CPU Stress', desc: 'Resource exhaustion' },
          {
            id: 'item-3',
            name: 'Clock Drift',
            desc: 'Synchronicity failure',
          },
          {
            id: 'item-4',
            name: 'Process Killer',
            desc: 'Random PID termination',
          },
        ].map((it) => {
          const isActive = active === it.id;
          return (
            <ControlListItem
              key={it.id}
              active={isActive}
              onClick={() => setActive(isActive ? '' : it.id)}
              left={
                <div>
                  <div className='gallery__list-name'>{it.name}</div>
                  <MetricLabel size='xs' inverted={isActive}>
                    {it.desc}
                  </MetricLabel>
                </div>
              }
              right={
                <MetricLabel inverted={isActive}>
                  {isActive ? 'Stop' : 'Run'}
                </MetricLabel>
              }
            />
          );
        })}
      </div>

      <SectionDivider>Static rows (no onClick)</SectionDivider>
      <div className='gallery__list'>
        <ControlListItem
          action={GALLERY_ACTIONS.controlRun}
          left={
            <>
              <StatusDot pulse />
              <span>worker-alpha</span>
            </>
          }
          right={<MetricLabel>Ready</MetricLabel>}
        />
        <ControlListItem
          left={
            <>
              <StatusDot />
              <span>worker-beta</span>
            </>
          }
          right={<MetricLabel>Idle</MetricLabel>}
        />
        <ControlListItem
          left={
            <>
              <StatusDot tone='caution' pulse />
              <span>worker-gamma</span>
            </>
          }
          right={<MetricLabel>Recovering</MetricLabel>}
        />
      </div>

      <SectionDivider>ControlListItem · description</SectionDivider>
      <ControlListItemDescriptionSpecimen />

      <SectionDivider
        extra={
          <MetricLabel>Radio cards · hover lifts · chosen inverts</MetricLabel>
        }
      >
        ChoiceCardGroup
      </SectionDivider>
      <ChoiceCardGroupSpecimen />
    </GallerySection>
  );
}
