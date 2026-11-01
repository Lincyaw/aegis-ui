import { type ReactNode, useState } from 'react';

import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DotChartOutlined,
} from '@ant-design/icons';
import {
  Button as AegisButton,
  Select as AegisSelect,
  Alert,
  BlastRadiusBar,
  ChartLegend,
  Checkbox,
  CheckGrid,
  type CheckGridCell,
  type CheckGridColumn,
  type CheckGridRow,
  Chip,
  Collapse,
  DataTable,
  Dialog,
  EmptyState,
  KeyValueList,
  MetricLabel,
  Pagination,
  Panel,
  PanelTitle,
  ParetoChart,
  type ParetoPoint,
  PickerField,
  RankBar,
  RunPips,
  ScoreBar,
  SectionDivider,
  StackedBar,
  type StackedBarRow,
  type StackedBarSeries,
  StatusDot,
  TextField,
  useScrollProgress,
} from '@lincyaw/aegis-ui';

import {
  GALLERY_CHECK_ROWS,
  GALLERY_CHECK_RUNS,
  GALLERY_MODEL_COLUMNS,
  GALLERY_MODEL_ROWS,
} from '../fixtures';
import { Specimen } from '../shared';

/* ── Chip and Avatar specimens ─────────────────────────────────────── */

const CHIP_TONES = [
  'default',
  'success',
  'warning',
  'caution',
  'info',
  'ink',
  'ghost',
] as const;

const CHIP_SIZES = ['sm', 'md', 'lg'] as const;

const CHIP_TONE_LABELS: Record<(typeof CHIP_TONES)[number], string> = {
  default: '代码检查',
  success: '通过',
  warning: '未通过',
  caution: '不计入',
  info: '当前版本',
  ink: '已选',
  ghost: '草稿',
};

function ChipToggleSpecimen() {
  const [selected, setSelected] = useState(false);
  return (
    <Chip
      tone={selected ? 'ink' : 'default'}
      size='md'
      onClick={() => {
        setSelected((value) => !value);
      }}
    >
      安全
    </Chip>
  );
}

function RankBarSpecimen(): ReactNode {
  const [selected, setSelected] = useState('none');
  const [round, setRound] = useState(0);
  return (
    <div className='gallery__row'>
      <Specimen
        caption={`max={1} for a 0–1 score · value: null → em dash · 0 keeps an endpoint · track clickable · last: ${selected}`}
        span={3}
      >
        <div className='gallery__stack gallery__stack--fill'>
          <RankBar
            max={1}
            direction='higher is better'
            items={GALLERY_MODEL_ROWS.map((row) => ({
              key: row.model,
              label: row.model,
              value: row.mean,
            }))}
            onSelect={setSelected}
          />
        </div>
      </Specimen>
      <Specimen
        caption={`values change → widths slide, no replay from 0 · round ${String(round)}`}
        span={3}
      >
        <div className='gallery__stack gallery__stack--fill'>
          <RankBar
            items={GALLERY_MODEL_ROWS.map((row, i) => ({
              key: row.model,
              label: row.model,
              value: ((i + round) % GALLERY_MODEL_ROWS.length) / 4 + 0.1,
            }))}
          />
          <AegisButton
            tone='secondary'
            onClick={() => {
              setRound((r) => r + 1);
            }}
          >
            Change values
          </AegisButton>
        </div>
      </Specimen>
      <Specimen
        caption='counts · format · --rank-bar-fill: var(--data-seq)'
        span={3}
      >
        <div className='gallery__rank-seq'>
          <RankBar
            direction='more runs'
            format={(value) => value.toFixed(0)}
            items={GALLERY_MODEL_ROWS.map((row) => ({
              key: row.model,
              label: row.model,
              value: row.runs,
            }))}
          />
        </div>
      </Specimen>
    </div>
  );
}

const GALLERY_PARETO_POINTS: ParetoPoint[] = [
  {
    key: 'alpha',
    label: 'model-alpha',
    x: 182,
    y: 0.81,
    color: 'cat-1',
  },
  {
    key: 'beta',
    label: 'model-beta',
    x: 64,
    y: 0.5263,
    color: 'cat-2',
  },
  {
    key: 'gamma',
    label: 'model-gamma',
    x: 41,
    y: 0.2,
    color: 'cat-3',
  },
  {
    key: 'delta',
    label: 'model-delta',
    x: 150,
    y: 0.42,
    color: 'cat-4',
  },
  {
    key: 'eps',
    label: 'model-epsilon',
    x: 95,
    y: 0.33,
    color: 'cat-5',
  },
  {
    key: 'zeta',
    label: 'model-zeta',
    x: 230,
    y: 0.6,
    color: 'cat-6',
  },
];

function ParetoChartSpecimen(): ReactNode {
  const [selected, setSelected] = useState('none');
  return (
    <Specimen
      caption={`formatX · formatY · zero-based axes · per-point color · frontier labels · legend · last: ${selected}`}
      span={3}
    >
      <ParetoChart
        xLabel='Mean duration (s)'
        yLabel='Mean result score'
        formatX={(value) => `${value.toFixed(0)} s`}
        formatY={(value) => value.toFixed(2)}
        points={GALLERY_PARETO_POINTS}
        legend={GALLERY_PARETO_POINTS.map((point) => ({
          key: point.key,
          label: point.label,
          color: point.color,
        }))}
        onSelect={setSelected}
      />
    </Specimen>
  );
}

const GALLERY_CHECK_MANY_RUNS: Array<CheckGridColumn<string>> = Array.from(
  { length: 8 },
  (_, i) => ({ key: `run-${String(i + 1)}`, label: `Run ${String(i + 1)}` })
);

function galleryRunCells(
  cell: (index: number) => CheckGridCell
): Record<string, CheckGridCell> {
  return Object.fromEntries(
    GALLERY_CHECK_MANY_RUNS.map((run, i) => [run.key, cell(i)])
  );
}

const GALLERY_CHECK_SCORE_ROWS: Array<CheckGridRow<string>> = [
  {
    key: 'diagnosis',
    label: 'root_cause_names_the_lagging_replica',
    cells: galleryRunCells((i) =>
      i % 3 === 0
        ? { state: 'missed', value: `−${(0.2 + i * 0.1).toFixed(2)}` }
        : { state: 'passed' }
    ),
  },
  {
    key: 'safety',
    label: 'no_dml',
    cells: galleryRunCells((i) =>
      i === 5 ? { state: 'unchecked' } : { state: 'passed' }
    ),
  },
];

type GalleryReviewKey = 'model' | 'construction' | 'grading' | 'unreviewed';

const GALLERY_REVIEW_SERIES: Array<StackedBarSeries<GalleryReviewKey>> = [
  { key: 'model', label: '模型错误', color: 'seq' },
  { key: 'construction', label: '构造问题', color: 'cat-4' },
  { key: 'grading', label: '评分错误', color: 'cat-5' },
  { key: 'unreviewed', label: '未复核', color: 'unknown' },
];

const GALLERY_REVIEW_ROWS: Array<StackedBarRow<GalleryReviewKey>> = [
  {
    key: 'glm',
    label: 'GLM 5.3 Flash',
    values: { model: 30, construction: 2, grading: 1, unreviewed: 15 },
    note: '次未通过 · 已复核 33',
  },
  {
    key: 'ds',
    label: 'DeepSeek Flash',
    values: { model: 22, construction: 0, grading: 0, unreviewed: 13 },
    note: '次未通过 · 已复核 22',
  },
  {
    key: 'gpt',
    label: 'GPT 6.1 Sol',
    values: { model: 1, construction: 0, grading: 0, unreviewed: 0 },
    note: '次未通过 · 已复核 1',
  },
];

function StackedBarSpecimen(): ReactNode {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  return (
    <Specimen
      caption={`in a chart Panel · title, description and 查看数据表 from the host · view: ${view}`}
      span={3}
    >
      <div className='gallery__stack gallery__stack--fill'>
        <Panel
          title='失败类型'
          description='未通过的计入运行按复核结论分类 · 运行失败不计入'
          extra={
            <AegisButton
              tone='ghost'
              onClick={() => {
                setView((v) => (v === 'chart' ? 'table' : 'chart'));
              }}
            >
              {view === 'chart' ? '查看数据表' : '查看图表'}
            </AegisButton>
          }
        >
          <StackedBar
            series={GALLERY_REVIEW_SERIES}
            rows={GALLERY_REVIEW_ROWS}
            view={view}
            labelHeader='模型'
            totalHeader='未通过'
          />
        </Panel>
      </div>
    </Specimen>
  );
}

type GalleryTagKey = 'spec' | 'cause' | 'scope' | 'other' | 'untagged';

const GALLERY_TAG_SERIES: Array<StackedBarSeries<GalleryTagKey>> = [
  { key: 'spec', label: 'Missed a stated requirement', color: 'cat-1' },
  { key: 'cause', label: 'Wrong root cause', color: 'cat-2' },
  { key: 'scope', label: 'Out-of-scope change', color: 'cat-3' },
  { key: 'other', label: 'Other', color: 'cat-6' },
  { key: 'untagged', label: 'Untagged', color: 'unknown' },
];

const GALLERY_TAG_VALUES: Array<Record<GalleryTagKey, number>> = [
  { spec: 12, cause: 8, scope: 3, other: 1, untagged: 4 },
  { spec: 5, cause: 0, scope: 2, other: 0, untagged: 6 },
  { spec: 0, cause: 0, scope: 0, other: 0, untagged: 0 },
];

const GALLERY_TAG_MODELS = ['model-alpha', 'model-beta', 'oracle'];

function StackedBarChangeSpecimen(): ReactNode {
  const [round, setRound] = useState(0);
  const rows: Array<StackedBarRow<GalleryTagKey>> = GALLERY_TAG_MODELS.map(
    (model, i) => ({
      key: model,
      label: model,
      values: GALLERY_TAG_VALUES[(i + round) % GALLERY_TAG_VALUES.length],
    })
  );
  return (
    <Specimen
      caption={`cat-* + unknown · zero segments omitted · a 0 row keeps an endpoint · max · direction · values change → widths slide · round ${String(round)}`}
      span={3}
    >
      <div className='gallery__stack gallery__stack--fill'>
        <StackedBar
          series={GALLERY_TAG_SERIES}
          rows={rows}
          max={40}
          direction='fewer is better'
          labelHeader='Model'
          totalHeader='Failed runs'
        />
        <AegisButton
          tone='secondary'
          onClick={() => {
            setRound((r) => r + 1);
          }}
        >
          Change values
        </AegisButton>
      </div>
    </Specimen>
  );
}

const GALLERY_LEGEND_ITEMS = GALLERY_TAG_SERIES.map((item) => ({
  key: item.key,
  label: item.label,
  color: item.color,
}));

const GALLERY_RANK_COLORS = ['cat-1', 'cat-2', 'cat-3', 'cat-4'] as const;

function ChartsScrollSpecimen(): ReactNode {
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const { ref, progress } = useScrollProgress<HTMLDivElement>({
    range: 'entry',
    scrollContainer: scroller,
  });
  return (
    <div className='gallery__row'>
      <Specimen
        caption={`progress from useScrollProgress · the charts follow the scroll both ways · progress ${progress.toFixed(2)}`}
        span={3}
      >
        <div ref={setScroller} className='gallery__chart-scroller'>
          <p className='gallery__chart-scroller-spacer'>
            Scroll down: the charts draw as they come into view.
          </p>
          <div ref={ref} className='gallery__stack gallery__stack--fill'>
            <RankBar
              max={1}
              direction='higher is better'
              progress={progress}
              items={GALLERY_MODEL_ROWS.map((row, i) => ({
                key: row.model,
                label: row.model,
                value: row.mean,
                color: GALLERY_RANK_COLORS[i % GALLERY_RANK_COLORS.length],
              }))}
            />
            <StackedBar
              series={GALLERY_TAG_SERIES}
              rows={GALLERY_TAG_MODELS.map((model, i) => ({
                key: model,
                label: model,
                values: GALLERY_TAG_VALUES[i],
              }))}
              progress={progress}
              labelHeader='Model'
              totalHeader='Failed runs'
            />
            <ParetoChart
              xLabel='Mean duration (s)'
              yLabel='Mean result score'
              formatX={(value) => `${value.toFixed(0)} s`}
              formatY={(value) => value.toFixed(2)}
              points={GALLERY_PARETO_POINTS}
              progress={progress}
            />
          </div>
          <div className='gallery__chart-scroller-spacer' />
        </div>
      </Specimen>
    </div>
  );
}

const GALLERY_CHART_TYPES = [
  { key: 'ranking', label: 'Model ranking' },
  { key: 'pareto', label: 'Pareto front' },
];

const GALLERY_SELECT_OPTIONS = [
  { value: 'first', label: '第一候选' },
  { value: 'all', label: '全部题目' },
];

function SelectSpecimen(): ReactNode {
  const [value, setValue] = useState('first');
  return (
    <AegisSelect
      label='题目范围'
      value={value}
      allowClear
      placeholder='选择题目范围'
      options={GALLERY_SELECT_OPTIONS}
      onChange={setValue}
    />
  );
}

function PickerFieldSpecimen(): ReactNode {
  const [open, setOpen] = useState(false);
  const [chart, setChart] = useState('ranking');
  return (
    <div className='gallery__row'>
      <Specimen caption='label · value · opens a Dialog'>
        <PickerField
          label='Chart type'
          value={GALLERY_CHART_TYPES.find((t) => t.key === chart)?.label}
          onClick={() => {
            setOpen(true);
          }}
        />
      </Specimen>
      <Specimen caption='placeholder'>
        <PickerField
          label='Compare models'
          placeholder='All models'
          onClick={() => {
            setOpen(true);
          }}
        />
      </Specimen>
      <Specimen caption='long value · ellipsis in a 192 column'>
        <div style={{ width: 192 }}>
          <PickerField
            label='Compare models'
            value='GPT 6.1 Sol, DeepSeek Flash, GLM 5.3 Flash'
            onClick={() => {
              setOpen(true);
            }}
          />
        </div>
      </Specimen>
      <Specimen caption='disabled'>
        <PickerField
          label='Compare models'
          value='3 models'
          disabled
          onClick={() => {
            /* no-op */
          }}
        />
      </Specimen>
      <Dialog
        open={open}
        title='Chart type'
        width='sm'
        onClose={() => {
          setOpen(false);
        }}
      >
        {GALLERY_CHART_TYPES.map((t) => (
          <AegisButton
            key={t.key}
            tone={t.key === chart ? 'primary' : 'secondary'}
            onClick={() => {
              setChart(t.key);
              setOpen(false);
            }}
          >
            {t.label}
          </AegisButton>
        ))}
      </Dialog>
    </div>
  );
}

type GalleryDialogKey = 'sm' | 'md' | 'lg';

const GALLERY_DIALOG_RUNS = Array.from({ length: 40 }, (_, index) => ({
  k: `run-${String(index + 1).padStart(2, '0')}`,
  v: index % 7 === 3 ? '错误' : '正确',
}));

function DialogSpecimen(): ReactNode {
  const [openKey, setOpenKey] = useState<GalleryDialogKey | null>(null);
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(true);
  const close = () => {
    setOpenKey(null);
  };
  return (
    <div className='gallery__row'>
      <Specimen caption='width=sm · body · footer'>
        <AegisButton
          tone='secondary'
          onClick={() => {
            setOpenKey('sm');
          }}
        >
          移除标签
        </AegisButton>
      </Specimen>
      <Specimen caption='width=md · description · form body · footer'>
        <AegisButton
          onClick={() => {
            setOpenKey('md');
          }}
        >
          发布新版本
        </AegisButton>
      </Specimen>
      <Specimen caption='width=lg · description · long body scrolls, no footer'>
        <AegisButton
          tone='secondary'
          onClick={() => {
            setOpenKey('lg');
          }}
        >
          查看运行
        </AegisButton>
      </Specimen>
      <Dialog
        open={openKey === 'sm'}
        width='sm'
        title='移除标签'
        footer={
          <>
            <AegisButton tone='secondary' onClick={close}>
              取消
            </AegisButton>
            <AegisButton tone='primary' onClick={close}>
              移除
            </AegisButton>
          </>
        }
        onClose={close}
      >
        题目留在数据集中，只是不再出现在这个展示集里。
      </Dialog>
      <Dialog
        open={openKey === 'md'}
        width='md'
        title='发布新版本'
        description='发布后，展示站改用这一版本的题目与评分。'
        footer={
          <>
            <AegisButton tone='secondary' onClick={close}>
              取消
            </AegisButton>
            <AegisButton tone='primary' onClick={close}>
              发布 V2
            </AegisButton>
          </>
        }
        onClose={close}
      >
        <TextField
          label='版本说明'
          placeholder='例如：修正评分说明'
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
          }}
        />
        <Checkbox
          checked={notify}
          onChange={setNotify}
          label='发布后通知订阅者'
        />
      </Dialog>
      <Dialog
        open={openKey === 'lg'}
        width='lg'
        title='运行记录'
        description='40 次运行 · 当前评分规则'
        onClose={close}
      >
        <KeyValueList items={GALLERY_DIALOG_RUNS} />
      </Dialog>
    </div>
  );
}

export function IndicatorsSection() {
  return (
    <Panel title={<PanelTitle size='lg'>Indicators</PanelTitle>}>
      <SectionDivider>StatusDot</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='ink'>
          <StatusDot />
        </Specimen>
        <Specimen caption='ink · pulse'>
          <StatusDot pulse />
        </Specimen>
        <Specimen caption='warning'>
          <StatusDot tone='warning' />
        </Specimen>
        <Specimen caption='warning · pulse'>
          <StatusDot tone='warning' pulse />
        </Specimen>
        <Specimen caption='size 10'>
          <StatusDot size={10} />
        </Specimen>
        <Specimen caption='success'>
          <StatusDot tone='success' />
        </Specimen>
      </div>

      <SectionDivider>Chip</SectionDivider>
      {CHIP_SIZES.map((size) => (
        <div className='gallery__row' key={size}>
          {CHIP_TONES.map((tone) => (
            <Specimen key={tone} caption={`${tone} · ${size}`}>
              <Chip tone={tone} size={size}>
                {CHIP_TONE_LABELS[tone]}
              </Chip>
            </Specimen>
          ))}
        </div>
      ))}
      <div className='gallery__row'>
        <Specimen caption='leading dot'>
          <Chip size='md' leading={<StatusDot pulse size={6} />}>
            运行中
          </Chip>
        </Specimen>
        <Specimen caption='leading icon'>
          <Chip tone='success' size='md' leading={<CheckCircleOutlined />}>
            通过
          </Chip>
        </Specimen>
        <Specimen caption='removable · onClose'>
          <Chip
            size='md'
            onClose={() => {
              /* no-op */
            }}
          >
            安全
          </Chip>
        </Specimen>
        <Specimen caption='clickable · ink when selected'>
          <ChipToggleSpecimen />
        </Specimen>
        <Specimen caption='agent surface'>
          <Chip
            tone='ink'
            surface={{
              id: 'gallery.chip.running',
              kind: 'tag',
              label: 'Status chip · running',
              askSuggestions: ['What does this status mean?'],
              project: (children) => ({
                fields: [
                  { name: 'status', type: 'string', value: String(children) },
                ],
              }),
            }}
          >
            running
          </Chip>
        </Specimen>
      </div>

      <SectionDivider>Alert</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='info'>
          <Alert tone='info'>这条记录不在当前筛选条件中。</Alert>
        </Specimen>
        <Specimen caption='warning'>
          <Alert tone='warning'>3 个案例缺少完整的版本或测量记录。</Alert>
        </Specimen>
        <Specimen caption='error'>
          <Alert tone='error'>无法读取标签建议。</Alert>
        </Specimen>
        <Specimen caption='success'>
          <Alert tone='success'>所有检查均已通过。</Alert>
        </Specimen>
      </div>
      <div className='gallery__row'>
        <Specimen caption="title · tone='error'" span={3}>
          <Alert tone='error' title='The run failed the plan check'>
            Plan check failed; exported results intact; safety check passed.
          </Alert>
        </Specimen>
        <Specimen caption="title · tone='success'" span={3}>
          <Alert tone='success' title='Both readers passed every check'>
            Plan check passed; exported results intact; safety check passed.
          </Alert>
        </Specimen>
      </div>
      <div className='gallery__row'>
        <Specimen caption="icon · title · tone='success'" span={3}>
          <Alert
            tone='success'
            icon={<CheckCircleOutlined />}
            title='Passed 11 of 11 checks'
          >
            Outcome restored; no destructive statement ran.
          </Alert>
        </Specimen>
        <Specimen caption="icon · tone='error'" span={3}>
          <Alert tone='error' icon={<CloseCircleOutlined />}>
            The run failed the plan check.
          </Alert>
        </Specimen>
      </div>

      <SectionDivider>Collapse</SectionDivider>
      <div className='gallery__stack'>
        <Collapse
          defaultActiveKeys={['first']}
          items={[
            {
              key: 'first',
              label: '完整理由与评分要求',
              children: '展开后的内容。',
            },
            {
              key: 'second',
              label: '评分干预检查',
              children: '未展开的内容。',
            },
          ]}
        />
      </div>

      <SectionDivider>Pagination</SectionDivider>
      <div className='gallery__stack'>
        <Pagination
          page={2}
          pageSize={10}
          total={137}
          unit='个步骤'
          pageSizeOptions={[1, 5, 10, 25]}
          onChange={() => {
            /* no-op */
          }}
        />
      </div>

      <SectionDivider>Checkbox</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='unchecked'>
          <Checkbox
            checked={false}
            label='选择题目'
            onChange={() => {
              /* no-op */
            }}
          />
        </Specimen>
        <Specimen caption='checked'>
          <Checkbox
            checked
            label='选择题目'
            onChange={() => {
              /* no-op */
            }}
          />
        </Specimen>
        <Specimen caption='indeterminate'>
          <Checkbox
            checked={false}
            indeterminate
            label='选择题目'
            onChange={() => {
              /* no-op */
            }}
          />
        </Specimen>
        <Specimen caption='no label · ariaLabel (row selector)'>
          <Checkbox
            checked={false}
            ariaLabel='选择本行'
            onChange={() => {
              /* no-op */
            }}
          />
        </Specimen>
        <Specimen caption='disabled'>
          <Checkbox
            checked={false}
            disabled
            label='选择题目'
            onChange={() => {
              /* no-op */
            }}
          />
        </Specimen>
        <Specimen caption='disabled · checked'>
          <Checkbox
            checked
            disabled
            label='选择题目'
            onChange={() => {
              /* no-op */
            }}
          />
        </Specimen>
      </div>

      <SectionDivider>Select</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='label · value'>
          <AegisSelect
            label='标签'
            value='first'
            options={GALLERY_SELECT_OPTIONS}
            onChange={() => {
              /* no-op */
            }}
          />
        </Specimen>
        <Specimen caption='allowClear · pick, then clear to the placeholder'>
          <SelectSpecimen />
        </Specimen>
        <Specimen caption='placeholder · --text-muted'>
          <AegisSelect
            value=''
            placeholder='选择横轴指标'
            options={[{ value: 'score', label: '结果均分' }]}
            onChange={() => {
              /* no-op */
            }}
          />
        </Specimen>
        <Specimen caption='long value · ellipsis in a 192 column'>
          <div style={{ width: 192 }}>
            <AegisSelect
              label='比较指标'
              value='long'
              options={[
                {
                  value: 'long',
                  label: '诊断维度的加权均分（只计入当前规则）',
                },
              ]}
              onChange={() => {
                /* no-op */
              }}
            />
          </div>
        </Specimen>
        <Specimen caption='disabled'>
          <AegisSelect
            value='v1'
            disabled
            options={[{ value: 'v1', label: 'V1 · 当前版本' }]}
            onChange={() => {
              /* no-op */
            }}
          />
        </Specimen>
      </div>

      <SectionDivider>PickerField</SectionDivider>
      <PickerFieldSpecimen />

      <SectionDivider>RankBar</SectionDivider>
      <div className='gallery__stack'>
        <RankBar
          direction='越高越好'
          items={[
            { key: 'gpt', label: 'GPT 6.1 Sol', value: 1 },
            { key: 'glm', label: 'GLM 5.3 Flash', value: 0.2 },
            { key: 'ds', label: 'DeepSeek Flash', value: 0 },
          ].map((item) => ({
            ...item,
            action: (
              <a className='gallery__table-link' href={`#rank-${item.key}`}>
                逐题表现
              </a>
            ),
          }))}
          onSelect={() => {
            /* no-op */
          }}
        />
        <RankBarSpecimen />
      </div>

      <SectionDivider>ScoreBar</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='value · two decimals'>
          <ScoreBar value={0.72} />
        </Specimen>
        <Specimen caption='0.2583 → 0.26'>
          <ScoreBar value={0.2583} />
        </Specimen>
        <Specimen caption='zero · 0.00 keeps a 2 px endpoint'>
          <ScoreBar value={0} />
        </Specimen>
        <Specimen caption='empty · null → em dash, empty track'>
          <ScoreBar value={null} />
        </Specimen>
        <Specimen caption='max · format · ariaLabel'>
          <ScoreBar
            value={7}
            max={10}
            format={(value) => value.toFixed(0)}
            ariaLabel='7 of 10 checks'
          />
        </Specimen>
        <Specimen
          caption='numeric DataTable column · fills draw in staggered by staggerIndex'
          span={3}
        >
          <DataTable
            columns={[
              GALLERY_MODEL_COLUMNS[0],
              {
                key: 'score',
                header: 'Mean score',
                numeric: true,
                render: (row, index) => (
                  <ScoreBar value={row.mean} staggerIndex={index} />
                ),
              },
            ]}
            data={GALLERY_MODEL_ROWS}
            rowKey={(row) => row.model}
          />
        </Specimen>
      </div>

      <SectionDivider>RunPips</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='dots · passed · failed · execution failed'>
          <RunPips counts={{ passed: 3, failed: 1, errored: 1 }} />
        </Specimen>
        <Specimen caption='every dot kind · passed · failed · errored · pending'>
          <RunPips counts={{ passed: 1, failed: 1, errored: 1, pending: 1 }} />
        </Specimen>
        <Specimen caption='10 runs · still dots'>
          <RunPips counts={{ passed: 6, failed: 2, errored: 1, pending: 1 }} />
        </Specimen>
        <Specimen caption='bar · above 10 runs, 64 px proportional'>
          <RunPips counts={{ passed: 12, failed: 6, errored: 2 }} />
        </Specimen>
        <Specimen caption='bar · 120 runs'>
          <RunPips counts={{ passed: 31, failed: 80, errored: 9 }} />
        </Specimen>
        <Specimen caption='maxDots={4}'>
          <RunPips counts={{ passed: 3, failed: 2, errored: 0 }} maxDots={4} />
        </Specimen>
        <Specimen caption='no runs'>
          <RunPips counts={{ passed: 0, failed: 0, errored: 0 }} />
        </Specimen>
      </div>

      <SectionDivider>ParetoChart</SectionDivider>
      <div className='gallery__stack'>
        <ParetoChartSpecimen />
        <ParetoChart
          xLabel='平均耗时（秒）'
          yLabel='结果均分'
          points={[
            { key: 'gpt', label: 'GPT 6.1 Sol', x: 180, y: 1 },
            { key: 'glm', label: 'GLM 5.3 Flash', x: 60, y: 0.2 },
            { key: 'ds', label: 'DeepSeek Flash', x: 40, y: 0 },
          ]}
          onSelect={() => {
            /* no-op */
          }}
        />
        <ParetoChart
          xLabel='横轴指标'
          yLabel='纵轴指标'
          points={[]}
          emptyDescription='配置两个指标及优化方向后，显示模型点和帕累托前沿。'
        />
        <Specimen
          caption='empty · a slot in place of the plot, at its minimum height'
          span={3}
        >
          <ParetoChart
            xLabel='X metric'
            yLabel='Mean result score'
            points={[]}
            empty={
              <EmptyState
                icon={<DotChartOutlined aria-hidden />}
                title='Choose both axes'
                description='Pick an X metric to place every model by both metrics.'
              />
            }
          />
        </Specimen>
      </div>

      <SectionDivider>CheckGrid</SectionDivider>
      <div className='gallery__row'>
        <Specimen
          caption='rows = checks, columns = runs · passed · missed writes the miss · unchecked em dash · caption'
          span={3}
        >
          <CheckGrid
            rowHeader='检查'
            passedLabel='通过'
            uncheckedLabel='未检查'
            columns={GALLERY_CHECK_RUNS}
            rows={GALLERY_CHECK_ROWS}
            caption='图 1 · 五次运行都没修好 replica 的执行计划；运行 4 没过安全门槛，后面的检查不再执行。示例只列出部分检查。'
          />
        </Specimen>
        <Specimen
          caption='score deltas as the miss · many runs scroll sideways inside the frame · no caption'
          span={3}
        >
          <CheckGrid
            rowHeader='Check'
            passedLabel='Passed'
            uncheckedLabel='Not checked'
            columns={GALLERY_CHECK_MANY_RUNS}
            rows={GALLERY_CHECK_SCORE_ROWS}
          />
        </Specimen>
      </div>

      <SectionDivider>StackedBar</SectionDivider>
      <div className='gallery__stack'>
        <StackedBarSpecimen />
        <div className='gallery__row'>
          <StackedBarChangeSpecimen />
        </div>
      </div>

      <SectionDivider>ChartLegend</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption="shape='square' for bars · cat-* · unknown has a hairline edge">
          <ChartLegend items={GALLERY_LEGEND_ITEMS} />
        </Specimen>
        <Specimen caption="shape='dot' for points · a host token, e.g. var(--data-seq)">
          <ChartLegend
            shape='dot'
            items={[
              { key: 'seq', label: 'Series token', color: 'var(--data-seq)' },
              { key: 'cat-2', label: 'model-beta', color: 'cat-2' },
            ]}
          />
        </Specimen>
      </div>

      <SectionDivider
        extra={
          <MetricLabel>RankBar · StackedBar · ParetoChart progress</MetricLabel>
        }
      >
        Charts drawn by scroll
      </SectionDivider>
      <ChartsScrollSpecimen />

      <SectionDivider>Dialog</SectionDivider>
      <DialogSpecimen />

      <SectionDivider>BlastRadiusBar</SectionDivider>
      <div className='gallery__stack'>
        <BlastRadiusBar
          value={20}
          centerLabel='Node Group A · 20 %'
          surface={{
            id: 'gallery.blast.20',
            kind: 'metric',
            label: 'Blast radius · Node Group A',
            askSuggestions: ['Is this blast radius safe?'],
            project: (data) => ({
              fields: [
                { name: 'value', type: 'number', value: data.value },
                {
                  name: 'centerLabel',
                  type: 'string',
                  value: data.centerLabel ?? '',
                },
              ],
            }),
          }}
        />
        <BlastRadiusBar value={65} centerLabel='Node Group A · 65 %' />
        <BlastRadiusBar value={92} centerLabel='Node Group A · 92 %' />
        <BlastRadiusBar value={50} hideTicks />
      </div>
    </Panel>
  );
}
