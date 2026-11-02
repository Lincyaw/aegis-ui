import type { CSSProperties, ReactElement } from 'react';

import {
  type ChartColor,
  chartColorValue,
  staggeredProgress,
} from '../../lib/chart';
import './ResultMatrix.css';

export interface ResultMatrixProps {
  /**
   * The rows of cells, e.g. one row per task and one cell per run. A cell
   * is its strength from 0 to 1; 0 and null are an empty cell.
   */
  rows: Array<Array<number | null>>;
  /** The filled cells' colour. */
  color: ChartColor;
  /** `square` cells for a pattern, thin `bar` cells for many rows. Defaults to `square`. */
  shape?: 'square' | 'bar';
  /** Reads the matrix to a screen reader, e.g. "46 of 55 runs passed". */
  label: string;
  /**
   * How far the matrix is filled, 0 to 1, row after row, for one that
   * fills as its section scrolls in (`useScrollProgress`).
   */
  progress?: number;
  className?: string;
}

/** A small matrix of results in which the pattern itself shows how they fall. */
export function ResultMatrix({
  rows,
  color,
  shape = 'square',
  label,
  progress,
  className,
}: ResultMatrixProps): ReactElement {
  const columns = Math.max(0, ...rows.map((row) => row.length));
  return (
    <div
      role="img"
      aria-label={label}
      className={[
        'aegis-result-matrix',
        `aegis-result-matrix--${shape}`,
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        {
          '--aegis-result-matrix-color': chartColorValue(color),
          '--aegis-result-matrix-columns': Math.max(columns, 1),
        } as CSSProperties
      }
    >
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="aegis-result-matrix__row"
          style={
            {
              '--aegis-result-matrix-progress':
                progress === undefined
                  ? 1
                  : staggeredProgress(progress, rowIndex, rows.length),
            } as CSSProperties
          }
        >
          {row.map((cell, cellIndex) => (
            <span
              key={cellIndex}
              className={
                cell === null || cell === 0
                  ? 'aegis-result-matrix__cell aegis-result-matrix__cell--empty'
                  : 'aegis-result-matrix__cell'
              }
              style={
                {
                  '--aegis-result-matrix-level': cell ?? 0,
                } as CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}
