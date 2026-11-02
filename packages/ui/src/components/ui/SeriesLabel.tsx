import type { CSSProperties, ReactElement, ReactNode } from 'react';

import { type ChartColor, chartColorValue } from '../../lib/chart';
import './SeriesLabel.css';
import { DefaultLink, type LinkComponent } from './linkComponent';

export interface SeriesLabelProps {
  /** The series, e.g. a model's name. */
  name: ReactNode;
  /** A muted second part, e.g. the harness it ran with. */
  detail?: ReactNode;
  /** The series' colour, the same as its marks on the page's charts. */
  color: ChartColor;
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
      <span className="aegis-series-label__dot" aria-hidden="true" />
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
