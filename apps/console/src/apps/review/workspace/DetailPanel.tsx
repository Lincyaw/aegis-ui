import { type ReactElement, type ReactNode, useMemo, useState } from 'react';

import {
  Chip,
  CodeBlock,
  EmptyState,
  ErrorState,
  MetricLabel,
  Select,
  Skeleton,
  Tabs,
  TimeSeriesChart,
} from '@lincyaw/aegis-ui';
import type {
  Context,
  GraphLink,
  GraphNode,
  Item,
  LogTemplateStat,
  Port,
} from '@lincyaw/review-api';

import {
  basisOf,
  FAULT_TAG,
  type Graph,
  linkStats,
  NO_TRACES_TAG,
  noTelemetry,
  tagLabel,
} from '../evidence/board';
import { classify } from '../evidence/classify';
import { fmtClock, fmtCount } from '../evidence/format';
import { linkRows, markersOf, metricRows, windowsOf } from '../evidence/series';
import { type ReviewStrings, useReviewStrings } from '../locale/context';
import { useLinkSeries, useNodeDetail } from '../queries';

import { type CallRow, CallTable } from './CallTable';
import type { Selection } from './selection';
import { StatsCompare } from './StatsCompare';

function domainOf(context: Context): [number, number] | undefined {
  if (context.windows.length === 0) {
    return undefined;
  }
  return [
    Math.min(...context.windows.map((w) => w.start)),
    Math.max(...context.windows.map((w) => w.end)),
  ];
}

const formatTime = (t: number, precision: 'minute' | 'second'): string =>
  fmtClock(t, precision);

function Section({
  title,
  aside,
  children,
}: {
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}): ReactElement {
  return (
    <section className='review-detail__section'>
      <header className='review-detail__section-head'>
        <h3 className='review-detail__section-title'>{title}</h3>
        {aside !== undefined && (
          <span className='review-detail__section-aside'>{aside}</span>
        )}
      </header>
      {children}
    </section>
  );
}

function ChangeLine({ link }: { link: GraphLink }): ReactElement {
  const s = useReviewStrings();
  const c = classify(linkStats(link));
  return (
    <p className={`review-detail__change review-detail__change--${c.change}`}>
      <span className='review-detail__change-swatch' aria-hidden='true' />
      {s.changeLabel[c.change]}
    </p>
  );
}

function portLabel(node: GraphNode | undefined, id: string): string {
  return node?.ports.find((p) => p.id === id)?.label ?? id;
}

function linkRow(
  graph: Graph,
  link: GraphLink,
  side: 'source' | 'target',
  currentId: string | undefined,
  s: ReviewStrings
): CallRow {
  const id = link[side];
  return {
    key: link.id,
    name: graph.nodes.get(id)?.label ?? id,
    stats: linkStats(link),
    current: link.id === currentId,
    tag: graph.nodes.get(id)?.tags.includes(FAULT_TAG)
      ? s.tagFaultTarget
      : undefined,
  };
}

/* ── Links ─────────────────────────────────────────────────────────── */

function LinkSeriesChart({
  context,
  link,
  pair,
}: {
  context: Context;
  link: GraphLink;
  pair: { sourcePort: string; targetPort: string } | undefined;
}): ReactElement {
  const s = useReviewStrings();
  const series = useLinkSeries(
    context.id,
    link.hasSeries ? link.id : undefined
  );
  if (!link.hasSeries) {
    return <p className='review-detail__muted'>{s.noTimeline}</p>;
  }
  if (series.isPending) {
    return <Skeleton height={200} />;
  }
  if (series.isError) {
    return (
      <ErrorState title={s.timelineFailed} description={series.error.message} />
    );
  }
  const portSeries =
    pair === undefined
      ? undefined
      : series.data.ports.find(
          (p) =>
            p.sourcePort === pair.sourcePort && p.targetPort === pair.targetPort
        );
  const pairStats =
    pair === undefined
      ? linkStats(link)
      : link.ports.find(
          (p) =>
            p.sourcePort === pair.sourcePort && p.targetPort === pair.targetPort
        )?.stats;
  // All endpoints: the caller's view when there is one; one endpoint pair:
  // the callee's spans of that pair.
  const callerView = pair === undefined && link.callerStats !== undefined;
  const points =
    portSeries?.points ??
    (callerView ? series.data.callerPoints : undefined) ??
    series.data.points;
  return (
    <>
      {link.callerStats !== undefined && (
        <p className='review-detail__note'>
          {callerView
            ? s.timelineCaller(link.source)
            : s.timelineCallee(link.target)}
        </p>
      )}
      <TimeSeriesChart
        rows={linkRows(points, pairStats, s)}
        windows={windowsOf(context, s)}
        markers={markersOf(context, s)}
        bucketSeconds={series.data.bucketSeconds}
        domain={domainOf(context)}
        formatTime={formatTime}
        label={s.linkChartLabel(
          link.source,
          link.target,
          series.data.bucketSeconds
        )}
      />
    </>
  );
}

const ALL_PAIRS = '';

function pairKey(sourcePort: string, targetPort: string): string {
  return `${sourcePort}\u0000${targetPort}`;
}

function LinkDetail({
  graph,
  context,
  item,
  link,
  pair,
  onSelect,
}: {
  graph: Graph;
  context: Context;
  item: Item;
  link: GraphLink;
  pair: { sourcePort: string; targetPort: string } | undefined;
  onSelect: (selection: Selection) => void;
}): ReactElement {
  const s = useReviewStrings();
  const source = graph.nodes.get(link.source);
  const target = graph.nodes.get(link.target);
  const claimed = item.focus.claimedLinks.some(
    (c) => c.source === link.source && c.target === link.target
  );
  const pairStats =
    pair === undefined
      ? undefined
      : link.ports.find(
          (p) =>
            p.sourcePort === pair.sourcePort && p.targetPort === pair.targetPort
        )?.stats;
  const pairRows: CallRow[] = link.ports.map((p) => ({
    key: pairKey(p.sourcePort, p.targetPort),
    name: (
      <span className='review-detail__pair'>
        <span>{portLabel(target, p.targetPort)}</span>
        <span className='review-detail__pair-from'>
          {portLabel(source, p.sourcePort)}
        </span>
      </span>
    ),
    stats: p.stats,
    current:
      pair !== undefined &&
      p.sourcePort === pair.sourcePort &&
      p.targetPort === pair.targetPort,
  }));
  const selectPair = (key: string): void => {
    const [sourcePort, targetPort] = key.split('\u0000');
    onSelect({
      kind: 'link',
      id: link.id,
      pair: key === ALL_PAIRS ? undefined : { sourcePort, targetPort },
    });
  };
  const siblings = (graph.out.get(link.source) ?? []).map((l) =>
    linkRow(graph, l, 'target', link.id, s)
  );
  const callers = (graph.into.get(link.target) ?? []).map((l) =>
    linkRow(graph, l, 'source', link.id, s)
  );
  const open = (row: CallRow): void => {
    onSelect({ kind: 'link', id: row.key });
  };
  const basis = basisOf(link);

  return (
    <div className='review-detail__body'>
      <header className='review-detail__head'>
        <MetricLabel>{claimed ? s.linkUnderReview : s.link}</MetricLabel>
        <h2 className='review-detail__title'>
          <span className='review-detail__node'>{link.source}</span>
          <span className='review-detail__verb'>{s.verbCalls}</span>
          <span className='review-detail__node'>{link.target}</span>
        </h2>
        <ChangeLine link={link} />
        {basis !== 'spans' && (
          <p className='review-detail__note'>{s.basisNote[basis]}</p>
        )}
      </header>

      <Section
        title={s.timeline}
        aside={
          link.ports.length > 1 ? (
            <Select
              className='review-detail__pair-select'
              value={
                pair === undefined
                  ? ALL_PAIRS
                  : pairKey(pair.sourcePort, pair.targetPort)
              }
              options={[
                {
                  value: ALL_PAIRS,
                  label: s.allEndpoints(link.ports.length),
                },
                ...link.ports.map((p) => ({
                  value: pairKey(p.sourcePort, p.targetPort),
                  label: portLabel(target, p.targetPort),
                })),
              ]}
              onChange={selectPair}
              ariaLabel={s.endpointSelect}
            />
          ) : undefined
        }
      >
        <LinkSeriesChart context={context} link={link} pair={pair} />
      </Section>

      {pair === undefined && link.callerStats !== undefined ? (
        <>
          <Section title={s.bothWindows} aside={s.viewCaller}>
            <p className='review-detail__note'>
              {s.viewCallerNote(link.source, link.target)}
            </p>
            <StatsCompare stats={link.callerStats} />
          </Section>
          <Section title={s.bothWindows} aside={s.viewCallee}>
            <p className='review-detail__note'>
              {s.viewCalleeNote(link.source, link.target)}
            </p>
            <StatsCompare stats={link.stats} />
          </Section>
        </>
      ) : (
        <Section title={pair === undefined ? s.bothWindows : s.bothWindowsOne}>
          <StatsCompare stats={pairStats ?? link.stats} />
        </Section>
      )}

      {link.ports.length > 0 && (
        <Section title={s.byEndpoint} aside={s.pairsAside(link.ports.length)}>
          <CallTable
            rows={pairRows}
            nameHeader={s.endpointOf(link.target)}
            ariaLabel={s.callsByEndpoint(link.source, link.target)}
            onOpen={(row) => {
              selectPair(row.current === true ? ALL_PAIRS : row.key);
            }}
          />
        </Section>
      )}

      <Section
        title={s.everythingCalls(link.source)}
        aside={s.everythingCallsAside}
      >
        <CallTable
          rows={siblings}
          nameHeader={s.colCallee}
          ariaLabel={s.callsFrom(link.source)}
          onOpen={open}
        />
      </Section>

      <Section title={s.everythingCalling(link.target)}>
        <CallTable
          rows={callers}
          nameHeader={s.colCaller}
          ariaLabel={s.callsInto(link.target)}
          onOpen={open}
        />
      </Section>
    </div>
  );
}

/* ── A claimed link with no calls ──────────────────────────────────── */

function PortTable({
  ports,
  ariaLabel,
}: {
  ports: Port[];
  ariaLabel: string;
}): ReactElement {
  const s = useReviewStrings();
  const rows: CallRow[] = ports.flatMap((p) =>
    p.stats === undefined ? [] : [{ key: p.id, name: p.label, stats: p.stats }]
  );
  return (
    <CallTable
      rows={rows}
      nameHeader={s.colEndpoint}
      ariaLabel={ariaLabel}
      emptyTitle={s.noEndpoints}
    />
  );
}

function GhostDetail({
  graph,
  source,
  target,
  onSelect,
}: {
  graph: Graph;
  source: string;
  target: string;
  onSelect: (selection: Selection) => void;
}): ReactElement {
  const s = useReviewStrings();
  const node = graph.nodes.get(source);
  const calls = (graph.out.get(source) ?? []).map((l) =>
    linkRow(graph, l, 'target', undefined, s)
  );
  const callers = (graph.into.get(target) ?? []).map((l) =>
    linkRow(graph, l, 'source', undefined, s)
  );
  const open = (row: CallRow): void => {
    onSelect({ kind: 'link', id: row.key });
  };
  const silent = [source, target].filter((id) => {
    const end = graph.nodes.get(id);
    return end !== undefined && noTelemetry(graph, end);
  });
  return (
    <div className='review-detail__body'>
      <header className='review-detail__head'>
        <MetricLabel>{s.linkUnderReview}</MetricLabel>
        <h2 className='review-detail__title'>
          <span className='review-detail__node'>{source}</span>
          <span className='review-detail__verb'>{s.verbCalls}</span>
          <span className='review-detail__node'>{target}</span>
        </h2>
        <p className='review-detail__change review-detail__change--none'>
          <span className='review-detail__change-swatch' aria-hidden='true' />
          {s.noCallsBetween(source, target)}
        </p>
        {silent.length > 0 && (
          <p className='review-detail__note'>{s.noTelemetryFrom(silent)}</p>
        )}
      </header>
      <Section
        title={s.everythingCalls(source)}
        aside={s.calleesCount(calls.length)}
      >
        <CallTable
          rows={calls}
          nameHeader={s.colCallee}
          ariaLabel={s.callsFrom(source)}
          onOpen={open}
          emptyTitle={s.noCallsFrom(source)}
        />
      </Section>
      <Section title={s.clientEndpoints(source)}>
        <PortTable
          ports={(node?.ports ?? []).filter((p) => p.role === 'client')}
          ariaLabel={s.clientEndpointsOf(source)}
        />
      </Section>
      <Section title={s.everythingCalling(target)}>
        <CallTable
          rows={callers}
          nameHeader={s.colCaller}
          ariaLabel={s.callsInto(target)}
          onOpen={open}
          emptyTitle={s.noCallsInto(target)}
        />
      </Section>
    </div>
  );
}

/* ── Nodes ─────────────────────────────────────────────────────────── */

type LogChange = 'new' | 'gone' | 'both';

function logChange(log: LogTemplateStat): LogChange {
  if (log.normal === 0 && log.abnormal > 0) {
    return 'new';
  }
  if (log.abnormal === 0 && log.normal > 0) {
    return 'gone';
  }
  return 'both';
}

function logRank(log: LogTemplateStat): number {
  const change = logChange(log);
  if (change === 'new') {
    return 1e9 + log.abnormal;
  }
  return Math.log((log.abnormal + 1) / (log.normal + 1));
}

type LogFilter = 'all' | 'new' | 'gone';

function LogEntry({ log }: { log: LogTemplateStat }): ReactElement {
  const s = useReviewStrings();
  const [open, setOpen] = useState(false);
  const change = logChange(log);
  return (
    <li className='review-logs__item'>
      <button
        type='button'
        className='review-logs__row'
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
        }}
      >
        <span className='review-logs__head'>
          {change === 'new' && (
            <Chip tone='caution' size='sm'>
              {s.logNew}
            </Chip>
          )}
          {change === 'gone' && (
            <Chip tone='ghost' size='sm'>
              {s.logGone}
            </Chip>
          )}
          {log.level !== undefined && (
            <span className='review-logs__level'>{log.level}</span>
          )}
          <span className='review-logs__counts'>
            {`${fmtCount(log.normal)} → ${fmtCount(log.abnormal)}`}
          </span>
          {change === 'both' && (
            <span className='review-logs__ratio'>
              {`×${(log.abnormal / log.normal).toFixed(2)}`}
            </span>
          )}
        </span>
        <span
          className={[
            'review-logs__text',
            open ? 'review-logs__text--open' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {log.template}
        </span>
      </button>
      {open && log.sample !== undefined && (
        <CodeBlock code={log.sample} language='sample' maxHeight={240} />
      )}
    </li>
  );
}

/** Log templates, new ones first, then by how much more often they appear. */
function LogTable({
  logs,
  nodeId,
}: {
  logs: LogTemplateStat[];
  nodeId: string;
}): ReactElement {
  const s = useReviewStrings();
  const [filter, setFilter] = useState<LogFilter>('all');
  const counts = useMemo(
    () => ({
      new: logs.filter((l) => logChange(l) === 'new').length,
      gone: logs.filter((l) => logChange(l) === 'gone').length,
    }),
    [logs]
  );
  const rows = logs
    .map((log, index) => ({ log, index }))
    .filter(({ log }) => filter === 'all' || logChange(log) === filter)
    .sort((a, b) => logRank(b.log) - logRank(a.log));
  return (
    <div className='review-logs'>
      <div className='review-logs__bar'>
        <Tabs
          size='sm'
          listOnly
          activeKey={filter}
          onChange={(key) => {
            setFilter(key as LogFilter);
          }}
          ariaLabel={s.logsShown}
          items={[
            { key: 'all', label: s.logsAll(logs.length) },
            {
              key: 'new',
              label: s.logsNew(counts.new),
              disabled: counts.new === 0,
            },
            {
              key: 'gone',
              label: s.logsGone(counts.gone),
              disabled: counts.gone === 0,
            },
          ]}
        />
        <span className='review-detail__section-aside'>{s.logsAside}</span>
      </div>
      <ul className='review-logs__list' aria-label={s.logsOf(nodeId)}>
        {rows.map(({ log, index }) => (
          <LogEntry key={`${nodeId}:${String(index)}`} log={log} />
        ))}
      </ul>
    </div>
  );
}

type NodeTab = 'calls' | 'metrics' | 'logs';

function NodeDetail({
  graph,
  context,
  node,
  onSelect,
}: {
  graph: Graph;
  context: Context;
  node: GraphNode;
  onSelect: (selection: Selection) => void;
}): ReactElement {
  const s = useReviewStrings();
  const detail = useNodeDetail(
    context.id,
    node.hasDetail ? node.id : undefined
  );
  const [tab, setTab] = useState<NodeTab>('calls');
  const calls = (graph.out.get(node.id) ?? []).map((l) =>
    linkRow(graph, l, 'target', undefined, s)
  );
  const callers = (graph.into.get(node.id) ?? []).map((l) =>
    linkRow(graph, l, 'source', undefined, s)
  );
  const open = (row: CallRow): void => {
    onSelect({ kind: 'link', id: row.key });
  };
  const servers = node.ports.filter((p) => p.role === 'server');
  const metricCount = new Set(detail.data?.metrics.map((m) => m.name)).size;
  const instances = new Set(
    detail.data?.metrics.flatMap((m) =>
      m.instance === undefined ? [] : [m.instance]
    )
  ).size;

  const body = ((): ReactNode => {
    if (tab === 'calls') {
      return (
        <>
          <Section
            title={s.callsServed}
            aside={s.endpointsCount(servers.length)}
          >
            <PortTable
              ports={servers}
              ariaLabel={s.endpointsServedBy(node.id)}
            />
          </Section>
          <Section title={s.everythingCalls(node.id)}>
            <CallTable
              rows={calls}
              nameHeader={s.colCallee}
              ariaLabel={s.callsFrom(node.id)}
              onOpen={open}
              emptyTitle={s.callsNothing}
            />
          </Section>
          <Section title={s.everythingCalling(node.id)}>
            <CallTable
              rows={callers}
              nameHeader={s.colCaller}
              ariaLabel={s.callsInto(node.id)}
              onOpen={open}
              emptyTitle={s.calledByNothing}
            />
          </Section>
        </>
      );
    }
    if (!node.hasDetail) {
      return <EmptyState title={s.noDetail} />;
    }
    if (detail.isPending) {
      return <Skeleton height={320} />;
    }
    if (detail.isError) {
      return (
        <ErrorState title={s.detailFailed} description={detail.error.message} />
      );
    }
    if (tab === 'metrics') {
      return detail.data.metrics.length === 0 ? (
        <EmptyState title={s.noMetrics} />
      ) : (
        <Section
          title={s.metrics}
          aside={s.metricsAside(metricCount, instances)}
        >
          <TimeSeriesChart
            rows={metricRows(detail.data.metrics)}
            windows={windowsOf(context, s)}
            markers={markersOf(context, s)}
            domain={domainOf(context)}
            formatTime={formatTime}
            density='compact'
            label={s.metricsChartLabel(node.id)}
          />
        </Section>
      );
    }
    return detail.data.logs.length === 0 ? (
      <EmptyState title={s.noLogs} />
    ) : (
      <LogTable logs={detail.data.logs} nodeId={node.id} />
    );
  })();

  const traced = !node.tags.includes(NO_TRACES_TAG);
  const silent = noTelemetry(graph, node);
  const head = (
    <header className='review-detail__head'>
      <MetricLabel>{s.nodeKind(node.kind)}</MetricLabel>
      <h2 className='review-detail__title'>
        <span className='review-detail__node'>{node.label}</span>
      </h2>
      {node.tags.length > 0 && (
        <div className='review-detail__tags'>
          {node.tags.map((tag) => {
            const label = tagLabel(tag, s);
            return (
              <Chip
                key={tag}
                tone={label.tone === 'caution' ? 'caution' : 'ghost'}
              >
                {label.label}
              </Chip>
            );
          })}
        </div>
      )}
      {silent ? (
        <p className='review-detail__note'>{s.noTelemetryNote}</p>
      ) : (
        !traced && <p className='review-detail__note'>{s.noTracesNote}</p>
      )}
    </header>
  );
  if (silent) {
    return <div className='review-detail__body'>{head}</div>;
  }

  return (
    <div className='review-detail__body'>
      {head}
      {traced && (
        <Section title={s.spansServed}>
          <StatsCompare stats={node.stats} />
        </Section>
      )}
      <Tabs
        size='sm'
        listOnly
        activeKey={tab}
        onChange={(key) => {
          setTab(key as NodeTab);
        }}
        ariaLabel={s.serviceTabs}
        items={[
          { key: 'calls', label: s.tabCalls },
          {
            key: 'metrics',
            label: s.tabMetrics(
              detail.data === undefined ? undefined : metricCount
            ),
            disabled: !node.hasDetail,
          },
          {
            key: 'logs',
            label: s.tabLogs(detail.data?.logs.length),
            disabled: !node.hasDetail,
          },
        ]}
      />
      {body}
    </div>
  );
}

/* ── Panel ─────────────────────────────────────────────────────────── */

interface DetailPanelProps {
  graph: Graph;
  context: Context;
  item: Item;
  selection: Selection | undefined;
  onSelect: (selection: Selection) => void;
}

export function DetailPanel({
  graph,
  context,
  item,
  selection,
  onSelect,
}: DetailPanelProps): ReactElement {
  const s = useReviewStrings();
  const content = ((): ReactNode => {
    if (selection === undefined) {
      return (
        <EmptyState
          title={s.nothingSelected}
          description={s.nothingSelectedHint}
        />
      );
    }
    if (selection.kind === 'ghost') {
      return (
        <GhostDetail
          graph={graph}
          source={selection.source}
          target={selection.target}
          onSelect={onSelect}
        />
      );
    }
    if (selection.kind === 'link') {
      const link = graph.links.get(selection.id);
      return link === undefined ? (
        <EmptyState title={s.linkMissing} />
      ) : (
        <LinkDetail
          key={link.id}
          graph={graph}
          context={context}
          item={item}
          link={link}
          pair={selection.pair}
          onSelect={onSelect}
        />
      );
    }
    const node = graph.nodes.get(selection.id);
    return node === undefined ? (
      <EmptyState title={s.serviceMissing} />
    ) : (
      <NodeDetail
        key={node.id}
        graph={graph}
        context={context}
        node={node}
        onSelect={onSelect}
      />
    );
  })();
  return (
    <aside className='review-detail' aria-label={s.detailsLabel}>
      {content}
    </aside>
  );
}
