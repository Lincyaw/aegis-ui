import type { CSSProperties, ReactElement, ReactNode } from 'react';

import {
  type ChartColor,
  type ChartLineStyle,
  chartColorValue,
  chartLineDash,
} from '../../lib/chart';
import './SeriesLabel.css';
import { DefaultLink, type LinkComponent } from './linkComponent';

export interface SeriesLabelProps {
  /** The series, e.g. a model's name. */
  name: ReactNode;
  /** A muted second part, e.g. the harness it ran with. */
  detail?: ReactNode;
  /** The series' colour, the same as its marks on the page's charts. */
  color: ChartColor;
  lineStyle?: ChartLineStyle;
  /** Makes the name a link. */
  to?: string;
  /** Renders the link. Defaults to an `<a href>`; routed apps pass their Link adapter. */
  linkComponent?: LinkComponent;
  className?: string;
}

/**
 * A series named in its colour, for charts that label their marks directly
 * instead of using a legend, and for the lists and tables around them.
 */
export function SeriesLabel({
  name,
  detail,
  color,
  lineStyle,
  to,
  linkComponent: Link = DefaultLink,
  className,
}: SeriesLabelProps): ReactElement {
  return (
    <span
      className={['aegis-series-label', className ?? '']
        .filter(Boolean)
        .join(' ')}
      style={
        {
          '--aegis-series-label-color': chartColorValue(color),
        } as CSSProperties
      }
    >
      {lineStyle === undefined ? (
        <span className="aegis-series-label__dot" aria-hidden="true" />
      ) : (
        <svg
          className="aegis-series-label__line"
          aria-hidden="true"
          viewBox="0 0 32 10"
        >
          <line
            x1={0}
            x2={32}
            y1={5}
            y2={5}
            style={{ strokeDasharray: chartLineDash(lineStyle) }}
          />
        </svg>
      )}
      {to === undefined ? (
        <span className="aegis-series-label__name">{name}</span>
      ) : (
        <Link
          to={to}
          className="aegis-series-label__name aegis-series-label__name--link"
        >
          {name}
        </Link>
      )}
      {detail !== undefined && (
        <span className="aegis-series-label__detail">{detail}</span>
      )}
    </span>
  );
}
