import { type ReactNode, useState } from 'react';

import {
  ControlListItem,
  MetricLabel,
  Panel,
  PanelTitle,
  SectionDivider,
  StatusDot,
} from '@lincyaw/aegis-ui';

import { GALLERY_ACTIONS } from '../fixtures';

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

export function ListsRowsSection() {
  const [active, setActive] = useState<string>('item-2');

  return (
    <Panel title={<PanelTitle size='lg'>Lists &amp; rows</PanelTitle>}>
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
              <StatusDot tone='warning' pulse />
              <span>worker-gamma</span>
            </>
          }
          right={<MetricLabel>Recovering</MetricLabel>}
        />
      </div>

      <SectionDivider>ControlListItem · description</SectionDivider>
      <ControlListItemDescriptionSpecimen />
    </Panel>
  );
}
