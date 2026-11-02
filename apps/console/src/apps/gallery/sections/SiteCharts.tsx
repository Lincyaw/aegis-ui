import { type ReactNode, useState } from 'react';

import {
  type ChartColor,
  ChartLegend,
  ColumnChart,
  type ColumnChartItem,
  DotRangeChart,
  HeadlineStat,
  Heatmap,
  type HeatmapRow,
  LineChart,
  type LineChartPoint,
  MetricLabel,
  Panel,
  PanelTitle,
  ParetoChart,
  type ParetoPoint,
  RankBar,
  ResultMatrix,
  ScrollStory,
  SectionDivider,
  SeriesLabel,
  StackedBar,
  useScrollProgress,
} from '@lincyaw/aegis-ui';

import { GalleryRouterLink, Specimen } from '../shared';

const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;

interface GalleryEntrant {
  key: string;
  name: string;
  harness: string;
  color: ChartColor;
  pass: number;
  interval: [number, number];
  cost: number;
}

/* Illustrative figures for the specimens. */
const ENTRANTS: GalleryEntrant[] = [
  {
    key: 'sol',
    name: 'GPT-6.1 Sol',
    harness: 'Codex CLI',
    color: 'var(--series-openai)',
    pass: 0.976,
    interval: [0.91, 1],
    cost: 1.1,
  },
  {
    key: 'opus',
    name: 'Claude Opus 5.5',
    harness: 'Claude Code',
    color: 'var(--series-anthropic)',
    pass: 0.884,
    interval: [0.79, 0.97],
    cost: 2.4,
  },
  {
    key: 'carbon',
    name: 'Gemini 4 Carbon',
    harness: 'Antigravity',
    color: 'var(--series-google)',
    pass: 0.81,
    interval: [0.7, 0.91],
    cost: 1.8,
  },
  {
    key: 'kimi',
    name: 'Kimi K3.1 Pro',
    harness: 'Kimi Code',
    color: 'var(--series-moonshot)',
    pass: 0.545,
    interval: [0.42, 0.67],
    cost: 0.65,
  },
  {
    key: 'flash',
    name: 'DeepSeek V4.1 Flash',
    harness: 'DeepSeek Harness',
    color: 'var(--series-deepseek)',
    pass: 0.222,
    interval: [0.13, 0.32],
    cost: 0.12,
  },
  {
    key: 'glm',
    name: 'GLM 5.3 Flash',
    harness: 'ZCode',
    color: 'var(--series-zhipu)',
    pass: 0,
    interval: [0, 0.06],
    cost: 0.2,
  },
];

const VENDORS: Array<{ name: string; color: ChartColor }> = [
  { name: 'anthropic', color: 'var(--series-anthropic)' },
  { name: 'openai', color: 'var(--series-openai)' },
  { name: 'google', color: 'var(--series-google)' },
  { name: 'deepseek', color: 'var(--series-deepseek)' },
  { name: 'zhipu', color: 'var(--series-zhipu)' },
  { name: 'moonshot', color: 'var(--series-moonshot)' },
  { name: 'qwen', color: 'var(--series-qwen)' },
  { name: 'other', color: 'var(--series-other)' },
];

interface DumbbellRow {
  name: string;
  color: ChartColor;
  from: number;
  to: number;
}

const HARNESS_ROWS: DumbbellRow[] = [
  {
    name: 'GPT-6.1 Sol',
    color: 'var(--series-openai)',
    from: 0.793,
    to: 0.976,
  },
  {
    name: 'Gemini 4 Carbon',
    color: 'var(--series-google)',
    from: 0.502,
    to: 0.81,
  },
  {
    name: 'DeepSeek V4.1 Flash',
    color: 'var(--series-deepseek)',
    from: 0.259,
    to: 0.222,
  },
];

interface EloRow {
  name: string;
  color: ChartColor;
  elo: number;
  spread: number;
}

const ELO_ROWS: EloRow[] = [
  {
    name: 'Gemini 4 Carbon',
    color: 'var(--series-google)',
    elo: 1412,
    spread: 34,
  },
  {
    name: 'Claude Opus 5.5',
    color: 'var(--series-anthropic)',
    elo: 1395,
    spread: 32,
  },
  {
    name: 'Kimi K3.1 Pro',
    color: 'var(--series-moonshot)',
    elo: 1251,
    spread: 40,
  },
  {
    name: 'GLM 5.3 Flash',
    color: 'var(--series-zhipu)',
    elo: 1104,
    spread: 46,
  },
];

const ELO_ITEMS = ELO_ROWS.map((row) => ({
  key: row.name,
  label: <SeriesLabel name={row.name} color={row.color} />,
  range: [row.elo - row.spread, row.elo + row.spread] as [number, number],
  dots: [{ value: row.elo }],
  color: row.color,
  value: row.elo.toLocaleString('en-US'),
}));

const COLUMN_ITEMS: ColumnChartItem[] = ENTRANTS.map((entrant) => ({
  key: entrant.key,
  label: entrant.name,
  detail: entrant.harness,
  value: entrant.pass,
  interval: entrant.interval,
  color: entrant.color,
}));

const COST_POINTS: ParetoPoint[] = ENTRANTS.map((entrant) => ({
  key: entrant.key,
  label: entrant.name,
  x: entrant.cost,
  y: entrant.pass,
  color: entrant.color,
}));

const HEATMAP_ROWS: HeatmapRow[] = ENTRANTS.slice(0, 5).map((entrant, i) => ({
  key: entrant.key,
  label: (
    <SeriesLabel
      name={entrant.name}
      detail={entrant.harness}
      color={entrant.color}
    />
  ),
  cells: [
    { text: percent(entrant.pass), level: entrant.pass, emphasis: i === 0 },
    i === 2
      ? { text: 'Too few samples', level: null }
      : {
          text: (0.82 - i * 0.06).toFixed(2),
          level: 1 - i * 0.2,
          emphasis: i === 1,
        },
    {
      text: `$${entrant.cost.toFixed(2)}`,
      level: 1 - entrant.cost / 2.4,
      to: `#run-${entrant.key}`,
    },
  ],
}));

const MATRIX_ROWS = Array.from({ length: 6 }, (_, row) =>
  Array.from({ length: 12 }, (_, cell) => {
    const seed = (row * 7 + cell * 3) % 5;
    return [0.1, 0.22, 0.55, 1, 0.55][seed];
  })
);

const PASS_ROWS = Array.from({ length: 11 }, (_, row) =>
  Array.from({ length: 5 }, (_, cell) => ((row + cell) % 4 === 0 ? 0 : 1))
);

const FAILURE_SERIES = [
  { key: 'budget', label: 'Out of steps', color: 'cat-6' },
  { key: 'unproven', label: 'Fixed, not proven', color: 'cat-1' },
  { key: 'incomplete', label: 'Incomplete result', color: 'cat-3' },
] as const;

function scoreLine(rate: number, turns = 80): LineChartPoint[] {
  return Array.from({ length: turns }, (_, turn) => ({
    x: turn + 1,
    y: Math.round(
      turn * rate + (turn > 30 ? (turn - 30) * rate * 0.6 : 0) + (turn % 7)
    ),
  }));
}

const SCORE_LINES = [
  {
    key: 'opus',
    label: 'Claude Opus 5.5',
    color: 'var(--series-anthropic)',
    points: scoreLine(1.45),
  },
  {
    key: 'sol',
    label: 'GPT-6.1 Sol',
    color: 'var(--series-openai)',
    points: scoreLine(0.75),
  },
] as const;

function DrawnChartsSpecimen(): ReactNode {
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const { ref, progress } = useScrollProgress<HTMLDivElement>({
    range: 'entry',
    scrollContainer: scroller,
  });
  return (
    <div className='gallery__row'>
      <Specimen
        caption={`each chart follows the scroll both ways · progress ${progress.toFixed(2)}`}
        span={3}
      >
        <div ref={setScroller} className='gallery__chart-scroller'>
          <p className='gallery__chart-scroller-spacer'>
            Scroll down: the columns grow in turn, then their values and
            intervals; the matrix fills by row and the heatmap by column.
          </p>
          <div ref={ref} className='gallery__stack gallery__stack--fill'>
            <ColumnChart
              label='Pass rate'
              items={COLUMN_ITEMS}
              max={1}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              format={percent}
              formatTick={(value) => `${(value * 100).toFixed(0)}%`}
              progress={progress}
            />
            <Heatmap
              label='Results by model'
              corner='Model × harness'
              columns={[
                { key: 'pass', label: 'Pass rate' },
                { key: 'claim', label: 'Claim credibility' },
                { key: 'cost', label: 'Mean cost', color: 'cat-1' },
              ]}
              rows={HEATMAP_ROWS}
              progress={progress}
            />
            <ResultMatrix
              label='Runs per task'
              rows={PASS_ROWS}
              shape='bar'
              color='var(--series-openai)'
              progress={progress}
            />
            <DotRangeChart
              label='Elo with its 95% interval'
              domain={[1000, 1500]}
              motion='slide'
              progress={progress}
              items={ELO_ITEMS.slice(0, 2)}
            />
            <LineChart
              label='Cumulative score'
              series={[...SCORE_LINES]}
              formatX={(value) => `T${String(value)}`}
              progress={progress}
            />
          </div>
          <div className='gallery__chart-scroller-spacer' />
        </div>
      </Specimen>
    </div>
  );
}

function LineChartSpecimen(): ReactNode {
  const [turn, setTurn] = useState(42);
  return (
    <div className='gallery__row'>
      <Specimen
        caption={`end labels instead of a legend · markers on the axis · click or arrow keys move the playhead · T${String(turn)}`}
        span={3}
      >
        <LineChart
          label='Cumulative score'
          xLabel='Turn'
          series={[...SCORE_LINES]}
          yTicks={[0, 50, 100, 150, 200]}
          formatX={(value) => `T${String(value)}`}
          playhead={turn}
          onSeek={setTurn}
          markers={[
            {
              key: 't23',
              x: 23,
              color: 'var(--replay-setback)',
              label: 'T23 · setback',
            },
            {
              key: 't31',
              x: 31,
              color: 'var(--replay-milestone)',
              label: 'T31 · key decision',
            },
            {
              key: 't35',
              x: 35,
              color: 'var(--replay-error)',
              label: 'T35 · illegal move',
            },
          ]}
        />
      </Specimen>
    </div>
  );
}

const COST_STORY_HIGHLIGHT = ['sol', 'opus'];

function CostStorySpecimen(): ReactNode {
  const [step, setStep] = useState(0);
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const costChart = (
    <ParetoChart
      points={COST_POINTS}
      xLabel='Mean cost per task (US$, log)'
      yLabel='Pass rate'
      xScale='log'
      xDomain={[0.1, 3]}
      yDomain={[0, 1]}
      xTicks={[0.1, 0.2, 0.5, 1, 2]}
      yTicks={[0, 0.25, 0.5, 0.75, 1]}
      formatX={(value) => `$${String(value)}`}
      formatY={(value) => `${(value * 100).toFixed(0)}%`}
      labels='all'
      fadeDominated={false}
      frontProgress={step >= 1 ? 1 : 0}
      highlightKeys={step >= 2 ? COST_STORY_HIGHLIGHT : undefined}
    />
  );
  return (
    <div className='gallery__row'>
      <Specimen
        caption={`ScrollStory drives the chart: points, then the frontier, then two points picked out · step ${String(step + 1)}`}
        span={3}
      >
        <div ref={setScroller} className='gallery__story-scroller'>
          <ScrollStory
            scrollContainer={scroller}
            onCurrentChange={setStep}
            steps={[
              {
                id: 'points',
                title: 'Every combination lands on the plot',
                body: 'Cost on a log axis, pass rate up the side.',
                visual: costChart,
              },
              {
                id: 'front',
                title: 'The frontier is traced',
                body: 'Combinations nothing beats on both axes.',
                visual: costChart,
              },
              {
                id: 'pick',
                title: 'Two points are picked out',
                body: 'The finding in the section title.',
                visual: costChart,
              },
            ]}
          />
        </div>
      </Specimen>
    </div>
  );
}

export function SiteChartsSection() {
  const [segment, setSegment] = useState('none');
  return (
    <Panel
      title={<PanelTitle size='lg'>Site charts</PanelTitle>}
      extra={<MetricLabel>Findings on the public site</MetricLabel>}
    >
      <SectionDivider>SeriesLabel</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='the series tokens, one hue per vendor' span={2}>
          <div className='gallery__stack'>
            {VENDORS.map((vendor) => (
              <SeriesLabel
                key={vendor.name}
                name={vendor.name}
                color={vendor.color}
              />
            ))}
          </div>
        </Specimen>
        <Specimen caption='detail · a link · truncates in a narrow slot'>
          <div className='gallery__stack gallery__stack--fill'>
            <SeriesLabel
              name='GPT-6.1 Sol'
              detail='Codex CLI'
              color='var(--series-openai)'
              to='#model'
              linkComponent={GalleryRouterLink}
            />
            <div className='gallery__series-narrow'>
              <SeriesLabel
                name='DeepSeek V4.1 Flash, with a long name'
                detail='Harness'
                color='var(--series-deepseek)'
              />
            </div>
          </div>
        </Specimen>
      </div>

      <SectionDivider>HeadlineStat</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='the figure behind a finding' span={3}>
          <div className='gallery__headline-row'>
            <HeadlineStat
              value='97.6%'
              caption='GPT-6.1 Sol 的通过率，47 次运行中 46 次通过'
            />
            <HeadlineStat
              value='46 / 47'
              caption='次运行通过全部检查，唯一失败来自 replica 超时'
            />
            <HeadlineStat value='$1.10' caption='每题平均花费' />
          </div>
        </Specimen>
      </div>

      <SectionDivider>ResultMatrix</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption="shape='square' · strength by opacity · the tile's pattern">
          <div className='gallery__stack gallery__stack--fill'>
            <ResultMatrix
              label='Runs per task on one benchmark'
              rows={MATRIX_ROWS}
              color='cat-1'
            />
          </div>
        </Specimen>
        <Specimen caption="shape='bar' · 11 tasks × 5 runs · a failed run is an empty cell">
          <div className='gallery__stack gallery__stack--fill'>
            <ResultMatrix
              label='41 of 55 runs passed'
              rows={PASS_ROWS}
              shape='bar'
              color='var(--series-anthropic)'
            />
          </div>
        </Specimen>
      </div>

      <SectionDivider>Heatmap</SectionDivider>
      <div className='gallery__row'>
        <Specimen
          caption='tint by level within a column · a column of its own colour · null is unfilled with its reason · linked cells rise · folds into a labelled grid on a phone'
          span={3}
        >
          <Heatmap
            label='Results by model'
            corner='Model × harness'
            columns={[
              { key: 'pass', label: 'Pass rate', detail: 'CGFS' },
              { key: 'claim', label: 'Claim credibility', detail: 'SWE-chat' },
              {
                key: 'cost',
                label: 'Mean cost',
                detail: 'Per task',
                color: 'cat-1',
              },
            ]}
            rows={HEATMAP_ROWS}
            linkComponent={GalleryRouterLink}
          />
        </Specimen>
      </div>

      <SectionDivider>ColumnChart</SectionDivider>
      <div className='gallery__row'>
        <Specimen
          caption='a vendor colour per column · interval through the column · 0 keeps an endpoint · a RankBar at 768px and below'
          span={3}
        >
          <ColumnChart
            label='Pass rate'
            items={[
              ...COLUMN_ITEMS,
              {
                key: 'none',
                label: 'Not run',
                detail: 'No counted runs',
                value: null,
              },
            ]}
            max={1}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
            format={percent}
            formatTick={(value) => `${(value * 100).toFixed(0)}%`}
          />
        </Specimen>
      </div>

      <SectionDivider>DotRangeChart</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption="motion='extend' · hollow baseline to solid · a before and after, either direction">
          <div className='gallery__stack gallery__stack--fill'>
            <DotRangeChart
              label='Pass rate by harness'
              domain={[0, 1]}
              items={HARNESS_ROWS.map((row) => ({
                key: row.name,
                label: <SeriesLabel name={row.name} color={row.color} />,
                range: [row.from, row.to] as [number, number],
                dots: [{ value: row.from, hollow: true }, { value: row.to }],
                color: row.color,
                value: `${row.to >= row.from ? '+' : '−'}${(Math.abs(row.to - row.from) * 100).toFixed(1)}`,
              }))}
            />
            <ChartLegend
              shape='dot'
              items={[
                {
                  key: 'generic',
                  label: 'OpenHands (generic)',
                  color: 'var(--text-main)',
                  hollow: true,
                },
                {
                  key: 'own',
                  label: 'Vendor harness',
                  color: 'var(--text-main)',
                },
              ]}
            />
          </div>
        </Specimen>
        <Specimen caption="motion='slide' · a reading with its interval">
          <div className='gallery__stack gallery__stack--fill'>
            <DotRangeChart
              label='Elo with its 95% interval'
              domain={[1000, 1500]}
              motion='slide'
              items={ELO_ITEMS}
            />
          </div>
        </Specimen>
      </div>

      <SectionDivider>LineChart</SectionDivider>
      <LineChartSpecimen />

      <SectionDivider extra={<MetricLabel>knobs of older charts</MetricLabel>}>
        RankBar interval · StackedBar normalize · ParetoChart log axis
      </SectionDivider>
      <div className='gallery__row'>
        <Specimen caption="size='sm' · interval through the bar">
          <div className='gallery__stack gallery__stack--fill'>
            <RankBar
              size='sm'
              max={0.3}
              format={percent}
              items={[
                {
                  key: 'quit',
                  label: 'User stopped early',
                  value: 0.211,
                  interval: [0.19, 0.232],
                  color: 'cat-3',
                },
                {
                  key: 'conflict',
                  label: 'Claim contradicts evidence',
                  value: 0.084,
                  interval: [0.07, 0.1],
                  color: 'cat-3',
                },
              ]}
            />
          </div>
        </Specimen>
        <Specimen
          caption={`normalize · each row its own composition · segments are buttons · last: ${segment}`}
        >
          <div className='gallery__stack gallery__stack--fill'>
            <StackedBar
              normalize
              series={[...FAILURE_SERIES]}
              labelHeader='Model'
              totalHeader='Failures'
              format={String}
              onSegmentSelect={(row, series) => {
                setSegment(`${row} · ${series}`);
              }}
              rows={[
                {
                  key: 'opus',
                  label: 'Claude Opus 5.5',
                  values: { budget: 6, unproven: 0, incomplete: 0 },
                  note: 'failures',
                },
                {
                  key: 'kimi',
                  label: 'Kimi K3.1 Pro',
                  values: { budget: 3, unproven: 10, incomplete: 12 },
                  note: 'failures',
                },
              ]}
            />
          </div>
        </Specimen>
      </div>
      <div className='gallery__row'>
        <Specimen
          caption="xScale='log' · explicit ticks and domains · labels='all' names every point, so no legend · frontier fades nothing"
          span={3}
        >
          <ParetoChart
            points={COST_POINTS}
            xLabel='Mean cost per task (US$, log)'
            yLabel='Pass rate'
            xScale='log'
            xDomain={[0.1, 3]}
            yDomain={[0, 1]}
            xTicks={[0.1, 0.2, 0.5, 1, 2]}
            yTicks={[0, 0.25, 0.5, 0.75, 1]}
            formatX={(value) => `$${String(value)}`}
            formatY={(value) => `${(value * 100).toFixed(0)}%`}
            labels='all'
            fadeDominated={false}
            maxHeight={420}
          />
        </Specimen>
      </div>

      <SectionDivider>Charts in a scrolling story</SectionDivider>
      <CostStorySpecimen />

      <SectionDivider>Charts drawn by scroll</SectionDivider>
      <DrawnChartsSpecimen />
    </Panel>
  );
}
