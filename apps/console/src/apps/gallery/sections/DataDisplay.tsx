import { type ReactNode, useState } from 'react';

import { InboxOutlined } from '@ant-design/icons';
import {
  Button as AegisButton,
  Chip,
  EmptyState,
  type KeyValueItem,
  KeyValueList,
  MetricCard,
  Panel,
  PanelTitle,
  SectionDivider,
  Skeleton,
  SkeletonText,
  SparkLine,
  StatBlock,
  TimeDisplay,
  TimeRangePicker,
  type TimeRangePickerProps,
} from '@lincyaw/aegis-ui';

import { KV_PARAMS } from '../fixtures';
import { Specimen } from '../shared';

const SPARK_RISING = [
  42, 41, 44, 43, 47, 50, 49, 52, 55, 58, 62, 60, 64, 68, 71, 73,
];

const SPARK_DIP = [
  80, 78, 79, 81, 77, 70, 62, 51, 43, 38, 35, 41, 50, 58, 64, 67,
];

const SPARK_FLAT = [
  50, 51, 49, 52, 50, 51, 49, 50, 51, 50, 49, 51, 50, 50, 51, 49,
];

const KV_META: KeyValueItem[] = [
  { k: 'Run ID', v: 'EXP-29F1-ALPHA' },
  { k: 'Duration', v: '00:14:22' },
  { k: 'Cluster', v: 'EU-WEST-01' },
  { k: 'Operator', v: 'rosetta@aegis' },
];

interface TimeRangePickerSpecimenProps {
  initial: string;
  presets?: TimeRangePickerProps['presets'];
  logToConsole?: boolean;
}

function TimeRangePickerSpecimen({
  initial,
  presets,
  logToConsole = false,
}: TimeRangePickerSpecimenProps) {
  const [value, setValue] = useState(initial);
  return (
    <TimeRangePicker
      value={value}
      presets={presets}
      onChange={(next) => {
        setValue(next);
        if (logToConsole) {
          console.warn('TimeRangePicker change:', next);
        }
      }}
    />
  );
}

/* ── Commands gallery specimen ─────────────────────────────────────── */

function StatBlockCountUpSpecimen(): ReactNode {
  const [mount, setMount] = useState(0);
  return (
    <div className='gallery__stack'>
      <StatBlock
        key={mount}
        label='Runs'
        value={128}
        direction='vertical'
        emphasized
        animateValue
      />
      <AegisButton
        tone='ghost'
        onClick={() => {
          setMount((m) => m + 1);
        }}
      >
        Replay
      </AegisButton>
    </div>
  );
}

export function DataDisplaySection() {
  return (
    <Panel title={<PanelTitle size='lg'>Data display</PanelTitle>}>
      <SectionDivider>StatBlock</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='vertical · emphasized · number role'>
          <StatBlock
            label='运行次数'
            value={40}
            direction='vertical'
            emphasized
          />
        </Specimen>
        <Specimen caption='vertical · numeric role'>
          <StatBlock label='运行次数' value={40} direction='vertical' />
        </Specimen>
        <Specimen caption='horizontal · label left'>
          <StatBlock
            label='latency_p99'
            value='142'
            unit='ms'
            surface={{
              id: 'gallery.stat.latency-p99',
              kind: 'metric',
              label: 'latency_p99',
              askSuggestions: ['Is this latency normal?'],
              project: (data) => ({
                fields: [
                  {
                    name: 'metric',
                    type: 'string',
                    value: String(data.label),
                  },
                  {
                    name: 'value',
                    type: 'string',
                    value: String(data.value),
                  },
                  {
                    name: 'unit',
                    type: 'string',
                    value: String(data.unit ?? ''),
                  },
                ],
              }),
            }}
          />
        </Specimen>
        <Specimen caption='vertical · emphasized · unit'>
          <StatBlock
            label='error_rate'
            value='0.42'
            unit='%'
            direction='vertical'
            emphasized
          />
        </Specimen>
        <Specimen caption='inverted'>
          <div className='gallery__inverted-host'>
            <StatBlock label='Throughput' value='9 384' unit='rps' inverted />
          </div>
        </Specimen>
        <Specimen caption='animateValue · counts up once over --motion-chart'>
          <StatBlockCountUpSpecimen />
        </Specimen>
        <Specimen caption='animateValue · keeps decimals'>
          <StatBlock
            label='Mean score'
            value={0.83}
            direction='vertical'
            emphasized
            animateValue
          />
        </Specimen>
      </div>

      <SectionDivider>KeyValueList</SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='mono keys (parameters)' span={2}>
          <KeyValueList
            items={KV_PARAMS}
            surface={{
              id: 'gallery.kv.params',
              kind: 'detail',
              label: 'Experiment parameters',
              askSuggestions: ['What do these parameters mean?'],
              project: (items) => ({
                fields: items.map((it) => ({
                  name: String(it.k),
                  type: 'string',
                  value: String(it.v),
                })),
              }),
            }}
          />
        </Specimen>
        <Specimen caption='uppercase keys (metadata)' span={2}>
          <KeyValueList items={KV_META} uppercaseKeys />
        </Specimen>
      </div>

      <SectionDivider>SparkLine</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='rising'>
          <div className='gallery__spark-host'>
            <SparkLine
              points={SPARK_RISING}
              surface={{
                id: 'gallery.spark.rising',
                kind: 'chart',
                label: 'Sparkline · rising',
                askSuggestions: ['What does this trend indicate?'],
                project: (points) => ({
                  fields: [
                    { name: 'count', type: 'number', value: points.length },
                    {
                      name: 'last',
                      type: 'number',
                      value: points[points.length - 1] ?? 0,
                    },
                  ],
                }),
              }}
            />
          </div>
        </Specimen>
        <Specimen caption='dip / recover'>
          <div className='gallery__spark-host'>
            <SparkLine points={SPARK_DIP} />
          </div>
        </Specimen>
        <Specimen caption='flat (low signal)'>
          <div className='gallery__spark-host'>
            <SparkLine points={SPARK_FLAT} />
          </div>
        </Specimen>
        <Specimen caption='inverted'>
          <div className='gallery__spark-host gallery__spark-host--inverted'>
            <SparkLine points={SPARK_RISING} inverted />
          </div>
        </Specimen>
      </div>

      <SectionDivider>MetricCard</SectionDivider>
      <div className='gallery__row gallery__row--wide'>
        <Specimen caption='value only'>
          <MetricCard label='Active injections' value='3' />
        </Specimen>
        <Specimen caption='value + unit'>
          <MetricCard label='Latency p99' value='142' unit='ms' />
        </Specimen>
        <Specimen caption='value + sparkline'>
          <MetricCard
            label='Throughput'
            value='9 384'
            unit='rps'
            sparkline={SPARK_RISING}
            surface={{
              id: 'gallery.metric.throughput',
              kind: 'metric',
              label: 'Throughput metric card',
              askSuggestions: ['Is throughput trending up?'],
              project: (data) => ({
                fields: [
                  {
                    name: 'metric',
                    type: 'string',
                    value: String(data.label),
                  },
                  {
                    name: 'value',
                    type: 'string',
                    value: String(data.value),
                  },
                  {
                    name: 'unit',
                    type: 'string',
                    value: String(data.unit ?? ''),
                  },
                ],
              }),
            }}
          />
        </Specimen>
        <Specimen caption='inverted + sparkline'>
          <MetricCard
            label='Error budget'
            value='0.42'
            unit='%'
            sparkline={SPARK_DIP}
            inverted
          />
        </Specimen>
      </div>

      <SectionDivider>EmptyState</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='default'>
          <EmptyState
            title='No injections'
            description='Create your first fault injection to begin.'
          />
        </Specimen>
        <Specimen caption='with action'>
          <EmptyState
            title='No projects'
            description='Projects group experiments and their results.'
            action={<Chip tone='ink'>+ New project</Chip>}
          />
        </Specimen>
        <Specimen caption='icon at --size-icon-xl'>
          <EmptyState
            icon={<InboxOutlined className='gallery__icon-xl' />}
            title='Pick an x-axis metric'
            description='The chart needs two metrics to compare.'
          />
        </Specimen>
      </div>

      <SectionDivider>Skeleton</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='block bars'>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              width: 240,
            }}
          >
            <Skeleton block height={24} />
            <Skeleton block height={16} />
            <Skeleton block height={16} style={{ width: '60%' }} />
          </div>
        </Specimen>
        <Specimen caption='circle + text'>
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              alignItems: 'center',
              width: 240,
            }}
          >
            <Skeleton width={32} height={32} radius='circle' />
            <div style={{ flex: 1 }}>
              <SkeletonText lines={2} />
            </div>
          </div>
        </Specimen>
        <Specimen caption='SkeletonText 4 lines'>
          <div style={{ width: 240 }}>
            <SkeletonText lines={4} />
          </div>
        </Specimen>
      </div>

      <SectionDivider>TimeDisplay</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='absolute'>
          <TimeDisplay value='2026-05-10T14:22:01Z' mode='absolute' />
        </Specimen>
        <Specimen caption='relative'>
          <TimeDisplay value={Date.now() - 120000} mode='relative' />
        </Specimen>
        <Specimen caption='duration'>
          <TimeDisplay value={2840} mode='duration' />
        </Specimen>
      </div>

      <SectionDivider>TimeRangePicker</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='default · now-1h'>
          <TimeRangePickerSpecimen initial='now-1h' />
        </Specimen>
        <Specimen caption='custom presets incl. 30d'>
          <TimeRangePickerSpecimen
            initial='now-30d'
            presets={[
              { label: '1h', value: 'now-1h' },
              { label: '24h', value: 'now-24h' },
              { label: '7d', value: 'now-7d' },
              { label: '30d', value: 'now-30d' },
            ]}
          />
        </Specimen>
        <Specimen caption='controlled · logs to console'>
          <TimeRangePickerSpecimen initial='now-15m' logToConsole />
        </Specimen>
      </div>
    </Panel>
  );
}
