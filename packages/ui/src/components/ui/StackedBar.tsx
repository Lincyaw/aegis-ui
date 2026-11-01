import { type CSSProperties, type ReactNode } from 'react';

import {
  type ChartColor,
  chartColorValue,
  staggeredProgress,
  zeroAnchoredDomain,
} from '../../lib/chart';
import { ChartLegend } from './ChartLegend';
import { DataTable, type DataTableColumn } from './DataTable';
import './StackedBar.css';

/** One category stacked in every bar, listed in the legend. */
export interface StackedBarSeries<K extends string> {
  key: K;
  /** Legend text; also names the segment in each bar's accessible label. */
  label: string;
  color: ChartColor;
}

export interface StackedBarRow<K extends string> {
  key: string;
  label: ReactNode;
  /** Every series' value in this row, keyed by series key. */
  values: Readonly<Record<K, number>>;
  /** Muted text after the row total, e.g. "已复核 30". */
  note?: ReactNode;
}

export interface StackedBarProps<K extends string> {
  /** Categories, stacked left to right in this order. */
  series: Array<StackedBarSeries<K>>;
  rows: Array<StackedBarRow<K>>;
  /** Upper bound of the scale. Defaults to the largest row total, or 1 when all are 0. */
  max?: number;
  /** Scale hint between the 0 and maximum ticks, e.g. "越低越好". */
  direction?: ReactNode;
  format?: (value: number) => string;
  /**
   * `table` lists the same rows as a data table in place of the bars, for
   * the host's "查看数据表" control.
   */
  view?: 'chart' | 'table';
  /** Table header of the row label column, e.g. "模型". */
  labelHeader: ReactNode;
  /** Table header of the row total column, e.g. "合计". */
  totalHeader: ReactNode;
  /**
   * How far the bars are drawn, 0 to 1, for a chart that draws as its
   * section scrolls in (`useScrollProgress`). Omitted, the bars draw in
   * once when they mount.
   */
  progress?: number;
  className?: string;
}

/**
 * Horizontal stacked bars on one shared scale: a label, the series
 * segments of each row drawn in from the left, and the row total.
 */
export function StackedBar<K extends string>({
  series,
  rows,
  max,
  direction,
  format = String,
  view = 'chart',
  labelHeader,
  totalHeader,
  progress,
  className,
}: StackedBarProps<K>) {
  const rowTotal = (row: StackedBarRow<K>): number =>
    series.reduce((sum, item) => sum + row.values[item.key], 0);
  const noted = rows.some((row) => row.note !== undefined);
  const cls = [
    'aegis-stacked-bar',
    noted ? 'aegis-stacked-bar--noted' : '',
    progress === undefined ? '' : 'aegis-stacked-bar--scroll',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  if (view === 'table') {
    const columns: Array<DataTableColumn<StackedBarRow<K>>> = [
      { key: 'label', header: labelHeader, render: (row) => row.label },
      ...series.map(
        (item): DataTableColumn<StackedBarRow<K>> => ({
          key: `series:${item.key}`,
          header: item.label,
          numeric: true,
          render: (row) => format(row.values[item.key]),
        }),
      ),
      {
        key: 'total',
        header: totalHeader,
        numeric: true,
        render: (row) => format(rowTotal(row)),
      },
    ];
    return (
      <div className={cls}>
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(row) => row.key}
          framed={false}
        />
      </div>
    );
  }

  const totals = rows.map(rowTotal);
  const [, upperBound] = zeroAnchoredDomain(totals, max);
  const scaleWidth = (value: number): string =>
    `${(upperBound > 0 ? Math.min(value / upperBound, 1) * 100 : 0).toString()}%`;
  return (
    <div className={cls}>
      <ChartLegend
        items={series.map((item) => ({
          key: item.key,
          label: item.label,
          color: item.color,
        }))}
      />
      <div className="aegis-stacked-bar__rows">
        {rows.map((row, index) => {
          const total = totals[index];
          return (
            <div className="aegis-stacked-bar__row" key={row.key}>
              <div className="aegis-stacked-bar__label">{row.label}</div>
              <div
                className="aegis-stacked-bar__track"
                role="img"
                aria-label={series
                  .map(
                    (item) => `${item.label} ${format(row.values[item.key])}`,
                  )
                  .join(', ')}
              >
                <div
                  className={
                    total === 0
                      ? 'aegis-stacked-bar__bar aegis-stacked-bar__bar--zero'
                      : 'aegis-stacked-bar__bar'
                  }
                  style={
                    {
                      width: scaleWidth(total),
                      '--aegis-stacked-bar-index': index,
                      ...(progress === undefined
                        ? {}
                        : {
                            '--aegis-stacked-bar-progress': staggeredProgress(
                              progress,
                              index,
                              rows.length,
                            ),
                          }),
                    } as CSSProperties
                  }
                >
                  <div className="aegis-stacked-bar__segments">
                    {series
                      .filter((item) => row.values[item.key] > 0)
                      .map((item) => (
                        <span
                          key={item.key}
                          className={[
                            'aegis-stacked-bar__segment',
                            item.color === 'unknown'
                              ? 'aegis-stacked-bar__segment--unknown'
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          style={{
                            width: `${((row.values[item.key] / total) * 100).toString()}%`,
                            background: chartColorValue(item.color),
                          }}
                        />
                      ))}
                  </div>
                </div>
              </div>
              <span className="aegis-stacked-bar__value">{format(total)}</span>
              {noted && (
                <span className="aegis-stacked-bar__note">{row.note}</span>
              )}
            </div>
          );
        })}
        <div className="aegis-stacked-bar__scale">
          <span>{format(0)}</span>
          {direction !== undefined && (
            <span className="aegis-stacked-bar__direction">{direction}</span>
          )}
          <span>{format(upperBound)}</span>
        </div>
      </div>
    </div>
  );
}
