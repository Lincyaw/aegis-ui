import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  useId,
  useMemo,
  useState,
} from 'react';

import { Tooltip } from 'antd';

import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useStrings } from '../../locale';
import { Checkbox } from './Checkbox';
import { Chip } from './Chip';
import './CommitGraph.css';

export interface CommitGraphCommit {
  id: string;
  /**
   * The commit's parents. An edge to a parent missing from `commits` runs to
   * the bottom of the graph. With lanes, a parent in another lane is not
   * drawn; relate commits across lanes with `links`. A commit with two or
   * more parents drawn is a merge.
   */
  parents: string[];
  /**
   * Without `columns`: one line, cut off with an ellipsis when it is too
   * long; hovering shows it whole. It names the row's checkbox.
   */
  title?: ReactNode;
  /** Without `columns`: shown at the end of the row, e.g. a short id or a time. */
  meta?: ReactNode;
  /** Without `columns`: names that point at the commit, e.g. branch heads, as chips before the title. */
  refs?: string[];
  /**
   * With `columns`: the row's cells, by column id. A cell is one line: its
   * content is cut to the row's height, so every row lines up with the
   * drawing.
   */
  cells?: Record<string, ReactNode>;
  /** The `lanes` id of the column the commit is drawn in. Default, and for an unknown id: the first lane. */
  lane?: string;
  /**
   * Commits in other lanes this one relates to, e.g. the requirement commit a
   * run was built from. Each is drawn as a dashed edge.
   */
  links?: string[];
}

export interface CommitGraphLane {
  id: string;
  label: string;
}

export interface CommitGraphColumn {
  id: string;
  /** The column's name, in its header. */
  label: string;
  /**
   * Takes the width the other columns leave, which are as wide as their
   * content, and cuts its cells off with an ellipsis, e.g. a message;
   * hovering a cut cell shows it whole.
   */
  grow?: boolean;
}

export interface CommitGraphProps {
  /** The commits, newest first: each comes before its parents. */
  commits: CommitGraphCommit[];
  /**
   * Columns of the graph, each a separate history with its own branches,
   * e.g. requirements, runs and a code trunk. A commit is drawn in the lane
   * its `lane` names. Without lanes the graph is one history.
   */
  lanes?: CommitGraphLane[];
  /**
   * Draws the commits as a table: the graph in the first column, then these
   * columns, one row per commit with its `cells`. A table scrolls sideways
   * when its columns do not fit. Without `columns` the commits are a list.
   */
  columns?: CommitGraphColumn[];
  /**
   * Ids of the selected commits. With `onSelectedIdsChange`, each row has a
   * checkbox, at the start of the first column in a table, named by that
   * cell; a selected table row is `aria-selected`.
   */
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  /** The most commits selected at once: selecting one more drops the one selected first. */
  maxSelected?: number;
  /** The accessible name of the list or table of commits. */
  ariaLabel: string;
  className?: string;
}

// The SVG is drawn in px from these, and the CSS reads them from the root.
const ROW_HEIGHT = 36;
const TRACK_WIDTH = 16;
const LANE_MIN_WIDTH = 104;
/** At 640 px and below, so three lanes leave the titles room. */
const LANE_MIN_WIDTH_NARROW = 56;
const DOT_RADIUS = 4;

const NARROW_QUERY = '(max-width: 640px)';

interface Edge {
  /** Rows of the commit and its parent; a missing parent is one row past the end. */
  from: number;
  to: number;
  fromX: number;
  toX: number;
  /** The x of the track the edge runs down. */
  viaX: number;
}

interface Link {
  from: number;
  to: number;
  fromX: number;
  toX: number;
}

interface GraphLayout {
  /** The x of each commit's dot, by row. */
  dotX: number[];
  /** Whether each commit, by row, is drawn as a merge. */
  merge: boolean[];
  /** The label of each commit's lane, by row. */
  laneLabel: Array<string | undefined>;
  edges: Edge[];
  links: Link[];
  /** Each lane's left edge and width. */
  lanes: Array<{ x: number; width: number }>;
  width: number;
}

/**
 * Places each lane's commits on tracks, git-log style: a commit takes the
 * track that expects it, its first parent continues that track, and each
 * further parent takes a free track until the parent's row.
 */
function trackLane(
  laneCommits: Array<{ commit: CommitGraphCommit; row: number }>,
  rowOf: Map<string, number>,
  inLane: (id: string) => boolean,
): {
  trackOf: Map<number, number>;
  edges: Array<{ from: number; to: number; via: number; parent: string }>;
  tracks: number;
} {
  const expected: Array<string | null> = [];
  const trackOf = new Map<number, number>();
  const edges: Array<{
    from: number;
    to: number;
    via: number;
    parent: string;
  }> = [];
  const free = (): number => {
    const index = expected.indexOf(null);
    return index === -1 ? expected.length : index;
  };
  let tracks = 0;
  for (const { commit, row } of laneCommits) {
    const waiting = expected.flatMap((id, index) =>
      id === commit.id ? [index] : [],
    );
    waiting.forEach((index) => {
      expected[index] = null;
    });
    const track = waiting.length > 0 ? waiting[0] : free();
    expected[track] = null;
    trackOf.set(row, track);
    commit.parents
      .filter((parent) => !rowOf.has(parent) || inLane(parent))
      .forEach((parent, index) => {
        const waitingTrack = expected.indexOf(parent);
        const via =
          index === 0 ? track : waitingTrack === -1 ? free() : waitingTrack;
        expected[via] = parent;
        edges.push({ from: row, to: rowOf.get(parent) ?? -1, via, parent });
      });
    tracks = Math.max(tracks, expected.length, track + 1);
  }
  return { trackOf, edges, tracks };
}

function layoutGraph(
  commits: CommitGraphCommit[],
  lanes: CommitGraphLane[] | undefined,
  laneMinWidth: number,
): GraphLayout {
  const rowOf = new Map(commits.map((commit, row) => [commit.id, row]));
  const laneIds = lanes?.map((lane) => lane.id) ?? [undefined];
  const known = new Set(laneIds);
  const laneOf = (commit: CommitGraphCommit): string | undefined =>
    known.has(commit.lane) ? commit.lane : laneIds[0];
  const dotX = commits.map(() => 0);
  const laneLabel = commits.map((): string | undefined => undefined);
  const edges: Edge[] = [];
  const laneBoxes: GraphLayout['lanes'] = [];
  let x = 0;
  for (const [index, laneId] of laneIds.entries()) {
    const laneCommits = commits.flatMap((commit, row) =>
      laneOf(commit) === laneId ? [{ commit, row }] : [],
    );
    laneCommits.forEach(({ row }) => {
      laneLabel[row] = lanes?.[index].label;
    });
    const laneIdsOf = new Set(laneCommits.map(({ commit }) => commit.id));
    const placed = trackLane(laneCommits, rowOf, (id) => laneIdsOf.has(id));
    const tracksWidth = Math.max(placed.tracks, 1) * TRACK_WIDTH;
    const width =
      lanes === undefined ? tracksWidth : Math.max(tracksWidth, laneMinWidth);
    const trackX = (track: number): number =>
      x + (width - tracksWidth) / 2 + (track + 0.5) * TRACK_WIDTH;
    placed.trackOf.forEach((track, row) => {
      dotX[row] = trackX(track);
    });
    placed.edges.forEach((edge) => {
      const to = edge.to === -1 ? commits.length : edge.to;
      edges.push({
        from: edge.from,
        to,
        fromX: dotX[edge.from],
        toX:
          edge.to === -1
            ? trackX(edge.via)
            : trackX(placed.trackOf.get(to) ?? 0),
        viaX: trackX(edge.via),
      });
    });
    laneBoxes.push({ x, width });
    x += width;
  }
  const links = commits.flatMap((commit, row) =>
    (commit.links ?? []).flatMap((target) => {
      const to = rowOf.get(target);
      return to === undefined
        ? []
        : [{ from: row, to, fromX: dotX[row], toX: dotX[to] }];
    }),
  );
  const drawnParents = new Map<number, number>();
  edges.forEach((edge) => {
    drawnParents.set(edge.from, (drawnParents.get(edge.from) ?? 0) + 1);
  });
  const merge = commits.map((_, row) => (drawnParents.get(row) ?? 0) > 1);
  return { dotX, merge, laneLabel, edges, links, lanes: laneBoxes, width: x };
}

const rowY = (row: number): number => (row + 0.5) * ROW_HEIGHT;

/** A curve that leaves and enters vertically. */
function bend(x1: number, y1: number, x2: number, y2: number): string {
  const middle = (y1 + y2) / 2;
  return `C ${String(x1)} ${String(middle)} ${String(x2)} ${String(middle)} ${String(x2)} ${String(y2)}`;
}

/**
 * An edge leaves its commit for its track within one row, runs down the
 * track, and enters its parent within the last row.
 */
function edgePath({ from, to, fromX, toX, viaX }: Edge): string {
  const start = `M ${String(fromX)} ${String(rowY(from))}`;
  if (to - from <= 1) {
    return `${start} ${bend(fromX, rowY(from), toX, rowY(to))}`;
  }
  const out =
    viaX === fromX ? '' : bend(fromX, rowY(from), viaX, rowY(from + 1));
  const down = `L ${String(viaX)} ${String(rowY(to - 1))}`;
  const into =
    viaX === toX
      ? `L ${String(toX)} ${String(rowY(to))}`
      : bend(viaX, rowY(to - 1), toX, rowY(to));
  return [start, out, down, into].filter(Boolean).join(' ');
}

/** Text cut off with an ellipsis, shown whole on hover only when it is cut. */
function CutText({
  id,
  className,
  children,
}: {
  id?: string;
  className: string;
  children: ReactNode;
}): JSX.Element {
  const [cut, setCut] = useState(false);
  return (
    <Tooltip
      placement="topLeft"
      mouseEnterDelay={0.3}
      styles={{ root: { maxWidth: 'var(--tooltip-max-width)' } }}
      title={cut ? children : undefined}
    >
      <span
        id={id}
        className={className}
        onMouseEnter={(event: MouseEvent<HTMLSpanElement>) => {
          setCut(
            event.currentTarget.scrollWidth > event.currentTarget.clientWidth,
          );
        }}
      >
        {children}
      </span>
    </Tooltip>
  );
}

/**
 * What a row's drawing shows and assistive technology does not read: the
 * commit's lane and whether it is a merge. The row names these hidden spans
 * as its description.
 */
function rowDescription(
  idPrefix: string,
  row: number,
  layout: GraphLayout,
  mergeText: string,
): { describedBy: string | undefined; spans: ReactNode } {
  const lane = layout.laneLabel[row];
  const merge = layout.merge[row];
  const laneId = `${idPrefix}-lane-${String(row)}`;
  const mergeId = `${idPrefix}-merge-${String(row)}`;
  const ids = [lane === undefined ? '' : laneId, merge ? mergeId : ''].filter(
    Boolean,
  );
  return {
    describedBy: ids.length === 0 ? undefined : ids.join(' '),
    spans: (
      <>
        {lane !== undefined && (
          <span id={laneId} hidden>
            {lane}
          </span>
        )}
        {merge && (
          <span id={mergeId} hidden>
            {mergeText}
          </span>
        )}
      </>
    ),
  };
}

/** The edges, links and dots, drawn over the rows; assistive technology reads the rows. */
function GraphDrawing({
  commits,
  layout,
  selected,
}: {
  commits: CommitGraphCommit[];
  layout: GraphLayout;
  selected: ReadonlySet<string>;
}): JSX.Element {
  const height = commits.length * ROW_HEIGHT;
  return (
    <svg
      className="aegis-commit-graph__svg"
      width={layout.width}
      height={height}
      viewBox={`0 0 ${String(layout.width)} ${String(height)}`}
      aria-hidden="true"
    >
      {layout.lanes.slice(1).map((lane) => (
        <line
          key={lane.x}
          className="aegis-commit-graph__lane-rule"
          x1={lane.x}
          x2={lane.x}
          y1={0}
          y2={height}
        />
      ))}
      {layout.links.map((link) => (
        <path
          key={`${String(link.from)}-${String(link.to)}`}
          className="aegis-commit-graph__link"
          d={`M ${String(link.fromX)} ${String(rowY(link.from))} ${bend(link.fromX, rowY(link.from), link.toX, rowY(link.to))}`}
        />
      ))}
      {layout.edges.map((edge) => (
        <path
          key={`${String(edge.from)}-${String(edge.to)}-${String(edge.viaX)}`}
          className="aegis-commit-graph__edge"
          d={edgePath(edge)}
        />
      ))}
      {commits.map((commit, row) => (
        <circle
          key={commit.id}
          className={[
            'aegis-commit-graph__dot',
            layout.merge[row] ? 'aegis-commit-graph__dot--merge' : '',
            selected.has(commit.id) ? 'aegis-commit-graph__dot--selected' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          cx={layout.dotX[row]}
          cy={rowY(row)}
          r={DOT_RADIUS}
        />
      ))}
    </svg>
  );
}

function LaneLabels({
  lanes,
  layout,
}: {
  lanes: CommitGraphLane[];
  layout: GraphLayout;
}): JSX.Element {
  return (
    <span className="aegis-commit-graph__lane-labels">
      {lanes.map((lane, index) => (
        <span
          key={lane.id}
          className="aegis-commit-graph__lane-label"
          style={{ width: `${String(layout.lanes[index].width)}px` }}
        >
          {lane.label}
        </span>
      ))}
    </span>
  );
}

/** What the list and the table both draw from. */
interface RowsProps {
  commits: CommitGraphCommit[];
  lanes: CommitGraphLane[] | undefined;
  layout: GraphLayout;
  selected: ReadonlySet<string>;
  /** Set when the rows have checkboxes. */
  toggle: ((id: string, checked: boolean) => void) | undefined;
  ariaLabel: string;
}

function CommitList({
  commits,
  lanes,
  layout,
  selected,
  toggle,
  ariaLabel,
}: RowsProps): JSX.Element {
  const strings = useStrings();
  const idPrefix = useId();
  return (
    <>
      {lanes !== undefined && (
        <div className="aegis-commit-graph__lanes" aria-hidden="true">
          <span className="aegis-commit-graph__lane-spacer" />
          <LaneLabels lanes={lanes} layout={layout} />
        </div>
      )}
      <div className="aegis-commit-graph__body">
        <GraphDrawing commits={commits} layout={layout} selected={selected} />
        <ol className="aegis-commit-graph__rows" aria-label={ariaLabel}>
          {commits.map((commit, row) => {
            const isSelected = selected.has(commit.id);
            const titleId = `${idPrefix}-title-${String(row)}`;
            const description = rowDescription(
              idPrefix,
              row,
              layout,
              strings.mergeCommit,
            );
            return (
              <li
                key={commit.id}
                className={
                  isSelected
                    ? 'aegis-commit-graph__row aegis-commit-graph__row--selected'
                    : 'aegis-commit-graph__row'
                }
                aria-describedby={description.describedBy}
              >
                <span className="aegis-commit-graph__select">
                  {toggle !== undefined && (
                    <Checkbox
                      checked={isSelected}
                      onChange={(checked) => {
                        toggle(commit.id, checked);
                      }}
                      ariaLabelledBy={titleId}
                    />
                  )}
                </span>
                <span className="aegis-commit-graph__text">
                  {description.spans}
                  {commit.refs?.map((ref) => (
                    <Chip key={ref} className="aegis-commit-graph__ref">
                      {ref}
                    </Chip>
                  ))}
                  <CutText id={titleId} className="aegis-commit-graph__title">
                    {commit.title}
                  </CutText>
                </span>
                {commit.meta !== undefined && (
                  <span className="aegis-commit-graph__meta">
                    {commit.meta}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}

function CommitTable({
  commits,
  lanes,
  layout,
  selected,
  toggle,
  ariaLabel,
  columns,
}: RowsProps & { columns: CommitGraphColumn[] }): JSX.Element {
  const strings = useStrings();
  const idPrefix = useId();
  return (
    <div className="aegis-commit-graph__scroll">
      <table className="aegis-commit-graph__table" aria-label={ariaLabel}>
        <thead>
          <tr>
            <th
              scope="col"
              className="aegis-commit-graph__th aegis-commit-graph__th--graph"
              aria-hidden="true"
            >
              {lanes !== undefined && (
                <LaneLabels lanes={lanes} layout={layout} />
              )}
            </th>
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className="aegis-commit-graph__th"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {commits.map((commit, row) => {
            const isSelected = selected.has(commit.id);
            const firstId = `${idPrefix}-first-${String(row)}`;
            const description = rowDescription(
              idPrefix,
              row,
              layout,
              strings.mergeCommit,
            );
            return (
              <tr
                key={commit.id}
                className={
                  isSelected
                    ? 'aegis-commit-graph__tr aegis-commit-graph__tr--selected'
                    : 'aegis-commit-graph__tr'
                }
                aria-selected={toggle === undefined ? undefined : isSelected}
                aria-describedby={description.describedBy}
              >
                <td
                  className={
                    row === 0
                      ? 'aegis-commit-graph__td aegis-commit-graph__td--graph aegis-commit-graph__td--drawing'
                      : 'aegis-commit-graph__td aegis-commit-graph__td--graph'
                  }
                  aria-hidden="true"
                >
                  {description.spans}
                  {row === 0 && (
                    <GraphDrawing
                      commits={commits}
                      layout={layout}
                      selected={selected}
                    />
                  )}
                </td>
                {columns.map((column, index) => {
                  const content =
                    index === 0 ? (
                      <>
                        {toggle !== undefined && (
                          <span className="aegis-commit-graph__cell-select">
                            <Checkbox
                              checked={isSelected}
                              onChange={(checked) => {
                                toggle(commit.id, checked);
                              }}
                              ariaLabelledBy={firstId}
                            />
                          </span>
                        )}
                        <span id={firstId}>{commit.cells?.[column.id]}</span>
                      </>
                    ) : (
                      commit.cells?.[column.id]
                    );
                  return column.grow === true ? (
                    <td
                      key={column.id}
                      className="aegis-commit-graph__td aegis-commit-graph__td--grow"
                    >
                      <CutText className="aegis-commit-graph__cell">
                        {content}
                      </CutText>
                    </td>
                  ) : (
                    <td key={column.id} className="aegis-commit-graph__td">
                      <span className="aegis-commit-graph__cell">
                        {content}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CommitGraph({
  commits,
  lanes,
  columns,
  selectedIds = [],
  onSelectedIdsChange,
  maxSelected,
  ariaLabel,
  className,
}: CommitGraphProps) {
  const narrow = useMediaQuery(NARROW_QUERY);
  const laneMinWidth = narrow ? LANE_MIN_WIDTH_NARROW : LANE_MIN_WIDTH;
  const layout = useMemo(
    () => layoutGraph(commits, lanes, laneMinWidth),
    [commits, lanes, laneMinWidth],
  );
  const toggle =
    onSelectedIdsChange === undefined
      ? undefined
      : (id: string, checked: boolean): void => {
          const next = checked
            ? [...selectedIds.filter((each) => each !== id), id]
            : selectedIds.filter((each) => each !== id);
          onSelectedIdsChange(
            maxSelected === undefined ? next : next.slice(-maxSelected),
          );
        };
  const rows: RowsProps = {
    commits,
    lanes,
    layout,
    selected: new Set(selectedIds),
    toggle,
    ariaLabel,
  };

  const cls = [
    'aegis-commit-graph',
    // The list's checkboxes take a column of their own; the table's sit in its first column.
    toggle !== undefined && columns === undefined
      ? 'aegis-commit-graph--selectable'
      : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const rootStyle = {
    '--aegis-commit-graph-row-h': `${String(ROW_HEIGHT)}px`,
    '--aegis-commit-graph-graph-w': `${String(layout.width)}px`,
  } as CSSProperties;

  return (
    <div className={cls} style={rootStyle}>
      {columns === undefined ? (
        <CommitList {...rows} />
      ) : (
        <CommitTable {...rows} columns={columns} />
      )}
    </div>
  );
}
