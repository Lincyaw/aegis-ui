import type { CSSProperties, ReactElement, ReactNode } from 'react';

import {
  type ChartColor,
  chartColorValue,
  staggeredProgress,
} from '../../lib/chart';
import './Heatmap.css';
import { DefaultLink, type LinkComponent } from './linkComponent';

export interface HeatmapColumn {
  key: string;
  label: ReactNode;
  /** A second line, e.g. the metric of the column. */
  detail?: ReactNode;
  /** The column's tint, when it differs from the chart's, e.g. a cost column. */
  color?: ChartColor;
}

export interface HeatmapCell {
  /** The cell's reading, e.g. "97.6%", or why it has none, e.g. "样本不足". */
  text: ReactNode;
  /** How strongly the cell is tinted, 0 to 1; null leaves it unfilled. */
  level: number | null;
  /** The best of its column: its text reads heavier. */
  emphasis?: boolean;
  /** Makes the cell a link. */
  to?: string;
}

export interface HeatmapRow {
  key: string;
  label: ReactNode;
  /** One cell per column, in the columns' order. */
  cells: HeatmapCell[];
}

export interface HeatmapProps {
  columns: HeatmapColumn[];
  rows: HeatmapRow[];
  /** Names the row labels' column, e.g. "模型 × harness". */
  corner?: ReactNode;
  /** The tint of every column without its own. Defaults to `seq`. */
  color?: ChartColor;
  /** Names the table for a screen reader. */
  label: string;
  /**
   * How far the cells are tinted, 0 to 1, column after column, for a table
   * that fills as its section scrolls in (`useScrollProgress`).
   */
  progress?: number;
  /** Renders the cells' links. Defaults to an `<a href>`; routed apps pass their Link adapter. */
  linkComponent?: LinkComponent;
  className?: string;
}

/**
 * A table whose cells are tinted by how strong their reading is. Host code
 * sets each cell's level, usually normalised within its column. On a phone
 * every row folds into its label over a grid of labelled cells, so it is
 * built from ARIA table roles, which keep their meaning through that.
 */
export function Heatmap({
  columns,
  rows,
  corner,
  color = 'seq',
  label,
  progress,
  linkComponent: Link = DefaultLink,
  className,
}: HeatmapProps): ReactElement {
  return (
    <div
      role="table"
      aria-label={label}
      className={['aegis-heatmap', className ?? ''].filter(Boolean).join(' ')}
      style={{ '--aegis-heatmap-columns': columns.length } as CSSProperties}
    >
      <div role="rowgroup" className="aegis-heatmap__head">
        <div role="row" className="aegis-heatmap__row">
          <div role="columnheader" className="aegis-heatmap__corner">
            {corner}
          </div>
          {columns.map((column) => (
            <div
              key={column.key}
              role="columnheader"
              className="aegis-heatmap__column"
            >
              <span className="aegis-heatmap__column-label">
                {column.label}
              </span>
              {column.detail !== undefined && (
                <span className="aegis-heatmap__column-detail">
                  {column.detail}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div role="rowgroup" className="aegis-heatmap__body">
        {rows.map((row) => (
          <div key={row.key} role="row" className="aegis-heatmap__row">
            <div role="rowheader" className="aegis-heatmap__row-label">
              {row.label}
            </div>
            {row.cells.map((cell, index) => {
              const column = columns[index];
              const content = (
                <>
                  <span className="aegis-heatmap__tint" aria-hidden="true" />
                  <span className="aegis-heatmap__cell-label">
                    {column.label}
                  </span>
                  <span className="aegis-heatmap__text">{cell.text}</span>
                </>
              );
              const cellClass = [
                'aegis-heatmap__cell',
                cell.level === null ? 'aegis-heatmap__cell--empty' : '',
                cell.emphasis ? 'aegis-heatmap__cell--emphasis' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <div
                  key={column.key}
                  role="cell"
                  className="aegis-heatmap__slot"
                  style={
                    {
                      '--aegis-heatmap-color': chartColorValue(
                        column.color ?? color,
                      ),
                      '--aegis-heatmap-level': cell.level ?? 0,
                      '--aegis-heatmap-progress':
                        progress === undefined
                          ? 1
                          : staggeredProgress(progress, index, columns.length),
                    } as CSSProperties
                  }
                >
                  {cell.to === undefined ? (
                    <span className={cellClass}>{content}</span>
                  ) : (
                    <Link
                      to={cell.to}
                      className={`${cellClass} aegis-heatmap__cell--link`}
                    >
                      {content}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
