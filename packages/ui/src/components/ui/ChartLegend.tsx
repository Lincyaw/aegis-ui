import type { CSSProperties, ReactElement, ReactNode } from 'react';

import { type ChartColor, chartColorValue } from '../../lib/chart';
import './ChartLegend.css';

export interface ChartLegendItem {
  key: string;
  label: ReactNode;
  color: ChartColor;
}

export interface ChartLegendProps {
  items: ChartLegendItem[];
  /** `square` for bars and areas, `dot` for points. Defaults to `square`. */
  shape?: 'square' | 'dot';
  className?: string;
}

/** The series of a chart: a swatch in each series' colour and its label. */
export function ChartLegend({
  items,
  shape = 'square',
  className,
}: ChartLegendProps): ReactElement {
  return (
    <ul
      className={['aegis-chart-legend', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      {items.map((item) => (
        <li key={item.key} className="aegis-chart-legend__item">
          <span
            className={[
              'aegis-chart-legend__swatch',
              `aegis-chart-legend__swatch--${shape}`,
              item.color === 'unknown'
                ? 'aegis-chart-legend__swatch--unknown'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={
              {
                '--aegis-chart-legend-color': chartColorValue(item.color),
              } as CSSProperties
            }
            aria-hidden="true"
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
