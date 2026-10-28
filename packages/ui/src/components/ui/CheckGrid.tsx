import { type ReactNode } from 'react';

import './CheckGrid.css';

/**
 * One check in one run. `missed` carries how far the run fell short, e.g.
 * "−0.80" or "replica"; `unchecked` (the check never ran, e.g. after a
 * failed gate) shows an em dash.
 */
export type CheckGridCell =
  | { state: 'passed' }
  | { state: 'missed'; value: string }
  | { state: 'unchecked' };

export interface CheckGridColumn<C extends string> {
  key: C;
  /** Column header, e.g. "运行 1". */
  label: ReactNode;
}

export interface CheckGridRow<C extends string> {
  key: string;
  /** Row header, e.g. the check's id. */
  label: ReactNode;
  /** The check's outcome in every column, keyed by column key. */
  cells: Readonly<Record<C, CheckGridCell>>;
}

interface CheckGridProps<C extends string> {
  /** Runs, left to right. */
  columns: Array<CheckGridColumn<C>>;
  /** Checks, top to bottom. */
  rows: Array<CheckGridRow<C>>;
  /** Header over the row labels, e.g. "检查". */
  rowHeader: ReactNode;
  /** Text of every passed cell, e.g. "通过". */
  passedLabel: string;
  /** Read out in place of an unchecked cell's em dash, e.g. "未检查". */
  uncheckedLabel: string;
  /** Note under the grid, e.g. "图 1 · …". */
  caption?: ReactNode;
  className?: string;
}

/**
 * Checks against runs: one row per check, one column per run. Every cell
 * writes its outcome — the passed label, the miss, or an em dash — so the
 * colour is never the only signal.
 */
export function CheckGrid<C extends string>({
  columns,
  rows,
  rowHeader,
  passedLabel,
  uncheckedLabel,
  caption,
  className,
}: CheckGridProps<C>) {
  const cls = ['aegis-check-grid', className ?? ''].filter(Boolean).join(' ');
  return (
    <figure className={cls}>
      <div className="aegis-check-grid__scroll">
        <table className="aegis-check-grid__table">
          <thead>
            <tr>
              <th scope="col" className="aegis-check-grid__corner">
                {rowHeader}
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="aegis-check-grid__run"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row" className="aegis-check-grid__check">
                  {row.label}
                </th>
                {columns.map((column) => (
                  <td key={column.key} className="aegis-check-grid__slot">
                    <CheckGridMark
                      cell={row.cells[column.key]}
                      passedLabel={passedLabel}
                      uncheckedLabel={uncheckedLabel}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption !== undefined && (
        <figcaption className="aegis-check-grid__caption">{caption}</figcaption>
      )}
    </figure>
  );
}

interface CheckGridMarkProps {
  cell: CheckGridCell;
  passedLabel: string;
  uncheckedLabel: string;
}

function CheckGridMark({
  cell,
  passedLabel,
  uncheckedLabel,
}: CheckGridMarkProps) {
  switch (cell.state) {
    case 'passed':
      return (
        <span className="aegis-check-grid__cell aegis-check-grid__cell--passed">
          <span className="aegis-check-grid__value">{passedLabel}</span>
        </span>
      );
    case 'missed':
      return (
        <span
          className="aegis-check-grid__cell aegis-check-grid__cell--missed"
          title={cell.value}
        >
          <span className="aegis-check-grid__value">{cell.value}</span>
        </span>
      );
    case 'unchecked':
      return (
        <span className="aegis-check-grid__cell aegis-check-grid__cell--unchecked">
          <span className="aegis-check-grid__value" aria-hidden="true">
            —
          </span>
          <span className="aegis-check-grid__spoken">{uncheckedLabel}</span>
        </span>
      );
  }
}
